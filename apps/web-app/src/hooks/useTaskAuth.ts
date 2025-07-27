import { useAuth } from './useAuth';
import { useTeams } from './useTeams';
import { Task, TeamRole } from '../types/team';

/**
 * 태스크에 대한 팀 역할 기반 권한 확인 hook
 * - 간단한 팀 역할 기반 권한 확인
 * - OWNER > ADMIN > EDITOR > VIEWER 계층 구조
 */
export const useTaskAuth = () => {
  const { user } = useAuth();
  const { currentTeam, getUserRole } = useTeams();

  const canCreateTask = (): boolean => {
    if (!currentTeam || !user) return false;
    
    const role = getUserRole(currentTeam.id);
    return role === TeamRole.OWNER || role === TeamRole.ADMIN || role === TeamRole.EDITOR;
  };

  const canUpdateTask = (task: Task): boolean => {
    if (!currentTeam || !user) return false;
    
    const role = getUserRole(currentTeam.id);
    
    // 소유자와 관리자는 모든 태스크 수정 가능
    if (role === TeamRole.OWNER || role === TeamRole.ADMIN) return true;
    
    // 편집자는 자신의 태스크만 수정 가능
    if (role === TeamRole.EDITOR) {
      return task.assigneeId === user.uid || task.createdBy === user.uid;
    }
    
    // 뷰어는 수정 불가
    return false;
  };

  const canDeleteTask = (task: Task): boolean => {
    if (!currentTeam || !user) return false;
    
    const role = getUserRole(currentTeam.id);
    
    // 소유자와 관리자는 모든 태스크 삭제 가능
    if (role === TeamRole.OWNER || role === TeamRole.ADMIN) return true;
    
    // 편집자는 자신이 생성한 태스크만 삭제 가능
    if (role === TeamRole.EDITOR) {
      return task.createdBy === user.uid;
    }
    
    // 뷰어는 삭제 불가
    return false;
  };

  const canAssignTask = (): boolean => {
    if (!currentTeam || !user) return false;
    
    const role = getUserRole(currentTeam.id);
    return role === TeamRole.OWNER || role === TeamRole.ADMIN || role === TeamRole.EDITOR;
  };

  const canCommentOnTask = (): boolean => {
    if (!currentTeam || !user) return false;
    
    const role = getUserRole(currentTeam.id);
    // 모든 팀원은 댓글 가능 (뷰어 포함)
    return role !== null;
  };

  const canCompleteTask = (task: Task): boolean => {
    if (!currentTeam || !user) return false;
    
    const role = getUserRole(currentTeam.id);
    
    // 소유자와 관리자는 모든 태스크 완료 가능
    if (role === TeamRole.OWNER || role === TeamRole.ADMIN) return true;
    
    // 편집자는 담당자인 경우에만 완료 가능
    if (role === TeamRole.EDITOR) {
      return task.assigneeId === user.uid;
    }
    
    // 뷰어는 완료 불가
    return false;
  };

  // 현재 사용자의 팀 역할 반환
  const getCurrentUserRole = (): TeamRole | null => {
    if (!currentTeam || !user) return null;
    return getUserRole(currentTeam.id);
  };

  // 현재 사용자가 태스크의 소유자인지 확인
  const isTaskOwner = (task: Task): boolean => {
    if (!user) return false;
    return task.createdBy === user.uid;
  };

  // 현재 사용자가 태스크의 담당자인지 확인
  const isTaskAssignee = (task: Task): boolean => {
    if (!user) return false;
    return task.assigneeId === user.uid;
  };

  return {
    canCreateTask,
    canUpdateTask,
    canDeleteTask,
    canAssignTask,
    canCommentOnTask,
    canCompleteTask,
    getCurrentUserRole,
    isTaskOwner,
    isTaskAssignee,
  };
};