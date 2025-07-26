import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStatus,
  ProjectPriority,
  FIRESTORE_COLLECTIONS,
} from '../types/team';
import { toast } from '../utils/toast';

export const useProjects = (teamId?: string) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 프로젝트 목록 로드
  useEffect(() => {
    if (!user || !teamId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const projectsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.PROJECTS),
      where('teamId', '==', teamId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      projectsQuery,
      snapshot => {
        const projectsData = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            teamId: data.teamId,
            ownerId: data.ownerId,
            status: data.status,
            priority: data.priority,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            budget: data.budget,
            tags: data.tags || [],
            memberCount: data.memberCount || 0,
            taskCount: data.taskCount || 0,
            completedTaskCount: data.completedTaskCount || 0,
            progress: data.progress || 0,
            isActive: data.isActive,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as Project;
        });
        setProjects(projectsData);
        setLoading(false);
        setError(null);
      },
      error => {
        console.error('프로젝트 로드 실패:', error);
        setError('프로젝트를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, teamId]);

  // 프로젝트 생성
  const createProject = async (input: CreateProjectInput): Promise<Project> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const now = Timestamp.now();
      const projectRef = doc(collection(db, FIRESTORE_COLLECTIONS.PROJECTS));

      const projectData = {
        id: projectRef.id,
        name: input.name,
        description: input.description || '',
        teamId: input.teamId,
        ownerId: user.id,
        status: input.status || ProjectStatus.PLANNING,
        priority: input.priority || ProjectPriority.MEDIUM,
        startDate: input.startDate ? Timestamp.fromDate(input.startDate) : null,
        endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
        budget: input.budget || 0,
        tags: input.tags || [],
        memberCount: 1, // 생성자 포함
        taskCount: 0,
        completedTaskCount: 0,
        progress: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, FIRESTORE_COLLECTIONS.PROJECTS), projectData);

      const createdProject: Project = {
        id: projectRef.id,
        name: projectData.name,
        description: projectData.description,
        teamId: projectData.teamId,
        ownerId: projectData.ownerId,
        status: projectData.status,
        priority: projectData.priority,
        startDate: projectData.startDate?.toDate(),
        endDate: projectData.endDate?.toDate(),
        budget: projectData.budget,
        tags: projectData.tags,
        memberCount: projectData.memberCount,
        taskCount: projectData.taskCount,
        completedTaskCount: projectData.completedTaskCount,
        progress: projectData.progress,
        isActive: projectData.isActive,
        createdAt: projectData.createdAt.toDate(),
        updatedAt: projectData.updatedAt.toDate(),
      };

      toast.success(`프로젝트 "${input.name}"이 생성되었습니다.`);
      return createdProject;
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      toast.error('프로젝트 생성에 실패했습니다.');
      throw error;
    }
  };

  // 프로젝트 업데이트
  const updateProject = async (input: UpdateProjectInput): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const projectRef = doc(db, FIRESTORE_COLLECTIONS.PROJECTS, input.id);
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.startDate !== undefined) {
        updateData.startDate = input.startDate
          ? Timestamp.fromDate(input.startDate)
          : null;
      }
      if (input.endDate !== undefined) {
        updateData.endDate = input.endDate
          ? Timestamp.fromDate(input.endDate)
          : null;
      }
      if (input.budget !== undefined) updateData.budget = input.budget;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await updateDoc(projectRef, updateData);
      toast.success('프로젝트가 업데이트되었습니다.');
    } catch (error) {
      console.error('프로젝트 업데이트 실패:', error);
      toast.error('프로젝트 업데이트에 실패했습니다.');
      throw error;
    }
  };

  // 프로젝트 삭제 (소프트 삭제)
  const deleteProject = async (projectId: string): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const projectRef = doc(db, FIRESTORE_COLLECTIONS.PROJECTS, projectId);
      await updateDoc(projectRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      toast.success('프로젝트가 삭제되었습니다.');
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      toast.error('프로젝트 삭제에 실패했습니다.');
      throw error;
    }
  };

  // 프로젝트 진행률 업데이트
  const updateProjectProgress = async (
    projectId: string,
    progress: number
  ): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const projectRef = doc(db, FIRESTORE_COLLECTIONS.PROJECTS, projectId);
      await updateDoc(projectRef, {
        progress: Math.max(0, Math.min(100, progress)), // 0-100 범위로 제한
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('프로젝트 진행률 업데이트 실패:', error);
      throw error;
    }
  };

  // 프로젝트 상태별 필터링
  const getProjectsByStatus = (status: ProjectStatus): Project[] => {
    return projects.filter(project => project.status === status);
  };

  // 프로젝트 우선순위별 필터링
  const getProjectsByPriority = (priority: ProjectPriority): Project[] => {
    return projects.filter(project => project.priority === priority);
  };

  // 프로젝트 검색
  const searchProjects = (searchTerm: string): Project[] => {
    const term = searchTerm.toLowerCase();
    return projects.filter(
      project =>
        project.name.toLowerCase().includes(term) ||
        project.description?.toLowerCase().includes(term) ||
        project.tags.some(tag => tag.toLowerCase().includes(term))
    );
  };

  // 사용자가 소유한 프로젝트
  const getOwnedProjects = (): Project[] => {
    if (!user) return [];
    return projects.filter(project => project.ownerId === user.id);
  };

  // 프로젝트 통계
  const getProjectStats = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      p => p.status === ProjectStatus.ACTIVE
    ).length;
    const completedProjects = projects.filter(
      p => p.status === ProjectStatus.COMPLETED
    ).length;
    const onHoldProjects = projects.filter(
      p => p.status === ProjectStatus.ON_HOLD
    ).length;
    const averageProgress =
      totalProjects > 0
        ? projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects
        : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      averageProgress: Math.round(averageProgress),
    };
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    updateProjectProgress,
    getProjectsByStatus,
    getProjectsByPriority,
    searchProjects,
    getOwnedProjects,
    getProjectStats,
  };
};
