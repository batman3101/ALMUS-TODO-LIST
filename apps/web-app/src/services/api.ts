import { supabase } from '@/lib/supabase-client.ts';
import type {
  Task,
  Team,
  TeamMember,
  Project,
  Comment,
  User,
} from '@almus/shared-types';
import {
  TaskStatus,
  TaskPriority,
  TeamRole,
  MemberStatus,
} from '@almus/shared-types';

// API 응답 타입
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

// 필터 타입
export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  project_id?: string;
  team_id?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface TeamMemberFilters {
  role?: TeamRole;
  status?: MemberStatus;
  search?: string;
}

// 생성/업데이트 타입
export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  team_id: string;
  project_id?: string;
  assignee_id?: string;
  created_by: string;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  project_id?: string;
  start_date?: string;
  due_date?: string;
  end_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress?: number;
  tags?: string[];
}

export interface CreateTeamData {
  name: string;
  description?: string;
  owner_id: string;
  settings?: Record<string, unknown>;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  team_id: string;
  owner_id: string;
  start_date?: string;
  end_date?: string;
  settings?: Record<string, unknown>;
}

// API 에러 클래스
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API 서비스 클래스
class ApiService {
  // 통용 헬퍼 메서드
  private handleResponse<T>(response: any): ApiResponse<T> {
    if (response.error) {
      return {
        data: null,
        error: new ApiError(response.error.message, response.error.code),
        success: false,
      };
    }

    return {
      data: response.data,
      error: null,
      success: true,
    };
  }

  private async executeQuery<T>(
    queryFn: () => Promise<any>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await queryFn();
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new ApiError('Unknown error occurred'),
        success: false,
      };
    }
  }

  // =================== Task API ===================
  async getTasks(filters: TaskFilters = {}): Promise<ApiResponse<Task[]>> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('tasks')
        .select(
          `
          *,
          assignee:users!tasks_assignee_id_fkey(id, name, email),
          project:projects(id, name),
          team:teams!tasks_team_id_fkey(id, name)
        `
        )
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filters.team_id) {
        query = query.eq('team_id', filters.team_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }
      if (filters.start_date) {
        query = query.gte('due_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('due_date', filters.end_date);
      }

      return query;
    });
  }

  async getTask(id: string): Promise<ApiResponse<Task>> {
    return this.executeQuery(async () => {
      return supabase
        .from('tasks')
        .select(
          `
          *,
          assignee:users!tasks_assignee_id_fkey(id, name, email),
          created_by_user:users!tasks_created_by_fkey(id, name, email),
          project:projects(id, name),
          team:teams!tasks_team_id_fkey(id, name),
          comments(
            id,
            content,
            created_at,
            author:users!comments_author_id_fkey(id, name, email)
          )
        `
        )
        .eq('id', id)
        .single();
    });
  }

  async createTask(data: CreateTaskData): Promise<ApiResponse<Task>> {
    return this.executeQuery(async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Creating task with data:', data);
      }

      // 데이터 정리 - undefined나 null 값 제거
      const cleanData = Object.fromEntries(
        Object.entries({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).filter(
          ([, value]) => value !== undefined && value !== null && value !== ''
        )
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('Cleaned task data:', cleanData);
      }

      const result = await supabase
        .from('tasks')
        .insert(cleanData)
        .select(
          `
          *,
          assignee:users!tasks_assignee_id_fkey(id, name, email),
          project:projects(id, name),
          team:teams!tasks_team_id_fkey(id, name)
        `
        )
        .single();

      if (process.env.NODE_ENV === 'development') {
        console.log('Task creation result:', result);
      }

      if (result.error) {
        console.error('Task creation error details:', result.error);
      }

      return result;
    });
  }

  async updateTask(
    id: string,
    data: UpdateTaskData
  ): Promise<ApiResponse<Task>> {
    return this.executeQuery(async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Updating task with data:', { id, data });
      }

      // undefined 값 제거
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
      );

      const payload = {
        ...cleanData,
        updated_at: new Date().toISOString(),
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('Final update payload:', payload);
      }

      const result = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select(
          `
          *,
          assignee:users!tasks_assignee_id_fkey(id, name, email),
          project:projects(id, name),
          team:teams!tasks_team_id_fkey(id, name)
        `
        )
        .single();

      if (process.env.NODE_ENV === 'development') {
        console.log('Task update result:', result);
      }
      return result;
    });
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return this.executeQuery(async () => {
      return supabase.from('tasks').delete().eq('id', id);
    });
  }

  // =================== Team API ===================
  async getTeams(userId: string): Promise<ApiResponse<Team[]>> {
    return this.executeQuery(async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Getting teams for user:', userId);
      }

      // 먼저 사용자가 멤버인 팀 ID들을 가져옴
      const teamIds = await this.getUserTeamIds(userId);
      if (process.env.NODE_ENV === 'development') {
        console.log('User team IDs:', teamIds);
      }

      // 쿼리 빌드
      let query = supabase
        .from('teams')
        .select(
          `
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          members:team_members(
            id,
            role,
            joined_at,
            user:users!team_members_user_id_fkey(id, name, email)
          )
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // owner이거나 member인 팀만 필터링
      if (teamIds) {
        query = query.or(`owner_id.eq.${userId},id.in.(${teamIds})`);
      } else {
        // 팀 ID가 없으면 owner인 팀만 조회
        query = query.eq('owner_id', userId);
      }

      return query;
    });
  }

  private async getUserTeamIds(userId: string): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
      console.log('Getting team IDs for user:', userId);
    }

    const { data, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (process.env.NODE_ENV === 'development') {
      console.log('Team members query result:', { data, error, userId });
    }

    if (error) {
      console.error('Error fetching team members:', error);
      return '';
    }

    const teamIds = data?.map(tm => tm.team_id).join(',') || '';
    if (process.env.NODE_ENV === 'development') {
      console.log('Extracted team IDs:', teamIds);
    }

    return teamIds;
  }

  async getTeam(id: string): Promise<ApiResponse<Team>> {
    return this.executeQuery(async () => {
      return supabase
        .from('teams')
        .select(
          `
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          members:team_members(
            id,
            role,
            joined_at,
            user:users!team_members_user_id_fkey(id, name, email)
          ),
          projects(id, name, status, created_at)
        `
        )
        .eq('id', id)
        .single();
    });
  }

  async createTeam(data: CreateTeamData): Promise<ApiResponse<Team>> {
    return this.executeQuery(async () => {
      // 팀 생성과 소유자를 관리자로 추가하는 트랜잭션
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // 소유자를 관리자로 추가
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: data.owner_id,
          role: 'OWNER',
          status: 'ACTIVE',
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        // 팀 생성을 롤백 (실제로는 RPC 함수를 사용해야 함)
        await supabase.from('teams').delete().eq('id', team.id);
        throw memberError;
      }

      return { data: team, error: null };
    });
  }

  async updateTeam(
    id: string,
    updates: {
      name?: string;
      description?: string | null;
      settings?: Record<string, unknown> | null;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<Team>> {
    return this.executeQuery(async () => {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (typeof updates.name !== 'undefined') payload.name = updates.name;
      if (typeof updates.description !== 'undefined')
        payload.description = updates.description;
      if (typeof updates.settings !== 'undefined')
        payload.settings = updates.settings;
      if (typeof updates.isActive !== 'undefined')
        payload.is_active = updates.isActive;

      return supabase
        .from('teams')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
    });
  }

  async deleteTeam(id: string): Promise<ApiResponse<void>> {
    return this.executeQuery(async () => {
      return supabase.from('teams').delete().eq('id', id);
    });
  }

  // =================== Team Members API ===================
  async getTeamMembers(
    teamId: string,
    filters: TeamMemberFilters = {}
  ): Promise<ApiResponse<TeamMember[]>> {
    return this.executeQuery(async () => {
      // 먼저 팀 정보를 가져와서 오너 ID 확인
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, owner_id')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // 팀 멤버 가져오기
      let query = supabase
        .from('team_members')
        .select(
          `
          *,
          user:users!team_members_user_id_fkey(id, name, email),
          team:teams(id, name)
        `
        )
        .eq('team_id', teamId)
        .order('joined_at', { ascending: false });

      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        // 사용자 이름이나 이메일로 검색 (실제로는 함수를 사용해야 함)
        query = query.or(
          `user.name.ilike.%${filters.search}%,user.email.ilike.%${filters.search}%`
        );
      }

      const { data: members, error: membersError } = await query;
      if (membersError) throw membersError;

      // 오너 정보 가져오기
      const { data: owner, error: ownerError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', team.owner_id)
        .single();

      if (!ownerError && owner) {
        // 오너가 멤버 목록에 없으면 추가
        const ownerInMembers = members?.some(m => m.user_id === owner.id);
        if (!ownerInMembers) {
          const ownerMember: any = {
            id: `owner-${owner.id}`,
            team_id: teamId,
            user_id: owner.id,
            role: 'OWNER',
            status: 'ACTIVE',
            joined_at: new Date().toISOString(),
            user: owner,
            team: { id: team.id, name: team.name },
          };
          return { data: [ownerMember, ...(members || [])], error: null };
        }
      }

      return { data: members, error: null };
    });
  }

  async inviteTeamMember(
    teamId: string,
    email: string,
    role: TeamRole
  ): Promise<ApiResponse<any>> {
    return this.executeQuery(async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Inviting member:', { teamId, email, role });
      }

      // 현재 사용자 ID 가져오기 (초대한 사람)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new ApiError('인증되지 않은 사용자입니다.', 'UNAUTHORIZED');
      }

      // 새로운 RPC 함수 호출
      const { data, error } = await supabase.rpc('invite_team_member', {
        p_team_id: teamId,
        p_email: email,
        p_role: role,
        p_invited_by: user.id,
      });

      if (error) {
        console.error('Error inviting team member:', error);
        throw new ApiError(
          error.message || '팀 멤버 초대에 실패했습니다.',
          'INVITE_FAILED'
        );
      }

      if (!data.success) {
        throw new ApiError(data.message, 'INVITE_FAILED');
      }

      return { data: data, error: null };
    });
  }

  async updateMemberRole(
    memberId: string,
    role: TeamRole
  ): Promise<ApiResponse<TeamMember>> {
    return this.executeQuery(async () => {
      return supabase
        .from('team_members')
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .select(
          `
          *,
          user:users!team_members_user_id_fkey(id, name, email)
        `
        )
        .single();
    });
  }

  async removeMember(memberId: string): Promise<ApiResponse<void>> {
    return this.executeQuery(async () => {
      return supabase.from('team_members').delete().eq('id', memberId);
    });
  }

  // =================== Projects API ===================
  async getProjects(teamId: string): Promise<ApiResponse<Project[]>> {
    return this.executeQuery(async () => {
      return supabase
        .from('projects')
        .select(
          `
          *,
          owner:users!projects_owner_id_fkey(id, name, email),
          team:teams(id, name),
          tasks_count:tasks(count)
        `
        )
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
    });
  }

  async createProject(data: CreateProjectData): Promise<ApiResponse<Project>> {
    return this.executeQuery(async () => {
      return supabase
        .from('projects')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          owner:users!projects_owner_id_fkey(id, name, email),
          team:teams(id, name)
        `
        )
        .single();
    });
  }

  // =================== Comments API ===================
  async getComments(
    resourceType: string,
    resourceId: string
  ): Promise<ApiResponse<Comment[]>> {
    return this.executeQuery(async () => {
      return supabase
        .from('comments')
        .select(
          `
          *,
          author:users!comments_author_id_fkey(id, name, email, avatar_url),
          replies:comments!parent_comment_id(
            *,
            author:users!comments_author_id_fkey(id, name, email)
          )
        `
        )
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });
    });
  }

  async createComment(data: {
    content: string;
    resource_type: string;
    resource_id: string;
    author_id: string;
    parent_comment_id?: string;
  }): Promise<ApiResponse<Comment>> {
    return this.executeQuery(async () => {
      return supabase
        .from('comments')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          author:users!comments_author_id_fkey(id, name, email, avatar_url)
        `
        )
        .single();
    });
  }

  // =================== Users API ===================
  async getUsers(search?: string): Promise<ApiResponse<User[]>> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('users')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      return query;
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.executeQuery(async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        throw new ApiError('사용자를 찾을 수 없습니다', 'USER_NOT_FOUND');
      }

      // users 테이블에서 사용자 정보 가져오기
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // 사용자가 없으면 생성
      if (dbError && dbError.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name:
              user.user_metadata?.full_name ||
              user.email?.split('@')[0] ||
              'User',
            avatar: user.user_metadata?.avatar_url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        return { data: newUser, error: null };
      }

      if (dbError) throw dbError;
      return { data: dbUser, error: null };
    });
  }

  // =================== Analytics API ===================
  async getTeamAnalytics(
    teamId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<any>> {
    return this.executeQuery(async () => {
      return supabase.rpc('get_team_analytics', {
        team_id: teamId,
        start_date: startDate,
        end_date: endDate,
      });
    });
  }

  async getUserTaskStats(userId: string): Promise<ApiResponse<any>> {
    return this.executeQuery(async () => {
      return supabase.rpc('get_user_task_stats', {
        user_id: userId,
      });
    });
  }

  // =================== File Management API ===================
  async updateFileMetadata(
    fileId: string,
    updates: {
      task_id?: string;
      project_id?: string;
      team_id?: string;
      name?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.executeQuery(async () => {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      return supabase
        .from('file_metadata')
        .update(payload)
        .eq('id', fileId)
        .select()
        .single();
    });
  }

  async getTaskFiles(taskId: string): Promise<ApiResponse<any[]>> {
    return this.executeQuery(async () => {
      return supabase
        .from('file_metadata')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
    });
  }

  async deleteFileMetadata(fileId: string): Promise<ApiResponse<void>> {
    return this.executeQuery(async () => {
      return supabase.from('file_metadata').delete().eq('id', fileId);
    });
  }
}

// 싱글톤 인스턴스
export const apiService = new ApiService();
export default apiService;
