import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  TeamMember,
  TeamInvitation,
  TeamRole,
  InvitationStatus,
  FIRESTORE_COLLECTIONS,
  FirestoreTeamMember,
  FirestoreTeamInvitation,
  FirestoreUser,
} from '@almus/shared-types';
import { toast } from '../utils/toast';

export const useTeamMembers = (teamId: string) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    setLoading(true);

    // Listen to team members
    const membersQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.TEAM_MEMBERS),
      where('teamId', '==', teamId),
      where('isActive', '==', true),
      orderBy('joinedAt', 'asc')
    );

    const unsubscribeMembers = onSnapshot(membersQuery, async (snapshot) => {
      const memberPromises = snapshot.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data() as FirestoreTeamMember;
        
        // Fetch user data
        const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, memberData.userId));
        const userData = userDoc.exists() ? userDoc.data() as FirestoreUser : null;

        return {
          id: memberDoc.id,
          teamId: memberData.teamId,
          userId: memberData.userId,
          role: memberData.role,
          joinedAt: memberData.joinedAt.toDate(),
          invitedBy: memberData.invitedBy,
          isActive: memberData.isActive,
          user: userData ? {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            avatar: userData.avatar,
            currentTeamId: userData.currentTeamId,
            isActive: userData.isActive,
            lastLoginAt: userData.lastLoginAt?.toDate(),
            createdAt: userData.createdAt.toDate(),
            updatedAt: userData.updatedAt.toDate(),
          } : undefined,
        } as TeamMember;
      });

      const resolvedMembers = await Promise.all(memberPromises);
      setMembers(resolvedMembers);
      setLoading(false);
    });

    unsubscribes.push(unsubscribeMembers);

    // Listen to team invitations
    const invitationsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.TEAM_INVITATIONS),
      where('teamId', '==', teamId),
      where('status', '==', InvitationStatus.PENDING),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeInvitations = onSnapshot(invitationsQuery, async (snapshot) => {
      const invitationPromises = snapshot.docs.map(async (invitationDoc) => {
        const invitationData = invitationDoc.data() as FirestoreTeamInvitation;
        
        // Fetch inviter user data
        const inviterDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, invitationData.invitedBy));
        const inviterData = inviterDoc.exists() ? inviterDoc.data() as FirestoreUser : null;

        return {
          id: invitationDoc.id,
          teamId: invitationData.teamId,
          email: invitationData.email,
          role: invitationData.role,
          token: invitationData.token,
          invitedBy: invitationData.invitedBy,
          message: invitationData.message,
          expiresAt: invitationData.expiresAt.toDate(),
          acceptedAt: invitationData.acceptedAt?.toDate(),
          rejectedAt: invitationData.rejectedAt?.toDate(),
          status: invitationData.status as InvitationStatus,
          createdAt: invitationData.createdAt.toDate(),
          updatedAt: invitationData.updatedAt.toDate(),
          invitedByUser: inviterData ? {
            id: inviterData.id,
            email: inviterData.email,
            name: inviterData.name,
            role: inviterData.role,
            avatar: inviterData.avatar,
            currentTeamId: inviterData.currentTeamId,
            isActive: inviterData.isActive,
            lastLoginAt: inviterData.lastLoginAt?.toDate(),
            createdAt: inviterData.createdAt.toDate(),
            updatedAt: inviterData.updatedAt.toDate(),
          } : undefined,
        } as TeamInvitation;
      });

      const resolvedInvitations = await Promise.all(invitationPromises);
      setInvitations(resolvedInvitations);
    });

    unsubscribes.push(unsubscribeInvitations);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [teamId]);

  const updateMemberRole = async (memberId: string, newRole: TeamRole): Promise<void> => {
    try {
      const memberRef = doc(db, FIRESTORE_COLLECTIONS.TEAM_MEMBERS, memberId);
      await updateDoc(memberRef, {
        role: newRole,
        updatedAt: Timestamp.now(),
      });
      
      toast.success('멤버 역할이 변경되었습니다.');
    } catch (error) {
      console.error('멤버 역할 변경 실패:', error);
      toast.error('멤버 역할 변경에 실패했습니다.');
      throw error;
    }
  };

  const removeMember = async (memberId: string): Promise<void> => {
    try {
      const memberRef = doc(db, FIRESTORE_COLLECTIONS.TEAM_MEMBERS, memberId);
      await updateDoc(memberRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
      });
      
      // Also need to update team member count
      // This would be better handled by Cloud Functions in production
      const teamRef = doc(db, FIRESTORE_COLLECTIONS.TEAMS, teamId);
      const teamDoc = await getDoc(teamRef);
      if (teamDoc.exists()) {
        const currentCount = teamDoc.data().memberCount || 0;
        await updateDoc(teamRef, {
          memberCount: Math.max(0, currentCount - 1),
          updatedAt: Timestamp.now(),
        });
      }
      
      toast.success('멤버가 팀에서 제거되었습니다.');
    } catch (error) {
      console.error('멤버 제거 실패:', error);
      toast.error('멤버 제거에 실패했습니다.');
      throw error;
    }
  };

  const cancelInvitation = async (invitationId: string): Promise<void> => {
    try {
      const invitationRef = doc(db, FIRESTORE_COLLECTIONS.TEAM_INVITATIONS, invitationId);
      await updateDoc(invitationRef, {
        status: InvitationStatus.CANCELLED,
        updatedAt: Timestamp.now(),
      });
      
      toast.success('초대가 취소되었습니다.');
    } catch (error) {
      console.error('초대 취소 실패:', error);
      toast.error('초대 취소에 실패했습니다.');
      throw error;
    }
  };

  const resendInvitation = async (invitationId: string): Promise<void> => {
    try {
      // Extend expiration date by 7 days
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 7);
      
      const invitationRef = doc(db, FIRESTORE_COLLECTIONS.TEAM_INVITATIONS, invitationId);
      await updateDoc(invitationRef, {
        expiresAt: Timestamp.fromDate(newExpirationDate),
        updatedAt: Timestamp.now(),
      });
      
      // TODO: Send invitation email again
      toast.success('초대장이 다시 전송되었습니다.');
    } catch (error) {
      console.error('초대 재전송 실패:', error);
      toast.error('초대 재전송에 실패했습니다.');
      throw error;
    }
  };

  const getMemberByUserId = (userId: string): TeamMember | undefined => {
    return members.find(member => member.userId === userId);
  };

  const getMemberRole = (userId: string): TeamRole | null => {
    const member = getMemberByUserId(userId);
    return member?.role || null;
  };

  const isMember = (userId: string): boolean => {
    return members.some(member => member.userId === userId && member.isActive);
  };

  const getMemberCount = (): number => {
    return members.filter(member => member.isActive).length;
  };

  const getMembersByRole = (role: TeamRole): TeamMember[] => {
    return members.filter(member => member.role === role && member.isActive);
  };

  const getPendingInvitationsCount = (): number => {
    return invitations.filter(inv => inv.status === InvitationStatus.PENDING).length;
  };

  return {
    members,
    invitations,
    loading,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    resendInvitation,
    getMemberByUserId,
    getMemberRole,
    isMember,
    getMemberCount,
    getMembersByRole,
    getPendingInvitationsCount,
  };
};