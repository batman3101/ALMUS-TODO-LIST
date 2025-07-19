import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
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
  startAfter,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { useAuth } from './useAuth';
import {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  UpdateTaskInput,
} from '@almus/shared-types';

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  projectId?: string;
  search?: string;
}

const PAGE_SIZE = 20;

export const useTasksOptimized = (filters: TaskFilters = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 무한 스크롤을 위한 Task 목록 조회
  const {
    data: tasksData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['tasks', 'infinite', filters],
    initialPageParam: null as any,
    queryFn: async ({ pageParam = null }) => {
      if (!user?.teamId) throw new Error('팀 정보가 없습니다.');

      let q = query(
        collection(firestore, 'tasks'),
        where('teamId', '==', user.teamId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      // 필터 적용
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.priority) {
        q = query(q, where('priority', '==', filters.priority));
      }
      if (filters.assigneeId) {
        q = query(q, where('assigneeId', '==', filters.assigneeId));
      }
      if (filters.projectId) {
        q = query(q, where('projectId', '==', filters.projectId));
      }

      // 페이지네이션
      if (pageParam) {
        q = query(q, startAfter(pageParam));
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

      // 검색 필터링 (클라이언트 사이드)
      let filteredTasks = tasks;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTasks = tasks.filter(
          task =>
            task.title.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower)
        );
      }

      return {
        tasks: filteredTasks,
        nextCursor: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === PAGE_SIZE,
      };
    },
    getNextPageParam: lastPage => lastPage.nextCursor,
    enabled: !!user?.teamId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });

  // 모든 Task를 평면화
  const allTasks = tasksData?.pages.flatMap(page => page.tasks) || [];

  // Task 생성
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: CreateTaskInput) => {
      if (!user?.teamId) throw new Error('팀 정보가 없습니다.');

      const task = {
        ...taskData,
        teamId: user.teamId,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const docRef = await addDoc(collection(firestore, 'tasks'), task);
      return { id: docRef.id, ...task };
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Task 업데이트
  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskInput;
    }) => {
      const taskRef = doc(firestore, 'tasks', taskId);
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await updateDoc(taskRef, updateData);
      return { ...updateData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Task 삭제
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const taskRef = doc(firestore, 'tasks', taskId);
      await deleteDoc(taskRef);
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // 단일 Task 조회 (캐시 최적화)
  const useTask = (taskId: string) => {
    return useQuery({
      queryKey: ['task', taskId],
      queryFn: async () => {
        const taskDoc = await getDoc(doc(firestore, 'tasks', taskId));
        if (!taskDoc.exists()) {
          throw new Error('Task를 찾을 수 없습니다.');
        }

        const data = taskDoc.data();
        return {
          id: taskDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          dueDate: data.dueDate?.toDate(),
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
        } as Task;
      },
      enabled: !!taskId,
      staleTime: 2 * 60 * 1000, // 2분
      gcTime: 5 * 60 * 1000, // 5분
    });
  };

  // Task 통계 (캐시 최적화)
  const useTaskStats = () => {
    return useQuery({
      queryKey: ['taskStats', user?.teamId],
      queryFn: async () => {
        if (!user?.teamId) throw new Error('팀 정보가 없습니다.');

        const stats = {
          total: 0,
          todo: 0,
          inProgress: 0,
          review: 0,
          done: 0,
          overdue: 0,
        };

        // 각 상태별 개수 조회
        const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
        const promises = statuses.map(async status => {
          const q = query(
            collection(firestore, 'tasks'),
            where('teamId', '==', user.teamId),
            where('status', '==', status)
          );
          const snapshot = await getDocs(q);
          return { status, count: snapshot.size };
        });

        const results = await Promise.all(promises);

        // 통계 계산
        results.forEach(({ status, count }) => {
          stats.total += count;
          switch (status) {
            case 'TODO':
              stats.todo = count;
              break;
            case 'IN_PROGRESS':
              stats.inProgress = count;
              break;
            case 'REVIEW':
              stats.review = count;
              break;
            case 'DONE':
              stats.done = count;
              break;
          }
        });

        // 지연된 Task 개수 계산
        const overdueQuery = query(
          collection(firestore, 'tasks'),
          where('teamId', '==', user.teamId),
          where('status', '!=', 'DONE')
        );
        const overdueSnapshot = await getDocs(overdueQuery);
        stats.overdue = overdueSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.dueDate && data.dueDate.toDate() < new Date();
        }).length;

        return stats;
      },
      enabled: !!user?.teamId,
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분
    });
  };

  return {
    tasks: allTasks,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    useTask,
    useTaskStats,
  };
};
