// 임시 간단한 팀 조회 테스트
import { supabase } from '@/lib/supabase-client';

export const getTeamsSimple = async (userId) => {
  console.log('Getting teams for user:', userId);
  
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, description, owner_id, created_at')
      .eq('owner_id', userId);
      
    if (error) {
      console.error('Teams query error:', error);
      return { data: [], error };
    }
    
    console.log('Teams found:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Teams query exception:', err);
    return { data: [], error: err };
  }
};

// 브라우저 Console에서 테스트
window.getTeamsSimple = getTeamsSimple;