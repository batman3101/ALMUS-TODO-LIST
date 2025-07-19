import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { useAuth } from './useAuth';
import {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
} from '@almus/shared-types';

export interface TaskQueryParams {
  teamId: string;
  projectId?: string;
  status?: TaskStatus;
  assigneeId?: string;
  limit?: number;
}

// Task 목록 조회 훅
export const useTasks = (params?: TaskQueryParams) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async (): Promise<Task[]> => {
      if (!user) throw new Error('인증이 필요합니다.');
      if (!params?.teamId) throw new Error('팀 ID가 필요합니다.');

      let q = query(
        collection(firestore, 'tasks'),
        where('teamId', '==', params.teamId)
      );

      if (params.projectId) {
        q = query(q, where('projectId', '==', params.projectId));
      }

      if (params.status) {
        q = query(q, where('status', '==', params.status));
      }

      if (params.assigneeId) {
        q = query(q, where('assigneeId', '==', params.assigneeId));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      if (params.limit) {
        q = query(q, limit(params.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        dueDate: doc.data().dueDate?.toDate(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
      })) as Task[];
    },
    enabled: !!user && !!params?.teamId,
  });
};

// 실시간 Task 목록 조회 훅
export const useTasksRealtime = (params: TaskQueryParams) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['tasks-realtime', params],
    queryFn: async (): Promise<Task[]> => {
      if (!user) throw new Error('인증이 필요합니다.');

      return new Promise((resolve, reject) => {
        let q = query(
          collection(firestore, 'tasks'),
          where('teamId', '==', params.teamId)
        );

        if (params.projectId) {
          q = query(q, where('projectId', '==', params.projectId));
        }

        if (params.status) {
          q = query(q, where('status', '==', params.status));
        }

        if (params.assigneeId) {
          q = query(q, where('assigneeId', '==', params.assigneeId));
        }

        q = query(q, orderBy('createdAt', 'desc'));

        if (params.limit) {
          q = query(q, limit(params.limit));
        }

        const unsubscribe = onSnapshot(
          q,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const tasks = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate(),
              updatedAt: doc.data().updatedAt?.toDate(),
              dueDate: doc.data().dueDate?.toDate(),
              startDate: doc.data().startDate?.toDate(),
              endDate: doc.data().endDate?.toDate(),
            })) as Task[];

            queryClient.setQueryData(['tasks-realtime', params], tasks);
            resolve(tasks);
          },
          error => {
            reject(error);
          }
        );

        // Cleanup function
        return () => unsubscribe();
      });
    },
    enabled: !!user && !!params.teamId,
  });
};

// 단일 Task 조회 훅
export const useTask = (taskId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async (): Promise<Task> => {
      if (!user) throw new Error('인증이 필요합니다.');

      const docRef = doc(firestore, 'tasks', taskId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Task를 찾을 수 없습니다.');
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        dueDate: data.dueDate?.toDate(),
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
      } as Task;
    },
    enabled: !!user && !!taskId,
  });
};

// Task 생성 훅
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskData: CreateTaskInput): Promise<Task> => {
      if (!user) throw new Error('인증이 필요합니다.');

      const docRef = await addDoc(collection(firestore, 'tasks'), {
        ...taskData,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      const newTask = {
        id: docRef.id,
        ...taskData,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as Task;

      return newTask;
    },
    onSuccess: newTask => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-realtime'] });

      // 새 Task를 캐시에 추가
      queryClient.setQueryData(['task', newTask.id], newTask);
    },
    onError: error => {
      console.error('Task 생성 오류:', error);
    },
  });
};

// Task 수정 훅
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      updateData,
    }: {
      taskId: string;
      updateData: UpdateTaskInput;
    }): Promise<Task> => {
      if (!user) throw new Error('인증이 필요합니다.');

      const docRef = doc(firestore, 'tasks', taskId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Task를 찾을 수 없습니다.');
      }

      const currentData = docSnap.data();
      const newVersion = (currentData.version || 0) + 1;

      const updatedData = {
        ...updateData,
        updatedAt: new Date(),
        version: newVersion,
      };

      await updateDoc(docRef, updatedData);

      const updatedTask = {
        ...currentData,
        ...updatedData,
        createdAt: currentData.createdAt?.toDate(),
        updatedAt: new Date(),
        dueDate: currentData.dueDate?.toDate(),
        startDate: currentData.startDate?.toDate(),
        endDate: currentData.endDate?.toDate(),
      } as Task;

      return updatedTask;
    },
    onSuccess: updatedTask => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-realtime'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });

      // 업데이트된 Task를 캐시에 반영
      queryClient.setQueryData(['task', updatedTask.id], updatedTask);
    },
    onError: error => {
      console.error('Task 수정 오류:', error);
    },
  });
};

// Task 삭제 훅
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      if (!user) throw new Error('인증이 필요합니다.');

      const docRef = doc(firestore, 'tasks', taskId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Task를 찾을 수 없습니다.');
      }

      const taskData = docSnap.data();

      // 권한 확인 (작성자 또는 팀 관리자만 삭제 가능)
      if (taskData.createdBy !== user.uid && user.role !== 'ADMIN') {
        throw new Error('Task를 삭제할 권한이 없습니다.');
      }

      await deleteDoc(docRef);
    },
    onSuccess: (_, taskId) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-realtime'] });

      // 삭제된 Task를 캐시에서 제거
      queryClient.removeQueries({ queryKey: ['task', taskId] });
    },
    onError: error => {
      console.error('Task 삭제 오류:', error);
    },
  });
};

// Task 집계 훅
export const useTaskAggregation = (teamId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['task-aggregation', teamId],
    queryFn: async () => {
      if (!user) throw new Error('인증이 필요합니다.');

      const q = query(
        collection(firestore, 'tasks'),
        where('teamId', '==', teamId)
      );

      const snapshot = await getDocs(q);
      const tasks = snapshot.docs.map(doc => doc.data());

      return {
        total: tasks.length,
        byStatus: {
          TODO: tasks.filter((task: any) => task.status === 'TODO').length,
          IN_PROGRESS: tasks.filter(
            (task: any) => task.status === 'IN_PROGRESS'
          ).length,
          REVIEW: tasks.filter((task: any) => task.status === 'REVIEW').length,
          DONE: tasks.filter((task: any) => task.status === 'DONE').length,
        },
        byPriority: {
          LOW: tasks.filter((task: any) => task.priority === 'LOW').length,
          MEDIUM: tasks.filter((task: any) => task.priority === 'MEDIUM')
            .length,
          HIGH: tasks.filter((task: any) => task.priority === 'HIGH').length,
          URGENT: tasks.filter((task: any) => task.priority === 'URGENT')
            .length,
        },
        overdue: tasks.filter((task: any) => {
          if (!task.dueDate) return false;
          return (
            new Date(task.dueDate.toDate()) < new Date() &&
            task.status !== 'DONE'
          );
        }).length,
      };
    },
    enabled: !!user && !!teamId,
  });
};
