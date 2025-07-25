/**
 * 팀 관리 Cloud Functions
 * - 팀 멤버 초대, 수락, 거절 기능
 * - 보안 강화 및 타입 안전성 보장
 * - 트랜잭션 기반 데이터 일관성 유지
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp, Transaction, DocumentSnapshot } from 'firebase-admin/firestore';
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

// === 상수 정의 ===
const CONSTANTS = {
  INVITATION_EXPIRY_DAYS: 7,
  TOKEN_LENGTH: 32,
  DEFAULT_MAX_MEMBERS: 50,
  EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  EMAIL_MAX_LENGTH: 254,
  EMAIL_LOCAL_MAX_LENGTH: 64,
} as const;

// === Firebase 인스턴스 ===
const db = getFirestore();
const auth = getAuth();

// === 타입 정의 ===
interface TeamInvitationRequest {
  teamId: string;
  email: string;
  role: TeamRole;
  message?: string;
}

interface InvitationTokenRequest {
  token: string;
}

interface TeamPermissionResult {
  hasPermission: boolean;
  userRole?: TeamRole;
  memberData?: FirestoreTeamMember;
  error?: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// === 유틸리티 클래스 ===
class EmailValidator {
  static validate(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: '이메일 주소가 필요합니다.' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!CONSTANTS.EMAIL_REGEX.test(normalizedEmail)) {
      return { isValid: false, error: '유효하지 않은 이메일 형식입니다.' };
    }

    if (normalizedEmail.length > CONSTANTS.EMAIL_MAX_LENGTH) {
      return { isValid: false, error: '이메일 주소가 너무 깁니다.' };
    }

    if (normalizedEmail.includes('..')) {
      return { isValid: false, error: '연속된 점이 포함된 이메일은 사용할 수 없습니다.' };
    }

    const localPart = normalizedEmail.split('@')[0];
    if (localPart.length > CONSTANTS.EMAIL_LOCAL_MAX_LENGTH) {
      return { isValid: false, error: '이메일 주소의 로컬 부분이 너무 깁니다.' };
    }

    return { isValid: true };
  }

  static normalize(email: string): string {
    return email.trim().toLowerCase();
  }
}

class TokenGenerator {
  static generateSecure(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(CONSTANTS.TOKEN_LENGTH).toString('hex');
  }
}

class TeamPermissionChecker {
  static async checkInvitePermission(
    teamId: string, 
    userId: string
  ): Promise<TeamPermissionResult> {
    try {
      const memberDoc = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_MEMBERS)
        .doc(`${teamId}_${userId}`)
        .get();

      if (!memberDoc.exists) {
        return { hasPermission: false, error: '팀 멤버가 아닙니다.' };
      }

      const memberData = memberDoc.data() as FirestoreTeamMember;
      
      if (!memberData.isActive) {
        return { hasPermission: false, error: '비활성화된 멤버입니다.' };
      }

      const hasPermission = [TeamRole.OWNER, TeamRole.ADMIN].includes(memberData.role as TeamRole);
      
      return { 
        hasPermission, 
        userRole: memberData.role as TeamRole,
        memberData 
      };
    } catch (error: any) {
      logger.error('Permission check failed:', { teamId, userId, error: error.message });
      return { hasPermission: false };
    }
  }
}

class TeamDataManager {
  static async getTeam(teamId: string): Promise<{ exists: boolean; data?: FirestoreTeam }> {
    try {
      const teamDoc = await db.collection(FIRESTORE_COLLECTIONS.TEAMS).doc(teamId).get();
      
      if (!teamDoc.exists) {
        return { exists: false };
      }

      return { exists: true, data: teamDoc.data() as FirestoreTeam };
    } catch (error: any) {
      logger.error('Failed to get team:', { teamId, error: error.message });
      return { exists: false };
    }
  }

  static async findUserByEmail(email: string): Promise<string | null> {
    try {
      const validation = EmailValidator.validate(email);
      if (!validation.isValid) {
        return null;
      }

      const normalizedEmail = EmailValidator.normalize(email);
      const user = await auth.getUserByEmail(normalizedEmail);
      return user.uid;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }

  static async checkExistingMembership(
    teamId: string, 
    userId: string
  ): Promise<{ exists: boolean; isActive?: boolean }> {
    try {
      const memberDoc = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_MEMBERS)
        .doc(`${teamId}_${userId}`)
        .get();

      if (!memberDoc.exists) {
        return { exists: false };
      }

      return { 
        exists: true, 
        isActive: memberDoc.data()?.isActive || false 
      };
    } catch (error: any) {
      logger.error('Failed to check membership:', { teamId, userId, error: error.message });
      return { exists: false };
    }
  }

  static async checkExistingInvitation(
    teamId: string, 
    email: string
  ): Promise<boolean> {
    try {
      const normalizedEmail = EmailValidator.normalize(email);
      const query = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_INVITATIONS)
        .where('teamId', '==', teamId)
        .where('email', '==', normalizedEmail)
        .where('status', '==', InvitationStatus.PENDING)
        .limit(1)
        .get();

      return !query.empty;
    } catch (error: any) {
      logger.error('Failed to check existing invitation:', { teamId, email, error: error.message });
      return false;
    }
  }
}

class InvitationManager {
  static async createInvitation(
    teamId: string,
    email: string,
    role: TeamRole,
    invitedBy: string,
    message?: string
  ): Promise<string> {
    const normalizedEmail = EmailValidator.normalize(email);
    const token = TokenGenerator.generateSecure();
    const expiresAt = new Date(Date.now() + CONSTANTS.INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitationData: Omit<FirestoreTeamInvitation, 'id'> = {
      teamId,
      email: normalizedEmail,
      role,
      token,
      invitedBy,
      message: message?.trim() || '',
      expiresAt: expiresAt as any,
      status: InvitationStatus.PENDING,
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any,
    };

    const invitationRef = await db
      .collection(FIRESTORE_COLLECTIONS.TEAM_INVITATIONS)
      .add({ ...invitationData, id: '' });

    return invitationRef.id;
  }

  static async findByToken(token: string): Promise<{
    exists: boolean;
    doc?: DocumentSnapshot;
    data?: FirestoreTeamInvitation;
  }> {
    try {
      const query = await db
        .collection(FIRESTORE_COLLECTIONS.TEAM_INVITATIONS)
        .where('token', '==', token.trim())
        .where('status', '==', InvitationStatus.PENDING)
        .limit(1)
        .get();

      if (query.empty) {
        return { exists: false };
      }

      const doc = query.docs[0];
      return { 
        exists: true, 
        doc, 
        data: doc.data() as FirestoreTeamInvitation 
      };
    } catch (error: any) {
      logger.error('Failed to find invitation by token:', { error: error.message });
      return { exists: false };
    }
  }

  static isExpired(invitation: FirestoreTeamInvitation): boolean {
    const now = new Date();
    const expiresAt = invitation.expiresAt instanceof Timestamp 
      ? invitation.expiresAt.toDate() 
      : new Date(invitation.expiresAt as any);
    
    return now > expiresAt;
  }
}

// === 이메일 발송 헬퍼 ===
class EmailService {
  static async sendInvitation(
    email: string,
    teamName: string,
    inviterName: string,
    role: TeamRole,
    token: string,
    message: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      await sendTeamInvitationEmail({
        recipientEmail: email,
        recipientName: email.split('@')[0],
        teamName,
        inviterName,
        role,
        invitationToken: token,
        message,
        expiresAt,
      });
    } catch (error: any) {
      logger.warn('Failed to send invitation email:', { 
        email, 
        error: error.message 
      });
      // 이메일 발송 실패는 전체 프로세스를 중단하지 않음
    }
  }
}

// === 에러 핸들러 ===
class ErrorHandler {
  static handle(error: unknown, context: string, additionalInfo: Record<string, unknown> = {}): never {
    logger.error(`Error in ${context}:`, {
      error: error?.message || String(error),
      code: error?.code,
      ...additionalInfo,
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    // Firebase Auth 에러 처리
    if (error?.code?.startsWith('auth/')) {
      switch (error.code) {
        case 'auth/user-not-found':
          throw new HttpsError('not-found', '사용자를 찾을 수 없습니다.');
        case 'auth/invalid-email':
          throw new HttpsError('invalid-argument', '유효하지 않은 이메일 주소입니다.');
        default:
          throw new HttpsError('internal', '인증 오류가 발생했습니다.');
      }
    }

    throw new HttpsError('internal', `${context} 중 오류가 발생했습니다.`);
  }
}

// === Cloud Functions ===

/**
 * 팀 멤버 초대
 */
export const inviteTeamMember = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    region: 'asia-northeast3',
  },
  async (request: CallableRequest<TeamInvitationRequest>) => {
    let userId = '';
    
    try {
      // 1. 인증 확인
      const authResult = await verifyAuth(request.auth);
      userId = authResult.userId;

      // 2. 입력 데이터 검증
      const { teamId, email, role, message } = request.data;

      if (!teamId || typeof teamId !== 'string') {
        throw new HttpsError('invalid-argument', '유효한 팀 ID가 필요합니다.');
      }

      const emailValidation = EmailValidator.validate(email);
      if (!emailValidation.isValid) {
        throw new HttpsError('invalid-argument', emailValidation.error!);
      }

      if (!role || !Object.values(TeamRole).includes(role)) {
        throw new HttpsError('invalid-argument', '유효한 역할이 필요합니다.');
      }

      if (message && typeof message !== 'string') {
        throw new HttpsError('invalid-argument', '메시지는 문자열이어야 합니다.');
      }

      const normalizedEmail = EmailValidator.normalize(email);

      // 3. 팀 존재 확인
      const teamResult = await TeamDataManager.getTeam(teamId);
      if (!teamResult.exists) {
        throw new HttpsError('not-found', '팀을 찾을 수 없습니다.');
      }

      const teamData = teamResult.data!;

      // 4. 초대자 권한 확인
      const permission = await TeamPermissionChecker.checkInvitePermission(teamId, userId);
      if (!permission.hasPermission) {
        throw new HttpsError('permission-denied', '팀 멤버 초대 권한이 없습니다.');
      }

      // 5. 팀 설정 확인
      if (!teamData.settings?.allowInvitations && permission.userRole !== TeamRole.OWNER) {
        throw new HttpsError('permission-denied', '팀에서 초대를 허용하지 않습니다.');
      }

      // 6. 멤버 수 제한 확인
      const maxMembers = teamData.settings?.maxMembers || CONSTANTS.DEFAULT_MAX_MEMBERS;
      if ((teamData.memberCount || 0) >= maxMembers) {
        throw new HttpsError('resource-exhausted', '팀 멤버 수가 최대 제한에 도달했습니다.');
      }

      // 7. 이미 멤버인지 확인
      const invitedUserId = await TeamDataManager.findUserByEmail(normalizedEmail);
      if (invitedUserId) {
        const membership = await TeamDataManager.checkExistingMembership(teamId, invitedUserId);
        if (membership.exists && membership.isActive) {
          throw new HttpsError('already-exists', '이미 팀 멤버입니다.');
        }
      }

      // 8. 기존 초대장 확인
      const hasExistingInvitation = await TeamDataManager.checkExistingInvitation(teamId, normalizedEmail);
      if (hasExistingInvitation) {
        throw new HttpsError('already-exists', '이미 초대장이 발송되었습니다.');
      }

      // 9. 초대장 생성
      const invitationId = await InvitationManager.createInvitation(
        teamId,
        normalizedEmail,
        role,
        userId,
        message
      );

      // 10. 이메일 발송
      const inviterUser = await auth.getUser(userId);
      const inviterName = inviterUser.displayName || inviterUser.email || '알 수 없는 사용자';
      const expiresAt = new Date(Date.now() + CONSTANTS.INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      // 토큰은 보안상 로그에 기록하지 않고 이메일로만 전송
      const invitationData = await InvitationManager.findByToken(
        (await db.collection(FIRESTORE_COLLECTIONS.TEAM_INVITATIONS).doc(invitationId).get()).data()?.token
      );

      if (invitationData.exists) {
        await EmailService.sendInvitation(
          normalizedEmail,
          teamData.name,
          inviterName,
          role,
          invitationData.data!.token,
          message || '',
          expiresAt
        );
      }

      logger.info('Team invitation sent successfully', {
        teamId,
        email: normalizedEmail,
        role,
        invitedBy: userId,
        invitationId,
      });

      return {
        success: true,
        invitationId,
        message: '초대장이 성공적으로 발송되었습니다.',
      };

    } catch (error: any) {
      ErrorHandler.handle(error, 'inviteTeamMember', {
        teamId: request.data?.teamId,
        email: request.data?.email,
        userId: userId || 'unknown',
      });
    }
  }
);

/**
 * 팀 초대 수락
 */
export const acceptTeamInvitation = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    region: 'asia-northeast3',
  },
  async (request: CallableRequest<InvitationTokenRequest>) => {
    let userId = '';

    try {
      // 1. 인증 확인
      const authResult = await verifyAuth(request.auth);
      userId = authResult.userId;

      // 2. 입력 데이터 검증
      const { token } = request.data;
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new HttpsError('invalid-argument', '유효한 초대 토큰이 필요합니다.');
      }

      // 3. 초대장 찾기
      const invitationResult = await InvitationManager.findByToken(token);
      if (!invitationResult.exists) {
        throw new HttpsError('not-found', '유효하지 않은 초대장입니다.');
      }

      const invitationDoc = invitationResult.doc!;
      const invitationData = invitationResult.data!;

      // 4. 만료 확인
      if (InvitationManager.isExpired(invitationData)) {
        await invitationDoc.ref.update({
          status: InvitationStatus.EXPIRED,
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError('deadline-exceeded', '초대장이 만료되었습니다.');
      }

      // 5. 사용자 이메일 확인
      const user = await auth.getUser(userId);
      if (!user.email || EmailValidator.normalize(user.email) !== invitationData.email) {
        throw new HttpsError('permission-denied', '초대받은 이메일 주소와 일치하지 않습니다.');
      }

      // 6. 팀 정보 확인
      const teamResult = await TeamDataManager.getTeam(invitationData.teamId);
      if (!teamResult.exists) {
        throw new HttpsError('not-found', '팀을 찾을 수 없습니다.');
      }

      const teamData = teamResult.data!;

      // 7. 트랜잭션으로 멤버 추가 및 초대장 상태 업데이트
      const result = await db.runTransaction(async (transaction: Transaction) => {
        // 팀 문서 재조회
        const teamDocRef = db.collection(FIRESTORE_COLLECTIONS.TEAMS).doc(invitationData.teamId);
        const teamDocInTransaction = await transaction.get(teamDocRef);
        
        if (!teamDocInTransaction.exists) {
          throw new HttpsError('not-found', '팀을 찾을 수 없습니다.');
        }

        const teamDataInTransaction = teamDocInTransaction.data() as FirestoreTeam;
        const maxMembers = teamDataInTransaction.settings?.maxMembers || CONSTANTS.DEFAULT_MAX_MEMBERS;

        // 멤버 수 제한 재확인
        if ((teamDataInTransaction.memberCount || 0) >= maxMembers) {
          throw new HttpsError('resource-exhausted', '팀 멤버 수가 최대 제한에 도달했습니다.');
        }

        // 멤버 문서 처리
        const memberRef = db
          .collection(FIRESTORE_COLLECTIONS.TEAM_MEMBERS)
          .doc(`${invitationData.teamId}_${userId}`);
        
        const existingMember = await transaction.get(memberRef);

        const memberData: Omit<FirestoreTeamMember, 'id'> = {
          teamId: invitationData.teamId,
          userId,
          role: invitationData.role,
          joinedAt: FieldValue.serverTimestamp() as any,
          invitedBy: invitationData.invitedBy,
          isActive: true,
        };

        if (existingMember.exists) {
          // 기존 멤버 재활성화
          transaction.update(memberRef, {
            ...memberData,
            joinedAt: FieldValue.serverTimestamp(),
          });
        } else {
          // 새 멤버 추가
          transaction.set(memberRef, { ...memberData, id: memberRef.id });
          
          // 팀 멤버 수 증가
          transaction.update(teamDocRef, {
            memberCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        // 초대장 상태 업데이트
        transaction.update(invitationDoc.ref, {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          teamId: invitationData.teamId,
          teamName: teamData.name,
          role: invitationData.role,
        };
      });

      logger.info('Team invitation accepted successfully', {
        teamId: invitationData.teamId,
        userId,
        invitationId: invitationDoc.id,
        role: invitationData.role,
      });

      return {
        success: true,
        ...result,
        message: '팀 초대를 수락했습니다.',
      };

    } catch (error: any) {
      ErrorHandler.handle(error, 'acceptTeamInvitation', {
        token: request.data?.token ? '[PROVIDED]' : '[MISSING]',
        userId: userId || 'unknown',
      });
    }
  }
);

/**
 * 팀 초대 거절
 */
export const rejectTeamInvitation = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  async (request: CallableRequest<InvitationTokenRequest>) => {
    let userId = '';

    try {
      // 1. 인증 확인
      const authResult = await verifyAuth(request.auth);
      userId = authResult.userId;

      // 2. 입력 데이터 검증
      const { token } = request.data;
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new HttpsError('invalid-argument', '유효한 초대 토큰이 필요합니다.');
      }

      // 3. 초대장 찾기
      const invitationResult = await InvitationManager.findByToken(token);
      if (!invitationResult.exists) {
        throw new HttpsError('not-found', '유효하지 않은 초대장입니다.');
      }

      const invitationDoc = invitationResult.doc!;
      const invitationData = invitationResult.data!;

      // 4. 사용자 이메일 확인
      const user = await auth.getUser(userId);
      if (!user.email || EmailValidator.normalize(user.email) !== invitationData.email) {
        throw new HttpsError('permission-denied', '초대받은 이메일 주소와 일치하지 않습니다.');
      }

      // 5. 초대장 상태 업데이트
      await invitationDoc.ref.update({
        status: InvitationStatus.REJECTED,
        rejectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info('Team invitation rejected successfully', {
        teamId: invitationData.teamId,
        userId,
        invitationId: invitationDoc.id,
      });

      return {
        success: true,
        message: '팀 초대를 거절했습니다.',
      };

    } catch (error: any) {
      ErrorHandler.handle(error, 'rejectTeamInvitation', {
        token: request.data?.token ? '[PROVIDED]' : '[MISSING]',
        userId: userId || 'unknown',
      });
    }
  }
);