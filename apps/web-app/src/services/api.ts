import { supabase } from '../../../../lib/supabase/client';
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
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
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
          assignee:users(id, name, email),
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
          assignee:users(id, name, email),
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
      return supabase
        .from('tasks')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          assignee:users(id, name, email),
          project:projects(id, name),
          team:teams!tasks_team_id_fkey(id, name)
        `
        )
        .single();
    });
  }

  async updateTask(
    id: string,
    data: UpdateTaskData
  ): Promise<ApiResponse<Task>> {
    return this.executeQuery(async () => {
      return supabase
        .from('tasks')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(
          `
          *,
          assignee:users(id, name, email),
          project:projects(id, name),
          team:teams!tasks_team_id_fkey(id, name)
        `
        )
        .single();
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
      console.log('Getting teams for user:', userId);

      // 먼저 사용자가 멤버인 팀 ID들을 가져옴
      const teamIds = await this.getUserTeamIds(userId);
      console.log('User team IDs:', teamIds);

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
    const { data } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    return data?.map(tm => tm.team_id).join(',') || '';
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

      return query;
    });
  }

  async inviteTeamMember(
    teamId: string,
    email: string,
    role: TeamRole
  ): Promise<ApiResponse<any>> {
    return this.executeQuery(async () => {
      return supabase.rpc('invite_team_member', {
        team_id: teamId,
        email,
        role,
      });
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

      return supabase.from('users').select('*').eq('id', user.id).single();
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
}

// 싱글톤 인스턴스
export const apiService = new ApiService();
export default apiService;
