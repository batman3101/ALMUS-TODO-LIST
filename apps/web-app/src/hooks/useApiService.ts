import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiError } from '../services/api';
import type {
  Task,
  Team,
  TeamMember,
  Project,
  Comment,
  User,
  TaskFilters,
  TeamMemberFilters,
  CreateTaskData,
  UpdateTaskData,
  CreateTeamData,
  CreateProjectData,
} from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from './useAuth';

// Query Keys
export const QUERY_KEYS = {
  tasks: (filters?: TaskFilters) => ['tasks', filters],
  task: (id: string) => ['task', id],
  teams: (userId: string) => ['teams', userId],
  team: (id: string) => ['team', id],
  teamMembers: (teamId: string, filters?: TeamMemberFilters) => [
    'team-members',
    teamId,
    filters,
  ],
  projects: (teamId: string) => ['projects', teamId],
  comments: (resourceType: string, resourceId: string) => [
    'comments',
    resourceType,
    resourceId,
  ],
  users: (search?: string) => ['users', search],
  currentUser: () => ['current-user'],
  teamAnalytics: (teamId: string, startDate?: string, endDate?: string) => [
    'team-analytics',
    teamId,
    startDate,
    endDate,
  ],
  userStats: (userId: string) => ['user-stats', userId],
} as const;

// =================== Tasks Hooks ===================
export const useTasks = (filters?: TaskFilters) => {
  return useQuery({
    queryKey: QUERY_KEYS.tasks(filters),
    queryFn: () => apiService.getTasks(filters),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    staleTime: 30 * 1000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
  });
};

export const useTask = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.task(id),
    queryFn: () => apiService.getTask(id),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: CreateTaskData) => apiService.createTask(data),
    onSuccess: (response, variables) => {
      if (!response.success) {
        throw response.error;
      }

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.projects(variables.team_id),
      });

      showSuccess('태스크가 성공적으로 생성되었습니다.');
      return response.data;
    },
    onError: (error: ApiError) => {
      showError(`태스크 생성 실패: ${error.message}`);
      throw error;
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskData }) =>
      apiService.updateTask(id, updates),
    onSuccess: (response, { id }) => {
      if (!response.success) {
        throw response.error;
      }

      // 특정 태스크 캐시 업데이트
      queryClient.setQueryData(QUERY_KEYS.task(id), response);

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      showSuccess('태스크가 성공적으로 업데이트되었습니다.');
      return response.data;
    },
    onError: (error: ApiError) => {
      showError(`태스크 업데이트 실패: ${error.message}`);
      throw error;
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteTask(id),
    onSuccess: (response, id) => {
      if (!response.success) {
        throw response.error;
      }

      // 캐시에서 제거
      queryClient.removeQueries({ queryKey: QUERY_KEYS.task(id) });

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      showSuccess('태스크가 성공적으로 삭제되었습니다.');
    },
    onError: (error: ApiError) => {
      showError(`태스크 삭제 실패: ${error.message}`);
      throw error;
    },
  });
};

// =================== Teams Hooks ===================
export const useTeams = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.teams(user?.id || ''),
    queryFn: () => apiService.getTeams(user?.id || ''),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1분
  });
};

export const useTeam = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.team(id),
    queryFn: () => apiService.getTeam(id),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateTeamData) => apiService.createTeam(data),
    onSuccess: response => {
      if (!response.success) {
        throw response.error;
      }

      // 팀 목록 무효화
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.teams(user?.id || ''),
      });

      showSuccess('팀이 성공적으로 생성되었습니다.');
      return response.data;
    },
    onError: (error: ApiError) => {
      showError(`팀 생성 실패: ${error.message}`);
      throw error;
    },
  });
};

// =================== Team Members Hooks ===================
export const useTeamMembers = (teamId: string, filters?: TeamMemberFilters) => {
  return useQuery({
    queryKey: QUERY_KEYS.teamMembers(teamId, filters),
    queryFn: () => apiService.getTeamMembers(teamId, filters),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 60 * 1000,
  });
};

export const useInviteTeamMember = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({
      teamId,
      email,
      role,
    }: {
      teamId: string;
      email: string;
      role: any;
    }) => apiService.inviteTeamMember(teamId, email, role),
    onSuccess: (response, { teamId }) => {
      if (!response.success) {
        throw response.error;
      }

      // 팀 멤버 목록 무효화
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });

      showSuccess('팀 멤버 초대가 전송되었습니다.');
      return response.data;
    },
    onError: (error: ApiError) => {
      showError(`멤버 초대 실패: ${error.message}`);
      throw error;
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: any }) =>
      apiService.updateMemberRole(memberId, role),
    onSuccess: response => {
      if (!response.success) {
        throw response.error;
      }

      // 팀 멤버 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['team-members'] });

      showSuccess('멤버 역할이 업데이트되었습니다.');
      return response.data;
    },
    onError: (error: ApiError) => {
      showError(`역할 업데이트 실패: ${error.message}`);
      throw error;
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (memberId: string) => apiService.removeMember(memberId),
    onSuccess: response => {
      if (!response.success) {
        throw response.error;
      }

      // 팀 멤버 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['team-members'] });

      showSuccess('멤버가 팀에서 제거되었습니다.');
    },
    onError: (error: ApiError) => {
      showError(`멤버 제거 실패: ${error.message}`);
      throw error;
    },
  });
};

// =================== Projects Hooks ===================
export const useProjects = (teamId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.projects(teamId),
    queryFn: () => apiService.getProjects(teamId),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 60 * 1000,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: CreateProjectData) => apiService.createProject(data),
    onSuccess: (response, variables) => {
      if (!response.success) {
        throw response.error;
      }

      // 프로젝트 목록 무효화
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.projects(variables.team_id),
      });

      showSuccess('프로젝트가 성공적으로 생성되었습니다.');
      return response.data;
    },
    onError: (error: ApiError) => {
      showError(`프로젝트 생성 실패: ${error.message}`);
      throw error;
    },
  });
};

// =================== Comments Hooks ===================
export const useComments = (resourceType: string, resourceId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.comments(resourceType, resourceId),
    queryFn: () => apiService.getComments(resourceType, resourceId),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!resourceType && !!resourceId,
    staleTime: 30 * 1000,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: {
      content: string;
      resource_type: string;
      resource_id: string;
      author_id: string;
      parent_comment_id?: string;
    }) => apiService.createComment(data),
    onSuccess: (response, { resource_type, resource_id }) => {
      if (!response.success) {
        throw response.error;
      }

      // 댓글 목록 무효화
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.comments(resource_type, resource_id),
      });

      showSuccess('댓글이 추가되었습니다.');
      return response.data;
    },
    onError: (error: ApiError) => {
      showError(`댓글 추가 실패: ${error.message}`);
      throw error;
    },
  });
};

// =================== Users Hooks ===================
export const useUsers = (search?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.users(search),
    queryFn: () => apiService.getUsers(search),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2분
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: QUERY_KEYS.currentUser(),
    queryFn: () => apiService.getCurrentUser(),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    retry: false, // 인증 실패 시 재시도하지 않음
  });
};

// =================== Analytics Hooks ===================
export const useTeamAnalytics = (
  teamId: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: QUERY_KEYS.teamAnalytics(teamId, startDate, endDate),
    queryFn: () => apiService.getTeamAnalytics(teamId, startDate, endDate),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

export const useUserTaskStats = (userId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.userStats(userId),
    queryFn: () => apiService.getUserTaskStats(userId),
    select: response => {
      if (!response.success) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

// =================== Utility Hooks ===================
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateTasks: (filters?: TaskFilters) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(filters) });
    },
    invalidateTeams: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams(userId) });
    },
    invalidateTeamMembers: (teamId: string) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
    invalidateProjects: (teamId: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects(teamId) });
    },
    invalidateComments: (resourceType: string, resourceId: string) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.comments(resourceType, resourceId),
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
};
