// Re-export from the new unified API service
export { useTeams, useTeam, useCreateTeam } from './useApiService';

// Legacy compatibility exports
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { Team } from '@almus/shared-types';

// Legacy hook for backward compatibility
export const useCurrentTeam = () => {
  const { user } = useAuth();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  // This would normally be stored in localStorage or context
  useEffect(() => {
    if (user) {
      const savedTeamId = localStorage.getItem(`currentTeam-${user.id}`);
      if (savedTeamId) {
        // Load team from API
        // This is a simplified version - in reality you'd use the API service
        setCurrentTeam({ id: savedTeamId } as Team);
      }
    }
  }, [user]);

  const switchTeam = (team: Team) => {
    setCurrentTeam(team);
    if (user) {
      localStorage.setItem(`currentTeam-${user.id}`, team.id);
    }
  };

  return {
    currentTeam,
    switchTeam,
  };
};
