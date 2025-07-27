// Re-export from the new unified API service
export { useProjects, useCreateProject } from './useApiService';

// Legacy compatibility
import { ProjectFilters } from '@almus/shared-types';
export interface ProjectQueryParams extends ProjectFilters {
  teamId?: string;
  limit?: number;
}
