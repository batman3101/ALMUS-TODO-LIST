import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || 'https://plbjsfmrneeyucqrmill.supabase.co';
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYmpzZm1ybmVleXVjcXJtaWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzY0MDcsImV4cCI6MjA2OTgxMjQwN30.kRcNQti7hsq_aKuLtNaF9UodJE9JGbW84RKOdgnmLTw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateTeamOwners() {
  console.log('Starting team owners migration...');

  try {
    // 모든 팀 가져오기
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, owner_id')
      .eq('is_active', true);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return;
    }

    console.log(`Found ${teams?.length || 0} teams to process`);

    for (const team of teams || []) {
      console.log(`Processing team: ${team.name} (${team.id})`);

      // 해당 팀의 멤버 확인
      const { data: existingMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id)
        .eq('user_id', team.owner_id);

      if (membersError) {
        console.error(
          `Error checking members for team ${team.id}:`,
          membersError
        );
        continue;
      }

      // 오너가 멤버로 등록되어 있지 않으면 추가
      if (!existingMembers || existingMembers.length === 0) {
        const { error: insertError } = await supabase
          .from('team_members')
          .insert({
            team_id: team.id,
            user_id: team.owner_id,
            role: 'OWNER',
            status: 'ACTIVE',
            joined_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(
            `Error adding owner as member for team ${team.id}:`,
            insertError
          );
        } else {
          console.log(`✓ Added owner as member for team: ${team.name}`);
        }
      } else {
        console.log(`- Owner already a member of team: ${team.name}`);
      }
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// 실행
migrateTeamOwners();
