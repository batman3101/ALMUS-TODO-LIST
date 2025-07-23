"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUtils = void 0;
exports.verifyAuth = verifyAuth;
const firebase_admin_1 = require("firebase-admin");
const firebase_admin_2 = require("firebase-admin");
/**
 * Cloud Functions v2 CallableRequest의 auth 객체를 검증
 */
async function verifyAuth(authContext) {
    if (!authContext) {
        throw new Error('인증이 필요합니다.');
    }
    const { uid, token } = authContext;
    if (!uid) {
        throw new Error('유효하지 않은 인증 정보입니다.');
    }
    // 토큰이 유효한지 확인 (선택적)
    if (token) {
        try {
            await (0, firebase_admin_1.auth)().verifyIdToken(token.token);
        }
        catch (error) {
            throw new Error('인증 토큰이 유효하지 않습니다.');
        }
    }
    // 사용자 정보 조회
    const user = await (0, firebase_admin_1.auth)().getUser(uid);
    return {
        userId: uid,
        email: user.email || '',
    };
}
class AuthUtils {
    /**
     * HTTP 요청에서 토큰을 검증하고 사용자 정보를 반환
     */
    static async verifyToken(req) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('인증 토큰이 필요합니다.');
            }
            const token = authHeader.split('Bearer ')[1];
            const decodedToken = await (0, firebase_admin_1.auth)().verifyIdToken(token);
            if (!decodedToken.uid) {
                throw new Error('유효하지 않은 토큰입니다.');
            }
            // 사용자 정보를 Firestore에서 조회
            const userDoc = await (0, firebase_admin_2.firestore)()
                .collection('users')
                .doc(decodedToken.uid)
                .get();
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
        }
        catch (error) {
            throw new Error(`인증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * 요청에서 사용자 정보를 추출하고 검증
     */
    static async verifyUser(req) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('인증 토큰이 필요합니다.');
            }
            const token = authHeader.split('Bearer ')[1];
            const decodedToken = await (0, firebase_admin_1.auth)().verifyIdToken(token);
            if (!decodedToken.uid) {
                throw new Error('유효하지 않은 토큰입니다.');
            }
            // 사용자 정보를 Firestore에서 조회
            const userDoc = await (0, firebase_admin_2.firestore)()
                .collection('users')
                .doc(decodedToken.uid)
                .get();
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
        }
        catch (error) {
            throw new Error(`인증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * 사용자 권한 검증
     */
    static async checkPermission(permission) {
        try {
            const { userId, teamId, action, resourceType, resourceId } = permission;
            // 팀 멤버십 확인
            const teamMemberDoc = await (0, firebase_admin_2.firestore)()
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
                            const taskDoc = await (0, firebase_admin_2.firestore)()
                                .collection('tasks')
                                .doc(resourceId)
                                .get();
                            if (taskDoc.exists) {
                                const taskData = taskDoc.data();
                                if (taskData) {
                                    return (taskData.createdBy === userId ||
                                        taskData.assigneeId === userId ||
                                        ['ADMIN', 'EDITOR'].includes(userRole));
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
                            const taskDoc = await (0, firebase_admin_2.firestore)()
                                .collection('tasks')
                                .doc(resourceId)
                                .get();
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
        }
        catch (error) {
            console.error('권한 검증 오류:', error);
            return false;
        }
    }
    /**
     * 사용자가 팀 멤버인지 확인
     */
    static async isTeamMember(userId, teamId) {
        try {
            const memberDoc = await (0, firebase_admin_2.firestore)()
                .collection('teams')
                .doc(teamId)
                .collection('members')
                .doc(userId)
                .get();
            return memberDoc.exists;
        }
        catch (error) {
            console.error('팀 멤버 확인 오류:', error);
            return false;
        }
    }
    /**
     * 사용자가 팀 관리자인지 확인
     */
    static async isTeamAdmin(userId, teamId) {
        try {
            const memberDoc = await (0, firebase_admin_2.firestore)()
                .collection('teams')
                .doc(teamId)
                .collection('members')
                .doc(userId)
                .get();
            if (!memberDoc.exists) {
                return false;
            }
            const memberData = memberDoc.data();
            return (memberData === null || memberData === void 0 ? void 0 : memberData.role) === 'ADMIN';
        }
        catch (error) {
            console.error('팀 관리자 확인 오류:', error);
            return false;
        }
    }
    /**
     * 사용자가 팀 편집자인지 확인
     */
    static async isTeamEditor(userId, teamId) {
        try {
            const memberDoc = await (0, firebase_admin_2.firestore)()
                .collection('teams')
                .doc(teamId)
                .collection('members')
                .doc(userId)
                .get();
            if (!memberDoc.exists) {
                return false;
            }
            const memberData = memberDoc.data();
            return (memberData === null || memberData === void 0 ? void 0 : memberData.role) === 'EDITOR';
        }
        catch (error) {
            console.error('팀 편집자 확인 오류:', error);
            return false;
        }
    }
}
exports.AuthUtils = AuthUtils;
//# sourceMappingURL=auth.js.map