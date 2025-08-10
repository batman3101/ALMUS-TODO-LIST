import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateTask, useUpdateTask } from '../hooks/useTasks';
import {
  Task,
  FileMetadata,
  TaskStatus,
  TaskPriority,
} from '@almus/shared-types';
import { FileUpload } from './FileUpload';
import { useAuth } from '../hooks/useAuth';
import { useTeams } from '../hooks/useTeams';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useNotification } from '../contexts/NotificationContext';
import { apiService } from '../services/api';

interface CreateTaskFormProps {
  onTaskCreated?: () => void;
  isModal?: boolean;
  editingTask?: Task | null;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
  onTaskCreated,
  isModal = false,
  editingTask = null,
}) => {
  const { user } = useAuth();
  const { currentTeam, teams } = useTeams();
  const { success, error: showError, warning } = useNotification();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    start_date: undefined as Date | undefined,
    due_date: undefined as Date | undefined,
    team_id: currentTeam?.id || '',
    created_by: user?.uid || '',
    project_id: undefined as string | undefined,
  });

  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const { t } = useTranslation();
  
  // 선택된 팀의 멤버 목록 가져오기
  const { data: teamMembers } = useTeamMembers(formData.team_id || '');
  
  // 디버깅을 위한 로그
  useEffect(() => {
    if (teamMembers) {
      console.log('Team Members:', teamMembers);
    }
    if (user) {
      console.log('Current User:', user);
    }
    if (teams) {
      console.log('Teams:', teams);
    }
    if (formData.team_id) {
      const selectedTeam = teams.find(t => t.id === formData.team_id);
      console.log('Selected Team:', selectedTeam);
      console.log('Owner ID:', selectedTeam?.owner_id);
      console.log('Current User ID:', user?.uid || user?.id);
      console.log('Is Current User Owner:', selectedTeam?.owner_id === (user?.uid || user?.id));
    }
  }, [teamMembers, user, teams, formData.team_id]);

  const isEditing = !!editingTask;

  // 편집 모드일 때 formData 초기화
  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description || '',
        assignee_id: editingTask.assignee_id || editingTask.assigneeId,
        status: editingTask.status,
        priority: editingTask.priority,
        start_date: editingTask.start_date || editingTask.startDate ? new Date(editingTask.start_date || editingTask.startDate) : undefined,
        due_date: editingTask.due_date || editingTask.dueDate ? new Date(editingTask.due_date || editingTask.dueDate) : undefined,
        team_id: editingTask.team_id || editingTask.teamId,
        created_by: user?.uid || '',
        project_id: editingTask.project_id || editingTask.projectId,
      });
    } else if (currentTeam?.id) {
      // 새 태스크 생성 모드
      setFormData(prev => ({
        ...prev,
        team_id: currentTeam.id,
        assignee_id: user?.uid || '', // 기본적으로 자신을 할당자로 설정
        created_by: user?.uid || '',
      }));
    }
  }, [user, currentTeam, editingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form data is validated below

    if (!formData.title?.trim()) {
      showError(t('task.titleRequired'));
      return;
    }

    if (!formData.assignee_id?.trim()) {
      showError(t('task.assigneeRequired'));
      return;
    }

    if (!formData.team_id) {
      showError('팀이 선택되지 않았습니다. 팀을 선택해주세요.');
      return;
    }

    // 시작일과 마감일 유효성 검사
    if (formData.start_date && formData.due_date) {
      if (formData.start_date > formData.due_date) {
        warning('시작일은 마감일보다 이전이어야 합니다.');
        return;
      }
    }

    try {
      if (isEditing && editingTask) {
        // 편집 모드 - 변경된 필드만 포함
        const updateData: any = {};
        
        if (formData.title !== editingTask.title) {
          updateData.title = formData.title;
        }
        if (formData.description !== editingTask.description) {
          updateData.description = formData.description;
        }
        if (formData.assignee_id !== (editingTask.assignee_id || editingTask.assigneeId)) {
          updateData.assignee_id = formData.assignee_id;
        }
        if (formData.status !== editingTask.status) {
          updateData.status = formData.status;
        }
        if (formData.priority !== editingTask.priority) {
          updateData.priority = formData.priority;
        }
        if (formData.project_id !== (editingTask.project_id || editingTask.projectId)) {
          updateData.project_id = formData.project_id || null;
        }
        
        const newStartDate = formData.start_date ? formData.start_date.toISOString() : null;
        const oldStartDate = editingTask.start_date || editingTask.startDate;
        const oldStartDateISO = oldStartDate ? new Date(oldStartDate).toISOString() : null;
        if (newStartDate !== oldStartDateISO) {
          updateData.start_date = newStartDate;
        }
        
        const newDueDate = formData.due_date ? formData.due_date.toISOString() : null;
        const oldDueDate = editingTask.due_date || editingTask.dueDate;
        const oldDueDateISO = oldDueDate ? new Date(oldDueDate).toISOString() : null;
        if (newDueDate !== oldDueDateISO) {
          updateData.due_date = newDueDate;
          updateData.end_date = newDueDate; // end_date도 함께 업데이트
        }
        console.log('About to update task:', editingTask.id, updateData);
        await updateTaskMutation.mutateAsync({
          id: editingTask.id,
          updates: updateData,
        });
        success('태스크가 성공적으로 수정되었습니다.');
      } else {
        // 생성 모드
        const createData = {
          title: formData.title,
          description: formData.description || null,
          assignee_id: formData.assignee_id || null,
          status: formData.status,
          priority: formData.priority,
          team_id: formData.team_id,
          created_by: formData.created_by,
          project_id: formData.project_id || null,
          start_date: formData.start_date ? formData.start_date.toISOString() : null,
          due_date: formData.due_date ? formData.due_date.toISOString() : null,
        };
        
        console.log('태스크 생성 데이터:', createData);
        console.log('Status:', formData.status, 'Priority:', formData.priority);
        const newTask = await createTaskMutation.mutateAsync(createData);
        
        // 업로드된 파일들을 새로 생성된 태스크와 연결
        if (uploadedFiles.length > 0 && newTask) {
          try {
            // 파일 메타데이터 업데이트 - task_id 연결
            const updatePromises = uploadedFiles.map(file => 
              apiService.updateFileMetadata(file.id, { task_id: newTask.id })
            );
            await Promise.all(updatePromises);
          } catch (fileUpdateError) {
            console.error('파일 메타데이터 업데이트 실패:', fileUpdateError);
            // 파일 연결 실패해도 태스크 생성은 성공으로 처리
          }
        }
        setFormData({
          title: '',
          description: '',
          assignee_id: '',
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          start_date: undefined,
          due_date: undefined,
          team_id: currentTeam?.id || '',
          created_by: user?.uid || '',
          project_id: undefined,
        });
        setUploadedFiles([]); // 업로드된 파일 목록 초기화
        success(t('task.taskCreated'));
      }
      onTaskCreated?.();
    } catch (error) {
      // Error is already handled by the mutation
      showError(
        isEditing ? '태스크 수정에 실패했습니다.' : t('task.taskCreateFailed')
      );
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | Date | undefined | TaskStatus | TaskPriority
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUploadComplete = (result: { metadata: FileMetadata } | FileMetadata[]) => {
    if (Array.isArray(result)) {
      // 다중 파일 업로드 결과
      setUploadedFiles(prev => [...prev, ...result]);
    } else if (result.metadata) {
      // 단일 파일 업로드 결과
      setUploadedFiles(prev => [...prev, result.metadata]);
    }
  };

  const handleFileUploadError = (error: string) => {
    // 파일 업로드 에러는 이미 FileUpload 컴포넌트에서 토스트로 표시됨
    console.error('파일 업로드 실패:', error);
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return t('status.todo');
      case TaskStatus.IN_PROGRESS:
        return t('status.inProgress');
      case TaskStatus.REVIEW:
        return t('status.review');
      case TaskStatus.DONE:
        return t('status.done');
      default:
        return t('status.todo');
    }
  };

  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return t('priority.low');
      case TaskPriority.MEDIUM:
        return t('priority.medium');
      case TaskPriority.HIGH:
        return t('priority.high');
      case TaskPriority.URGENT:
        return t('priority.urgent');
      default:
        return t('priority.medium');
    }
  };

  // TaskStatus enum 값들을 배열로 변환
  const taskStatusOptions = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.REVIEW,
    TaskStatus.DONE,
  ] as const;

  // TaskPriority enum 값들을 배열로 변환
  const taskPriorityOptions = [
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT,
  ] as const;

  // 공통 input 스타일
  const inputClassName = `
    w-full px-3 py-2 
    border border-gray-300 dark:border-dark-300 
    bg-white dark:bg-dark-50
    text-gray-900 dark:text-dark-900
    placeholder-gray-500 dark:placeholder-dark-500
    rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
    transition-colors duration-200
  `;

  const labelClassName =
    'block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1';

  return (
    <div
      className={
        isModal
          ? ''
          : 'bg-white dark:bg-dark-100 rounded-lg shadow-md dark:shadow-lg p-6 transition-colors duration-200'
      }
    >
      {!isModal && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">
          {isEditing ? '태스크 편집' : t('task.createTask')}
        </h2>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className={labelClassName}>
            {t('task.title')} *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={e => handleInputChange('title', e.target.value)}
            className={inputClassName}
            placeholder={t('task.title')}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClassName}>
            {t('task.description')}
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={e => handleInputChange('description', e.target.value)}
            rows={3}
            className={inputClassName}
            placeholder={t('task.description')}
          />
        </div>

        <div>
          <label htmlFor="team" className={labelClassName}>
            {t('team.selectTeam')} *
          </label>
          <select
            id="team"
            value={formData.team_id}
            onChange={e => handleInputChange('team_id', e.target.value)}
            className={inputClassName}
          >
            <option value="">{t('team.selectTeamPlaceholder')}</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assignee" className={labelClassName}>
            {t('task.assignee')} *
          </label>
          <select
            id="assignee"
            value={formData.assignee_id}
            onChange={e => handleInputChange('assignee_id', e.target.value)}
            className={inputClassName}
          >
            <option value="">{t('task.selectAssigneePlaceholder')}</option>
            {!formData.team_id && <option disabled>{t('task.selectTeamFirst')}</option>}
            {formData.team_id && (() => {
              const selectedTeam = teams.find(t => t.id === formData.team_id);
              const ownerId = selectedTeam?.owner_id;
              const currentUserId = user?.uid || user?.id;
              const isCurrentUserOwner = ownerId === currentUserId;
              
              // 모든 가능한 담당자 목록 생성
              const assigneeOptions = [];
              
              // 1. 현재 사용자 추가
              if (currentUserId) {
                const currentUserLabel = isCurrentUserOwner 
                  ? `${user?.displayName || user?.name || user?.email || t('common.me')} (${t('team.owner')})`
                  : `${user?.displayName || user?.name || user?.email || t('common.me')} (${t('common.currentUser')})`;
                
                assigneeOptions.push(
                  <option key={currentUserId} value={currentUserId}>
                    {currentUserLabel}
                  </option>
                );
              }
              
              // 2. 소유자 추가 (현재 사용자가 아닌 경우)
              if (ownerId && !isCurrentUserOwner) {
                // 팀 멤버에서 소유자 정보 찾기
                const ownerMember = teamMembers?.find(member => member.user_id === ownerId);
                const ownerName = ownerMember?.user?.name || ownerMember?.user?.email || '팀 소유자';
                
                assigneeOptions.push(
                  <option key={ownerId} value={ownerId}>
                    {ownerName} (팀 소유자)
                  </option>
                );
              }
              
              // 3. 다른 팀 멤버들 추가
              teamMembers?.forEach(member => {
                const memberId = member.user_id;
                
                // 현재 사용자와 소유자는 이미 추가했으므로 제외
                if (memberId !== currentUserId && memberId !== ownerId) {
                  assigneeOptions.push(
                    <option key={memberId} value={memberId}>
                      {member.user?.name || member.user?.email || `사용자 ${memberId}`}
                    </option>
                  );
                }
              });
              
              return assigneeOptions;
            })()}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className={labelClassName}>
              {t('task.status')}
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={e =>
                handleInputChange('status', e.target.value as TaskStatus)
              }
              className={inputClassName}
            >
              {taskStatusOptions.map(status => (
                <option key={status} value={status}>
                  {getStatusText(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className={labelClassName}>
              {t('task.priority')}
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={e =>
                handleInputChange('priority', e.target.value as TaskPriority)
              }
              className={inputClassName}
            >
              {taskPriorityOptions.map(priority => (
                <option key={priority} value={priority}>
                  {getPriorityText(priority)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className={labelClassName}>
              {t('task.startDate')}
            </label>
            <input
              type="date"
              id="startDate"
              value={
                formData.start_date
                  ? new Date(formData.start_date).toISOString().split('T')[0]
                  : ''
              }
              onChange={e =>
                handleInputChange(
                  'start_date',
                  e.target.value ? new Date(e.target.value) : undefined
                )
              }
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="dueDate" className={labelClassName}>
              {t('task.dueDate')}
            </label>
            <input
              type="date"
              id="dueDate"
              value={
                formData.due_date
                  ? new Date(formData.due_date).toISOString().split('T')[0]
                  : ''
              }
              onChange={e =>
                handleInputChange(
                  'due_date',
                  e.target.value ? new Date(e.target.value) : undefined
                )
              }
              className={inputClassName}
            />
          </div>
        </div>

        {/* 파일 업로드 섹션 */}
        <div>
          <label className={labelClassName}>{t('task.attachments')}</label>
          <FileUpload
            path="tasks"
            metadata={{
              uploaderId: user?.uid || '',
              uploaderName: user?.displayName || user?.email || 'Unknown',
              teamId: currentTeam?.id || '',
            }}
            onUploadComplete={handleFileUploadComplete}
            onUploadError={handleFileUploadError}
            multiple={true}
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
            maxFiles={5}
            className="mt-2"
          />
        </div>

        {/* 업로드된 파일 목록 */}
        {uploadedFiles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
              업로드된 파일:
            </h4>
            <ul className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-600 dark:text-dark-600"
                >
                  ✓ {file.name} ({Math.round(file.size / 1024)}KB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              createTaskMutation.isPending || updateTaskMutation.isPending
            }
            className="
              px-4 py-2 
              bg-primary-600 hover:bg-primary-700 
              text-white rounded-md 
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              dark:focus:ring-offset-dark-100
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            {createTaskMutation.isPending || updateTaskMutation.isPending
              ? t('common.loading')
              : isEditing
                ? '수정'
                : t('task.createTask')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTaskForm;
