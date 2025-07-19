import { auth } from 'firebase-admin';
import { firestore } from 'firebase-admin';
import { ApiRequest, PermissionCheck } from '../types';

export class AuthUtils {
  /**
   * HTTP 요청에서 토큰을 검증하고 사용자 정보를 반환
   */
  static async verifyToken(req: any): Promise<{ uid: string; email: string; role: string; teamId: string }> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('인증 토큰이 필요합니다.');
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth().verifyIdToken(token);
      
      if (!decodedToken.uid) {
        throw new Error('유효하지 않은 토큰입니다.');
      }

      // 사용자 정보를 Firestore에서 조회
      const userDoc = await firestore().collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('사용자 데이터가 없습니다.');
      }

      return {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: userData.role || 'VIEWER',
        teamId: userData.teamId || '',
      };
    } catch (error) {
      throw new Error(`인증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 요청에서 사용자 정보를 추출하고 검증
   */
  static async verifyUser(req: ApiRequest): Promise<{ uid: string; email: string; role: string; teamId: string }> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('인증 토큰이 필요합니다.');
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth().verifyIdToken(token);
      
      if (!decodedToken.uid) {
        throw new Error('유효하지 않은 토큰입니다.');
      }

      // 사용자 정보를 Firestore에서 조회
      const userDoc = await firestore().collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('사용자 데이터가 없습니다.');
      }

      return {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: userData.role || 'VIEWER',
        teamId: userData.teamId || '',
      };
    } catch (error) {
      throw new Error(`인증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 사용자 권한 검증
   */
  static async checkPermission(permission: PermissionCheck): Promise<boolean> {
    try {
      const { userId, teamId, action, resourceType, resourceId } = permission;

      // 팀 멤버십 확인
      const teamMemberDoc = await firestore()
        .collection('teams')
        .doc(teamId)
        .collection('members')
        .doc(userId)
        .get();

      if (!teamMemberDoc.exists) {
        return false;
      }

      const memberData = teamMemberDoc.data();
      if (!memberData) {
        return false;
      }

      const userRole = memberData.role;

      // 역할별 권한 확인
      switch (action) {
        case 'READ':
          return ['ADMIN', 'EDITOR', 'VIEWER'].includes(userRole);

        case 'CREATE':
          if (resourceType === 'TASK') {
            return ['ADMIN', 'EDITOR'].includes(userRole);
          }
          return userRole === 'ADMIN';

        case 'UPDATE':
          if (resourceType === 'TASK') {
            // Task 작성자, 담당자, 또는 편집자/관리자
            if (resourceId) {
              const taskDoc = await firestore().collection('tasks').doc(resourceId).get();
              if (taskDoc.exists) {
                const taskData = taskDoc.data();
                if (taskData) {
                  return (
                    taskData.createdBy === userId ||
                    taskData.assigneeId === userId ||
                    ['ADMIN', 'EDITOR'].includes(userRole)
                  );
                }
              }
            }
            return ['ADMIN', 'EDITOR'].includes(userRole);
          }
          return ['ADMIN', 'EDITOR'].includes(userRole);

        case 'DELETE':
          if (resourceType === 'TASK') {
            // Task 작성자 또는 관리자
            if (resourceId) {
              const taskDoc = await firestore().collection('tasks').doc(resourceId).get();
              if (taskDoc.exists) {
                const taskData = taskDoc.data();
                if (taskData) {
                  return taskData.createdBy === userId || userRole === 'ADMIN';
                }
              }
            }
            return userRole === 'ADMIN';
          }
          return userRole === 'ADMIN';

        default:
          return false;
      }
    } catch (error) {
      console.error('권한 검증 오류:', error);
      return false;
    }
  }

  /**
   * 사용자가 팀 멤버인지 확인
   */
  static async isTeamMember(userId: string, teamId: string): Promise<boolean> {
    try {
      const memberDoc = await firestore()
        .collection('teams')
        .doc(teamId)
        .collection('members')
        .doc(userId)
        .get();

      return memberDoc.exists;
    } catch (error) {
      console.error('팀 멤버 확인 오류:', error);
      return false;
    }
  }

  /**
   * 사용자가 팀 관리자인지 확인
   */
  static async isTeamAdmin(userId: string, teamId: string): Promise<boolean> {
    try {
      const memberDoc = await firestore()
        .collection('teams')
        .doc(teamId)
        .collection('members')
        .doc(userId)
        .get();

      if (!memberDoc.exists) {
        return false;
      }

      const memberData = memberDoc.data();
      return memberData?.role === 'ADMIN';
    } catch (error) {
      console.error('팀 관리자 확인 오류:', error);
      return false;
    }
  }

  /**
   * 사용자가 팀 편집자인지 확인
   */
  static async isTeamEditor(userId: string, teamId: string): Promise<boolean> {
    try {
      const memberDoc = await firestore()
        .collection('teams')
        .doc(teamId)
        .collection('members')
        .doc(userId)
        .get();

      if (!memberDoc.exists) {
        return false;
      }

      const memberData = memberDoc.data();
      return memberData?.role === 'EDITOR';
    } catch (error) {
      console.error('팀 편집자 확인 오류:', error);
      return false;
    }
  }
} 