import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  useTeams as useTeamsQuery,
  useTeamMembers,
  useCreateTeam as useCreateTeamMutation,
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
  deleteTeam: (teamId: string) => Promise<void>;
  getUserRole: (teamId: string) => TeamRole | null;
  updateMemberRole: (memberId: string, role: TeamRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
}

export const useTeams = (): TeamsContextValue => {
  const { user } = useAuth();
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

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
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMember();

  // 최적화된 초기 팀 설정 - debounced and cached
  useEffect(() => {
    if (!user || currentTeamId || teams.length === 0) return;

    // Use micro-task to defer execution
    queueMicrotask(() => {
      const savedTeamId = localStorage.getItem(`currentTeam-${user.id}`);
      const teamToSelect = teams.find(t => t.id === savedTeamId) || teams[0];

      if (teamToSelect) {
        setCurrentTeamId(teamToSelect.id);
        localStorage.setItem(`currentTeam-${user.id}`, teamToSelect.id);
      }
    });
  }, [user, teams, currentTeamId]);

  // 현재 팀 객체
  const currentTeam = useMemo(() => {
    return teams.find(t => t.id === currentTeamId) || null;
  }, [teams, currentTeamId]);

  // 현재 팀의 멤버들
  const currentTeamMembers = useMemo(() => {
    return teamMembers || [];
  }, [teamMembers]);

  // 사용자가 속한 팀들만 필터링
  const userTeams = useMemo(() => {
    return teams; // 실제로는 사용자가 멤버인 팀만 필터링해야 함
  }, [teams]);

  // 팀 전환
  const switchTeam = useCallback(
    (team: Team) => {
      setCurrentTeamId(team.id);
      if (user) {
        localStorage.setItem(`currentTeam-${user.id}`, team.id);
      }
    },
    [user]
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

  // 팀 삭제 (실제 구현 필요)
  const deleteTeam = useCallback(async (teamId: string) => {
    // TODO: Implement team deletion
    console.log('Team deletion not implemented:', teamId);
  }, []);

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
    teams,
    userTeams,
    currentTeam,
    currentTeamMembers,
    isLoading: isLoadingTeams || isLoadingMembers,
    error: teamsError as Error | null,
    switchTeam,
    createTeam,
    deleteTeam,
    getUserRole,
    updateMemberRole,
    removeMember,
  };
};
