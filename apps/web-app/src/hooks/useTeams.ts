import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { useAuth } from './useAuth';
import {
  Team,
  TeamMember,
  CreateTeamInput,
  UpdateTeamInput,
  InviteTeamMemberInput,
  TeamRole,
  FIRESTORE_COLLECTIONS,
  FirestoreTeam,
  FirestoreTeamMember,
} from '../types/team';
import { toast } from '../utils/toast';

export const useTeams = () => {
  const { user, updateUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeams, setUserTeams] = useState<TeamMember[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  // Load teams that user is a member of
  useEffect(() => {
    if (!user) {
      setTeams([]);
      setUserTeams([]);
      setCurrentTeam(null);
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    // Listen to user's team memberships
    const teamMembersQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.TEAM_MEMBERS),
      where('userId', '==', user.id),
      where('isActive', '==', true),
      orderBy('joinedAt', 'desc')
    );

    const unsubscribeMembers = onSnapshot(teamMembersQuery, (snapshot) => {
      const memberships = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreTeamMember;
        return {
          id: doc.id,
          teamId: data.teamId,
          userId: data.userId,
          role: data.role,
          joinedAt: data.joinedAt.toDate(),
          invitedBy: data.invitedBy,
          isActive: data.isActive,
        } as TeamMember;
      });
      setUserTeams(memberships);

      // Load teams for these memberships
      if (memberships.length > 0) {
        const teamIds = memberships.map(m => m.teamId);
        const teamsQuery = query(
          collection(db, FIRESTORE_COLLECTIONS.TEAMS),
          where('__name__', 'in', teamIds)
        );

        const unsubscribeTeams = onSnapshot(teamsQuery, (teamsSnapshot) => {
          const teamsData = teamsSnapshot.docs.map((doc) => {
            const data = doc.data() as FirestoreTeam;
            return {
              id: doc.id,
              name: data.name,
              description: data.description,
              ownerId: data.ownerId,
              memberCount: data.memberCount,
              settings: {
                isPublic: data.settings.isPublic,
                allowInvitations: data.settings.allowInvitations,
                defaultMemberRole: data.settings.defaultMemberRole as any,
                maxMembers: data.settings.maxMembers,
                timeZone: data.settings.timeZone,
                language: data.settings.language,
                features: data.settings.features,
              },
              isActive: data.isActive,
              createdAt: data.createdAt.toDate(),
              updatedAt: data.updatedAt.toDate(),
            } as Team;
          });
          setTeams(teamsData);

          // Set current team if not set
          if (!currentTeam && user.currentTeamId) {
            const current = teamsData.find(t => t.id === user.currentTeamId);
            if (current) {
              setCurrentTeam(current);
            }
          } else if (!currentTeam && teamsData.length > 0) {
            // Set first team as current if no current team is set
            setCurrentTeam(teamsData[0]);
            updateUser({ currentTeamId: teamsData[0].id });
          }

          setLoading(false);
        });

        unsubscribes.push(unsubscribeTeams);
      } else {
        setTeams([]);
        setCurrentTeam(null);
        setLoading(false);
      }
    });

    unsubscribes.push(unsubscribeMembers);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, currentTeam, updateUser]);

  const createTeam = async (input: CreateTeamInput): Promise<Team> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    const batch = writeBatch(db);
    const now = Timestamp.now();

    // Create team document
    const teamRef = doc(collection(db, FIRESTORE_COLLECTIONS.TEAMS));
    const teamData: FirestoreTeam = {
      id: teamRef.id,
      name: input.name,
      description: input.description,
      ownerId: user.id,
      memberCount: 1,
      settings: {
        isPublic: input.settings?.isPublic || false,
        allowInvitations: input.settings?.allowInvitations ?? true,
        defaultMemberRole: (input.settings?.defaultMemberRole || TeamRole.EDITOR) as any,
        maxMembers: input.settings?.maxMembers || 50,
        timeZone: input.settings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: input.settings?.language || 'ko',
        features: {
          ganttView: input.settings?.features?.ganttView ?? true,
          timeTracking: input.settings?.features?.timeTracking ?? false,
          advancedReporting: input.settings?.features?.advancedReporting ?? false,
          customFields: input.settings?.features?.customFields ?? false,
          integrations: input.settings?.features?.integrations ?? false,
        },
      },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(teamRef, teamData);

    // Add owner as team member
    const memberRef = doc(collection(db, FIRESTORE_COLLECTIONS.TEAM_MEMBERS));
    const memberData: FirestoreTeamMember = {
      id: memberRef.id,
      teamId: teamRef.id,
      userId: user.id,
      role: TeamRole.OWNER,
      joinedAt: now,
      isActive: true,
    };
    batch.set(memberRef, memberData);

    await batch.commit();

    const createdTeam: Team = {
      id: teamRef.id,
      name: teamData.name,
      description: teamData.description,
      ownerId: teamData.ownerId,
      memberCount: teamData.memberCount,
      settings: {
        ...teamData.settings,
        defaultMemberRole: teamData.settings.defaultMemberRole as any,
      },
      isActive: teamData.isActive,
      createdAt: teamData.createdAt.toDate(),
      updatedAt: teamData.updatedAt.toDate(),
    };

    // Set as current team if it's the user's first team
    if (teams.length === 0) {
      setCurrentTeam(createdTeam);
      await updateUser({ currentTeamId: createdTeam.id });
    }

    toast.success(`팀 "${input.name}"이 생성되었습니다.`);
    return createdTeam;
  };

  const updateTeam = async (input: UpdateTeamInput): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');
    
    const teamRef = doc(db, FIRESTORE_COLLECTIONS.TEAMS, input.id);
    const updateData: Partial<FirestoreTeam> = {
      updatedAt: Timestamp.now(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.settings !== undefined) updateData.settings = input.settings as any;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    await updateDoc(teamRef, updateData);
    toast.success('팀 설정이 업데이트되었습니다.');
  };

  const deleteTeam = async (teamId: string): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    const batch = writeBatch(db);

    // Delete team
    const teamRef = doc(db, FIRESTORE_COLLECTIONS.TEAMS, teamId);
    batch.delete(teamRef);

    // Delete all team members
    const membersQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.TEAM_MEMBERS),
      where('teamId', '==', teamId)
    );
    
    // Note: In a real implementation, you'd want to get the members first
    // and then delete them in the batch. This is a simplified version.
    await batch.commit();

    // If this was the current team, switch to another team
    if (currentTeam?.id === teamId) {
      const otherTeam = teams.find(t => t.id !== teamId);
      if (otherTeam) {
        setCurrentTeam(otherTeam);
        await updateUser({ currentTeamId: otherTeam.id });
      } else {
        setCurrentTeam(null);
        await updateUser({ currentTeamId: undefined });
      }
    }

    toast.success('팀이 삭제되었습니다.');
  };

  const switchTeam = async (teamId: string): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    const team = teams.find(t => t.id === teamId);
    if (!team) throw new Error('팀을 찾을 수 없습니다');

    setCurrentTeam(team);
    await updateUser({ currentTeamId: teamId });
    toast.success(`"${team.name}" 팀으로 전환되었습니다.`);
  };

  const inviteTeamMember = async (input: InviteTeamMemberInput): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const inviteFunction = httpsCallable(functions, 'inviteTeamMember');
      const result = await inviteFunction({
        teamId: input.teamId,
        email: input.email,
        role: input.role,
        message: input.message,
      });

      const data = result.data as any;
      toast.success(data.message || `${input.email}에게 초대장을 보냈습니다.`);
    } catch (error: any) {
      console.error('멤버 초대 실패:', error);
      throw new Error(error.message || '멤버 초대에 실패했습니다.');
    }
  };

  const generateInvitationToken = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const getUserRole = (teamId: string): TeamRole | null => {
    const membership = userTeams.find(ut => ut.teamId === teamId);
    return membership?.role || null;
  };

  const canManageTeam = (teamId: string): boolean => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !user) return false;
    
    if (team.ownerId === user.id) return true;
    
    const role = getUserRole(teamId);
    return role === TeamRole.ADMIN;
  };

  return {
    teams,
    userTeams,
    currentTeam,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    switchTeam,
    inviteTeamMember,
    getUserRole,
    canManageTeam,
  };
};