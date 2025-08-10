import { lazy } from 'react';

// Heavy modals and components that can be lazy loaded
export const TaskDetailModal = lazy(() => import('./TaskDetailModal'));
export const EditTaskModal = lazy(() => import('./EditTaskModal'));
export const CreateTeamModal = lazy(() => import('./CreateTeamModal'));
export const EditTeamModal = lazy(() => import('./EditTeamModal'));
export const ManageTeamMembersModal = lazy(
  () => import('./ManageTeamMembersModal')
);
export const InviteMemberModal = lazy(() => import('./InviteMemberModal'));

// Collaboration features (heavy components)
export const CollaborativeWorkspace = lazy(
  () => import('./collaboration/CollaborativeWorkspace')
);
export const CommentSystem = lazy(
  () => import('./collaboration/CommentSystem')
);
export const MentionNotifications = lazy(
  () => import('./collaboration/MentionNotifications')
);

// Permission related components
export const ProjectPermissionsPanel = lazy(
  () => import('./permissions/ProjectPermissionsPanel')
);
export const TaskPermissionsPanel = lazy(
  () => import('./permissions/TaskPermissionsPanel')
);

// File handling components
export const FileUpload = lazy(() => import('./FileUpload'));
export const FileList = lazy(() => import('./FileList'));
