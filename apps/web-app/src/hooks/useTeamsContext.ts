import { useState, useEffect, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  useTeams as useTeamsQuery,
  useTeamMembers,
  useCreateTeam as useCreateTeamMutation,
  useUpdateTeam as useUpdateTeamMutation,
  useDeleteTeam as useDeleteTeamMutation,
  useUpdateMemberRole,
  useRemoveMember,
} from './useApiService';
import type { Team, TeamMember } from '@almus/shared-types';
import { TeamRole } from '@almus/shared-types';

interface TeamsContextValue {
  teams: Team[];
  userTeams: Team[];
  currentTeam: Team | null;
  currentTeamMembers: TeamMember[];
  isLoading: boolean;
  error: Error | null;
  switchTeam: (team: Team) => void;
  createTeam: (data: any) => Promise<void>;
  updateTeam: (data: { id: string; name?: string; description?: string | null; settings?: any; isActive?: boolean }) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  getUserRole: (teamId: string) => TeamRole | null;
  canManageTeam: (teamId: string) => boolean;
  updateMemberRole: (memberId: string, role: TeamRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
}

export const useTeams = (): TeamsContextValue => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  
  // 사용자가 로딩된 후 localStorage에서 저장된 팀 ID 복원 (새로고침 시 깜빡임 방지)
  useEffect(() => {
    if (user && !currentTeamId) {
      const savedTeamId = localStorage.getItem(`currentTeam-${user.id}`);
      if (savedTeamId) {
        setCurrentTeamId(savedTeamId);
      }
    }
  }, [user, currentTeamId]);

  // API 쿼리
  const {
    data: teams = [],
    isLoading: isLoadingTeams,
    error: teamsError,
  } = useTeamsQuery();
  const { data: teamMembers = [], isLoading: isLoadingMembers } =
    useTeamMembers(currentTeamId || '');

  // Mutations
  const createTeamMutation = useCreateTeamMutation();
  const updateTeamMutation = useUpdateTeamMutation();
  const deleteTeamMutation = useDeleteTeamMutation();
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMember();

  // 최적화된 초기 팀 설정 - 즉시 실행
  useEffect(() => {
    if (!user || teams.length === 0) return;

    // 이미 팀이 선택되어 있고 해당 팀이 여전히 존재하는 경우는 건드리지 않음
    if (currentTeamId && teams.find(t => t.id === currentTeamId)) return;

    // 즉시 실행 (micro-task 제거)
    const savedTeamId = localStorage.getItem(`currentTeam-${user.id}`);
    const teamToSelect = teams.find(t => t.id === savedTeamId) || teams[0];

    if (teamToSelect) {
      setCurrentTeamId(teamToSelect.id);
      localStorage.setItem(`currentTeam-${user.id}`, teamToSelect.id);
    }
  }, [user, teams, currentTeamId]);

  // 현재 팀 객체 (memberCount 포함)
  const currentTeam = useMemo(() => {
    const team = teams.find(t => t.id === currentTeamId);
    if (!team) return null;
    
    // memberCount 추가 (team.members가 있으면 그 길이, 없으면 0)
    return {
      ...team,
      memberCount: team.members?.length || 0
    };
  }, [teams, currentTeamId]);

  // 현재 팀의 멤버들
  const currentTeamMembers = useMemo(() => {
    return teamMembers || [];
  }, [teamMembers]);

  // 사용자가 속한 팀들만 필터링 (memberCount 포함)
  const userTeams = useMemo(() => {
    return teams.map(team => ({
      ...team,
      memberCount: team.members?.length || 0
    }));
  }, [teams]);

  // 팀 전환
  const switchTeam = useCallback(
    (team: Team) => {
      console.log('Switching team to:', team.name, team.id);
      console.log('Current team before switch:', currentTeamId);
      
      // flushSync를 사용해 즉시 상태 업데이트
      flushSync(() => {
        setCurrentTeamId(team.id);
      });
      
      // localStorage 업데이트
      if (user) {
        localStorage.setItem(`currentTeam-${user.id}`, team.id);
      }
      
      // React Query 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      console.log('Team switched to:', team.id);
      console.log('Current team after switch:', team.id);
    },
    [user, queryClient, currentTeamId]
  );

  // 팀 생성
  const createTeam = useCallback(
    async (data: any) => {
      console.log('createTeam called with user:', user);
      if (!user?.id) {
        console.error('User not authenticated:', user);
        throw new Error('사용자 인증이 필요합니다.');
      }

      // CreateTeamInput을 CreateTeamData로 변환
      const teamData = {
        name: data.name,
        description: data.description || null,
        owner_id: user.id,
        settings: data.settings || {}, // JSONB 타입이므로 객체 그대로 전달
      };

      return await createTeamMutation.mutateAsync(teamData);
    },
    [createTeamMutation, user]
  );

  const updateTeam = useCallback(
    async (data: { id: string; name?: string; description?: string | null; settings?: any; isActive?: boolean }) => {
      await updateTeamMutation.mutateAsync({
        id: data.id,
        updates: {
          name: data.name,
          description: data.description,
          settings: data.settings,
          isActive: data.isActive,
        },
      });
    },
    [updateTeamMutation]
  );

  const deleteTeam = useCallback(
    async (teamId: string) => {
      await deleteTeamMutation.mutateAsync(teamId);
      setCurrentTeamId(prev => (prev === teamId ? null : prev));
    },
    [deleteTeamMutation]
  );

  // 사용자의 팀 내 역할 가져오기
  const getUserRole = useCallback(
    (teamId: string): TeamRole | null => {
      if (!user) return null;

      // 현재 팀의 멤버 정보에서 역할 찾기
      if (teamId === currentTeamId) {
        const member = currentTeamMembers.find(m => m.user_id === user.id);
        return (member?.role as TeamRole) || null;
      }

      // 다른 팀의 경우 owner 체크
      const team = teams.find(t => t.id === teamId);
      if (team?.owner_id === user.id) {
        return 'owner' as TeamRole;
      }

      return null;
    },
    [user, teams, currentTeamId, currentTeamMembers]
  );

  const canManageTeam = useCallback(
    (teamId: string) => {
      const role = getUserRole(teamId);
      return role === TeamRole.OWNER || role === TeamRole.ADMIN;
    },
    [getUserRole]
  );

  // 멤버 역할 업데이트
  const updateMemberRole = useCallback(
    async (memberId: string, role: TeamRole) => {
      await updateRoleMutation.mutateAsync({ memberId, role });
    },
    [updateRoleMutation]
  );

  // 멤버 제거
  const removeMember = useCallback(
    async (memberId: string) => {
      await removeMemberMutation.mutateAsync(memberId);
    },
    [removeMemberMutation]
  );

  return {
    teams: userTeams, // memberCount가 포함된 userTeams 사용
    userTeams,
    currentTeam,
    currentTeamMembers,
    isLoading: isLoadingTeams || isLoadingMembers,
    error: teamsError as Error | null,
    switchTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    getUserRole,
    canManageTeam,
    updateMemberRole,
    removeMember,
  };
};
