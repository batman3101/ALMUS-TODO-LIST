// 새로운 통합 useTeams 훅을 기본으로 export
export { useTeams } from './useTeamsContext';

// API 서비스에서 개별 훅들도 export (필요한 경우 사용)
export { 
  useTeams as useTeamsQuery,
  useTeam,
  useCreateTeam 
} from './useApiService';