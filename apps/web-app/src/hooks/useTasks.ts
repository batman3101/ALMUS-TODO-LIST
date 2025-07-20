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
  serverTimestamp,
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

// Task 목록 조회 훅 (실제 Firestore 사용)
export const useTasks = (params?: TaskQueryParams) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async (): Promise<Task[]> => {
      if (!user) throw new Error('인증이 필요합니다.');
      if (!params?.teamId) throw new Error('팀 ID가 필요합니다.');

      try {
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

        // orderBy 제거 - Firestore 인덱스가 필요하므로 임시로 제거
        // q = query(q, orderBy('createdAt', 'desc'));

        if (params.limit) {
          q = query(q, limit(params.limit));
        }

        const snapshot = await getDocs(q);
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          dueDate: doc.data().dueDate?.toDate(),
          startDate: doc.data().startDate?.toDate(),
          endDate: doc.data().endDate?.toDate(),
        })) as Task[];

        // 클라이언트 측에서 생성일 기준 내림차순 정렬
        return tasks.sort((a, b) => {
          const dateA = a.createdAt || new Date(0);
          const dateB = b.createdAt || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      } catch (error) {
        console.error('Firestore 조회 오류:', error);
        // Firestore 오류 시 빈 배열 반환
        return [];
      }
    },
    enabled: !!user && !!params?.teamId,
  });
};

// Task 생성 훅 (실제 Firestore 사용)
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: CreateTaskInput): Promise<Task> => {
      if (!user) throw new Error('인증이 필요합니다.');

      const taskData = {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      };

      const docRef = await addDoc(collection(firestore, 'tasks'), taskData);
      const newDoc = await getDoc(docRef);
      
      return {
        id: docRef.id,
        ...newDoc.data(),
        createdAt: newDoc.data()?.createdAt?.toDate(),
        updatedAt: newDoc.data()?.updatedAt?.toDate(),
        dueDate: newDoc.data()?.dueDate?.toDate(),
      } as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

// Task 업데이트 훅 (실제 Firestore 사용)
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTaskInput }): Promise<void> => {
      const taskRef = doc(firestore, 'tasks', id);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

// Task 삭제 훅 (실제 Firestore 사용)
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const taskRef = doc(firestore, 'tasks', taskId);
      await deleteDoc(taskRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

// Task 상세 조회 훅 (실제 Firestore 사용)
export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async (): Promise<Task | null> => {
      const taskRef = doc(firestore, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        return null;
      }

      return {
        id: taskDoc.id,
        ...taskDoc.data(),
        createdAt: taskDoc.data().createdAt?.toDate(),
        updatedAt: taskDoc.data().updatedAt?.toDate(),
        dueDate: taskDoc.data().dueDate?.toDate(),
      } as Task;
    },
    enabled: !!taskId,
  });
};