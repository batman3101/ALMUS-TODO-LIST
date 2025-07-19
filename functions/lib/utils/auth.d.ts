import { ApiRequest, PermissionCheck } from '../types';
export declare class AuthUtils {
    /**
     * HTTP 요청에서 토큰을 검증하고 사용자 정보를 반환
     */
    static verifyToken(req: any): Promise<{
        uid: string;
        email: string;
        role: string;
        teamId: string;
    }>;
    /**
     * 요청에서 사용자 정보를 추출하고 검증
     */
    static verifyUser(req: ApiRequest): Promise<{
        uid: string;
        email: string;
        role: string;
        teamId: string;
    }>;
    /**
     * 사용자 권한 검증
     */
    static checkPermission(permission: PermissionCheck): Promise<boolean>;
    /**
     * 사용자가 팀 멤버인지 확인
     */
    static isTeamMember(userId: string, teamId: string): Promise<boolean>;
    /**
     * 사용자가 팀 관리자인지 확인
     */
    static isTeamAdmin(userId: string, teamId: string): Promise<boolean>;
    /**
     * 사용자가 팀 편집자인지 확인
     */
    static isTeamEditor(userId: string, teamId: string): Promise<boolean>;
}
//# sourceMappingURL=auth.d.ts.map