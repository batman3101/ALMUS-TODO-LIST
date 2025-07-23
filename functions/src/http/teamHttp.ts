import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { sendTeamInvitationEmail } from '../services/emailService';
import { verifyAuth } from '../utils/auth';
import { 
  FIRESTORE_COLLECTIONS,
  TeamRole,
  InvitationStatus,
  type FirestoreTeamInvitation,
  type FirestoreTeam,
  type FirestoreTeamMember,
} from '@almus/shared-types';

const db = getFirestore();
const auth = getAuth();

// 팀 멤버 초대
export const inviteTeamMember = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    region: 'asia-northeast3',
  },
  async (request) => {
    try {
      // 인증 확인
      const { userId } = await verifyAuth(request.auth);
      
      const { teamId, email, role, message } = request.data;
      
      if (!teamId || !email || !role) {
        throw new HttpsError('invalid-argument', '필수 파라미터가 누락되었습니다.');
      }

      // 팀 정보 확인
      const teamDoc = await db.collection(FIRESTORE_COLLECTIONS.TEAMS).doc(teamId).get();
      if (!teamDoc.exists) {
        throw new HttpsError('not-found', '팀을 찾을 수 없습니다.');
      }

      const teamData = teamDoc.data() as FirestoreTeam;

      // 초대자 권한 확인
      const inviterMemberQuery = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_MEMBERS)
        .where('teamId', '==', teamId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      if (inviterMemberQuery.empty) {
        throw new HttpsError('permission-denied', '팀 멤버만 초대할 수 있습니다.');
      }

      const inviterRole = inviterMemberQuery.docs[0].data().role as TeamRole;
      if (inviterRole !== TeamRole.OWNER && inviterRole !== TeamRole.ADMIN) {
        throw new HttpsError('permission-denied', '초대 권한이 없습니다.');
      }

      // 팀 설정 확인
      if (!teamData.settings.allowInvitations && inviterRole !== TeamRole.OWNER) {
        throw new HttpsError('permission-denied', '팀에서 초대를 허용하지 않습니다.');
      }

      // 멤버 수 제한 확인
      if (teamData.memberCount >= teamData.settings.maxMembers) {
        throw new HttpsError('resource-exhausted', '팀 멤버 수가 최대 제한에 도달했습니다.');
      }

      // 이미 팀 멤버인지 확인
      const existingMemberQuery = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_MEMBERS)
        .where('teamId', '==', teamId)
        .where('userId', '==', await getUserIdByEmail(email))
        .where('isActive', '==', true)
        .get();

      if (!existingMemberQuery.empty) {
        throw new HttpsError('already-exists', '이미 팀 멤버입니다.');
      }

      // 기존 대기 중 초대 확인
      const existingInvitationQuery = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_INVITATIONS)
        .where('teamId', '==', teamId)
        .where('email', '==', email.toLowerCase())
        .where('status', '==', InvitationStatus.PENDING)
        .get();

      if (!existingInvitationQuery.empty) {
        throw new HttpsError('already-exists', '이미 초대장이 발송되었습니다.');
      }

      // 초대장 생성
      const invitationToken = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

      const invitationData: FirestoreTeamInvitation = {
        id: '', // Firestore에서 자동 생성
        teamId,
        email: email.toLowerCase(),
        role: role as TeamRole,
        token: invitationToken,
        invitedBy: userId,
        message: message || '',
        expiresAt: FieldValue.serverTimestamp() as any,
        status: InvitationStatus.PENDING,
        createdAt: FieldValue.serverTimestamp() as any,
        updatedAt: FieldValue.serverTimestamp() as any,
      };

      // 실제 만료 시간을 Timestamp로 설정
      invitationData.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) as any;

      const invitationRef = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_INVITATIONS)
        .add(invitationData);

      // 이메일 발송
      await sendTeamInvitationEmail({
        recipientEmail: email,
        recipientName: email.split('@')[0], // 임시로 이메일 앞부분을 이름으로 사용
        teamName: teamData.name,
        inviterName: (await auth.getUser(userId)).displayName || 'Unknown',
        role: role as TeamRole,
        invitationToken,
        message: message || '',
        expiresAt,
      });

      logger.info(`Team invitation sent`, {
        teamId,
        email,
        role,
        invitedBy: userId,
        invitationId: invitationRef.id,
      });

      return {
        success: true,
        invitationId: invitationRef.id,
        message: '초대장이 성공적으로 발송되었습니다.',
      };

    } catch (error) {
      logger.error('Error sending team invitation:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', '초대 발송 중 오류가 발생했습니다.');
    }
  }
);

// 초대 수락
export const acceptTeamInvitation = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    region: 'asia-northeast3',
  },
  async (request) => {
    try {
      const { userId } = await verifyAuth(request.auth);
      const { token } = request.data;

      if (!token) {
        throw new HttpsError('invalid-argument', '초대 토큰이 필요합니다.');
      }

      // 초대장 찾기
      const invitationQuery = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_INVITATIONS)
        .where('token', '==', token)
        .where('status', '==', InvitationStatus.PENDING)
        .get();

      if (invitationQuery.empty) {
        throw new HttpsError('not-found', '유효하지 않은 초대장입니다.');
      }

      const invitationDoc = invitationQuery.docs[0];
      const invitationData = invitationDoc.data() as FirestoreTeamInvitation;

      // 만료 확인
      const now = new Date();
      const expiresAt = invitationData.expiresAt instanceof Date 
        ? invitationData.expiresAt 
        : (invitationData.expiresAt as any).toDate();

      if (now > expiresAt) {
        // 초대장을 만료 상태로 업데이트
        await invitationDoc.ref.update({
          status: InvitationStatus.EXPIRED,
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError('deadline-exceeded', '초대장이 만료되었습니다.');
      }

      // 사용자 이메일 확인
      const user = await auth.getUser(userId);
      if (user.email?.toLowerCase() !== invitationData.email) {
        throw new HttpsError('permission-denied', '초대받은 이메일 주소와 일치하지 않습니다.');
      }

      // 팀 정보 확인
      const teamDoc = await db.collection(FIRESTORE_COLLECTIONS.TEAMS).doc(invitationData.teamId).get();
      if (!teamDoc.exists) {
        throw new HttpsError('not-found', '팀을 찾을 수 없습니다.');
      }

      const teamData = teamDoc.data() as FirestoreTeam;

      // 이미 멤버인지 확인
      const existingMemberQuery = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_MEMBERS)
        .where('teamId', '==', invitationData.teamId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      if (!existingMemberQuery.empty) {
        throw new HttpsError('already-exists', '이미 팀 멤버입니다.');
      }

      // 트랜잭션으로 멤버 추가 및 초대장 상태 업데이트
      await db.runTransaction(async (transaction) => {
        // 팀 멤버 추가
        const memberRef = db.collection(FIRESTORE_COLLECTIONS.TEAM_MEMBERS).doc();
        const memberData: FirestoreTeamMember = {
          id: memberRef.id,
          teamId: invitationData.teamId,
          userId,
          role: invitationData.role,
          joinedAt: FieldValue.serverTimestamp() as any,
          invitedBy: invitationData.invitedBy,
          isActive: true,
        };
        transaction.set(memberRef, memberData);

        // 초대장 상태 업데이트
        transaction.update(invitationDoc.ref, {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 팀 멤버 수 증가
        transaction.update(teamDoc.ref, {
          memberCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      logger.info(`Team invitation accepted`, {
        teamId: invitationData.teamId,
        userId,
        invitationId: invitationDoc.id,
      });

      return {
        success: true,
        teamId: invitationData.teamId,
        teamName: teamData.name,
        role: invitationData.role,
        message: '팀 초대를 수락했습니다.',
      };

    } catch (error) {
      logger.error('Error accepting team invitation:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', '초대 수락 중 오류가 발생했습니다.');
    }
  }
);

// 초대 거절
export const rejectTeamInvitation = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  async (request) => {
    try {
      const { userId } = await verifyAuth(request.auth);
      const { token } = request.data;

      if (!token) {
        throw new HttpsError('invalid-argument', '초대 토큰이 필요합니다.');
      }

      // 초대장 찾기
      const invitationQuery = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_INVITATIONS)
        .where('token', '==', token)
        .where('status', '==', InvitationStatus.PENDING)
        .get();

      if (invitationQuery.empty) {
        throw new HttpsError('not-found', '유효하지 않은 초대장입니다.');
      }

      const invitationDoc = invitationQuery.docs[0];
      const invitationData = invitationDoc.data() as FirestoreTeamInvitation;

      // 사용자 이메일 확인
      const user = await auth.getUser(userId);
      if (user.email?.toLowerCase() !== invitationData.email) {
        throw new HttpsError('permission-denied', '초대받은 이메일 주소와 일치하지 않습니다.');
      }

      // 초대장 상태 업데이트
      await invitationDoc.ref.update({
        status: InvitationStatus.REJECTED,
        rejectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info(`Team invitation rejected`, {
        teamId: invitationData.teamId,
        userId,
        invitationId: invitationDoc.id,
      });

      return {
        success: true,
        message: '팀 초대를 거절했습니다.',
      };

    } catch (error) {
      logger.error('Error rejecting team invitation:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', '초대 거절 중 오류가 발생했습니다.');
    }
  }
);

// 유틸리티 함수들
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const user = await auth.getUserByEmail(email);
    return user.uid;
  } catch (error) {
    return null; // 사용자가 존재하지 않음
  }
}

function generateInvitationToken(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}