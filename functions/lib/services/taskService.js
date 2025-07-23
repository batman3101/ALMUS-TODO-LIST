"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const firebase_admin_1 = require("firebase-admin");
const auth_1 = require("../utils/auth");
class TaskService {
    /**
     * Task 생성
     */
    static async createTask(userId, taskData) {
        try {
            // 권한 검증
            const hasPermission = await auth_1.AuthUtils.checkPermission({
                userId,
                teamId: taskData.teamId,
                action: 'CREATE',
                resourceType: 'TASK',
            });
            if (!hasPermission) {
                throw new Error('Task를 생성할 권한이 없습니다.');
            }
            // Task 데이터 검증
            if (!taskData.title || !taskData.assigneeId || !taskData.teamId) {
                throw new Error('필수 필드가 누락되었습니다.');
            }
            // 담당자가 팀 멤버인지 확인
            const isAssigneeMember = await auth_1.AuthUtils.isTeamMember(taskData.assigneeId, taskData.teamId);
            if (!isAssigneeMember) {
                throw new Error('담당자가 팀 멤버가 아닙니다.');
            }
            const taskDoc = {
                title: taskData.title,
                description: taskData.description || '',
                assigneeId: taskData.assigneeId,
                status: taskData.status,
                priority: taskData.priority,
                dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
                teamId: taskData.teamId,
                projectId: taskData.projectId || null,
                createdBy: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
            };
            const docRef = await (0, firebase_admin_1.firestore)().collection('tasks').add(taskDoc);
            return Object.assign({ id: docRef.id }, taskDoc);
        }
        catch (error) {
            throw new Error(`Task 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Task 수정
     */
    static async updateTask(userId, taskId, updateData) {
        try {
            // 기존 Task 조회
            const taskDoc = await (0, firebase_admin_1.firestore)().collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) {
                throw new Error('Task를 찾을 수 없습니다.');
            }
            const taskData = taskDoc.data();
            if (!taskData) {
                throw new Error('Task 데이터가 없습니다.');
            }
            // 권한 검증
            const hasPermission = await auth_1.AuthUtils.checkPermission({
                userId,
                teamId: taskData.teamId,
                action: 'UPDATE',
                resourceType: 'TASK',
                resourceId: taskId,
            });
            if (!hasPermission) {
                throw new Error('Task를 수정할 권한이 없습니다.');
            }
            // 담당자 변경 시 팀 멤버 확인
            if (updateData.assigneeId &&
                updateData.assigneeId !== taskData.assigneeId) {
                const isAssigneeMember = await auth_1.AuthUtils.isTeamMember(updateData.assigneeId, taskData.teamId);
                if (!isAssigneeMember) {
                    throw new Error('새 담당자가 팀 멤버가 아닙니다.');
                }
            }
            const updateDoc = Object.assign(Object.assign({}, updateData), { updatedAt: new Date(), version: taskData.version + 1 });
            // null 값 제거
            Object.keys(updateDoc).forEach(key => {
                const typedKey = key;
                if (updateDoc[typedKey] === null || updateDoc[typedKey] === undefined) {
                    delete updateDoc[typedKey];
                }
            });
            await (0, firebase_admin_1.firestore)().collection('tasks').doc(taskId).update(updateDoc);
            // 업데이트된 Task 조회
            const updatedDoc = await (0, firebase_admin_1.firestore)()
                .collection('tasks')
                .doc(taskId)
                .get();
            return Object.assign({ id: taskId }, updatedDoc.data());
        }
        catch (error) {
            throw new Error(`Task 수정 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Task 삭제
     */
    static async deleteTask(userId, taskId) {
        try {
            // 기존 Task 조회
            const taskDoc = await (0, firebase_admin_1.firestore)().collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) {
                throw new Error('Task를 찾을 수 없습니다.');
            }
            const taskData = taskDoc.data();
            if (!taskData) {
                throw new Error('Task 데이터가 없습니다.');
            }
            // 권한 검증
            const hasPermission = await auth_1.AuthUtils.checkPermission({
                userId,
                teamId: taskData.teamId,
                action: 'DELETE',
                resourceType: 'TASK',
                resourceId: taskId,
            });
            if (!hasPermission) {
                throw new Error('Task를 삭제할 권한이 없습니다.');
            }
            await (0, firebase_admin_1.firestore)().collection('tasks').doc(taskId).delete();
        }
        catch (error) {
            throw new Error(`Task 삭제 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Task 조회
     */
    static async getTask(userId, taskId) {
        try {
            const taskDoc = await (0, firebase_admin_1.firestore)().collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) {
                throw new Error('Task를 찾을 수 없습니다.');
            }
            const taskData = taskDoc.data();
            if (!taskData) {
                throw new Error('Task 데이터가 없습니다.');
            }
            // 권한 검증
            const hasPermission = await auth_1.AuthUtils.checkPermission({
                userId,
                teamId: taskData.teamId,
                action: 'READ',
                resourceType: 'TASK',
                resourceId: taskId,
            });
            if (!hasPermission) {
                throw new Error('Task를 조회할 권한이 없습니다.');
            }
            return Object.assign({ id: taskId }, taskData);
        }
        catch (error) {
            throw new Error(`Task 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Task 목록 조회
     */
    static async getTasks(userId, query) {
        try {
            // 팀 멤버 확인
            const isMember = await auth_1.AuthUtils.isTeamMember(userId, query.teamId);
            if (!isMember) {
                throw new Error('팀 멤버가 아닙니다.');
            }
            let tasksQuery = (0, firebase_admin_1.firestore)()
                .collection('tasks')
                .where('teamId', '==', query.teamId);
            // 프로젝트 필터
            if (query.projectId) {
                tasksQuery = tasksQuery.where('projectId', '==', query.projectId);
            }
            // 상태 필터
            if (query.status) {
                tasksQuery = tasksQuery.where('status', '==', query.status);
            }
            // 담당자 필터
            if (query.assigneeId) {
                tasksQuery = tasksQuery.where('assigneeId', '==', query.assigneeId);
            }
            // 정렬 (생성일 역순)
            tasksQuery = tasksQuery.orderBy('createdAt', 'desc');
            // 페이징
            if (query.offset) {
                tasksQuery = tasksQuery.offset(query.offset);
            }
            if (query.limit) {
                tasksQuery = tasksQuery.limit(query.limit);
            }
            const snapshot = await tasksQuery.get();
            const tasks = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            return {
                tasks,
                total: tasks.length,
                limit: query.limit || 50,
                offset: query.offset || 0,
            };
        }
        catch (error) {
            throw new Error(`Task 목록 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Task 집계 정보 조회
     */
    static async getTaskAggregation(userId, teamId) {
        try {
            // 팀 멤버 확인
            const isMember = await auth_1.AuthUtils.isTeamMember(userId, teamId);
            if (!isMember) {
                throw new Error('팀 멤버가 아닙니다.');
            }
            const tasksSnapshot = await (0, firebase_admin_1.firestore)()
                .collection('tasks')
                .where('teamId', '==', teamId)
                .get();
            const tasks = tasksSnapshot.docs.map(doc => doc.data());
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(task => task.status === 'DONE').length;
            const overdueTasks = tasks.filter(task => task.dueDate && new Date(task.dueDate) < now && task.status !== 'DONE').length;
            const dueTodayTasks = tasks.filter(task => task.dueDate &&
                new Date(task.dueDate) >= today &&
                new Date(task.dueDate) <
                    new Date(today.getTime() + 24 * 60 * 60 * 1000) &&
                task.status !== 'DONE').length;
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            return {
                teamId,
                totalTasks,
                completedTasks,
                overdueTasks,
                dueTodayTasks,
                completionRate: Math.round(completionRate * 100) / 100,
            };
        }
        catch (error) {
            throw new Error(`Task 집계 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.TaskService = TaskService;
//# sourceMappingURL=taskService.js.map