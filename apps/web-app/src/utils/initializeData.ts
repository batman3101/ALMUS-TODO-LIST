import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { TaskStatus } from '@almus/shared-types';

export const initializeSampleTasks = async (teamId: string, userId: string) => {
  try {
    // 이미 태스크가 있는지 확인
    const existingTasks = await getDocs(
      query(collection(firestore, 'tasks'), where('teamId', '==', teamId))
    );

    if (existingTasks.docs.length > 0) {
      // Sample tasks already exist
      return;
    }

    // 샘플 태스크 데이터
    const sampleTasks = [
      {
        title: '프로젝트 계획 수립',
        description: '새로운 프로젝트의 전체적인 계획을 수립합니다.',
        assigneeId: userId,
        status: TaskStatus.TODO,
        priority: 'HIGH',
        dueDate: new Date('2025-08-01'),
        teamId: teamId,
        projectId: 'default-project',
        createdAt: new Date('2025-07-15'),
        updatedAt: new Date('2025-07-15'),
        createdBy: userId,
      },
      {
        title: 'UI 디자인 완료',
        description: '사용자 인터페이스 디자인을 완료합니다.',
        assigneeId: userId,
        status: TaskStatus.IN_PROGRESS,
        priority: 'MEDIUM',
        dueDate: new Date('2025-07-25'),
        teamId: teamId,
        projectId: 'default-project',
        createdAt: new Date('2025-07-10'),
        updatedAt: new Date('2025-07-18'),
        createdBy: userId,
      },
      {
        title: '테스트 코드 작성',
        description: '주요 기능에 대한 테스트 코드를 작성합니다.',
        assigneeId: userId,
        status: TaskStatus.DONE,
        priority: 'LOW',
        dueDate: new Date('2025-07-20'),
        teamId: teamId,
        projectId: 'default-project',
        createdAt: new Date('2025-07-05'),
        updatedAt: new Date('2025-07-19'),
        createdBy: userId,
      },
    ];

    // Firestore에 샘플 태스크 추가
    const promises = sampleTasks.map(task =>
      addDoc(collection(firestore, 'tasks'), task)
    );

    await Promise.all(promises);
    // Sample tasks initialized successfully
  } catch (error) {
    // Error initializing sample tasks
  }
};
