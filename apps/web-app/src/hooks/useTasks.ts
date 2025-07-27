// Re-export from the new unified API service
export {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  QUERY_KEYS,
} from './useApiService';

// Legacy compatibility - keeping the old interface for backward compatibility
import { TaskFilters } from '../services/api';
export interface TaskQueryParams extends TaskFilters {
  teamId?: string;
  limit?: number;
}
