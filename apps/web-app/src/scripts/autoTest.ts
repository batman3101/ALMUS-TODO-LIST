import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Single test task for validation
const testTask = {
  title: 'Auto Test Task',
  description: 'This task was created by the auto test script',
  status: 'TODO' as const,
  priority: 'HIGH' as const,
  due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  estimated_hours: 2,
  tags: ['test', 'automation']
};

async function autoTest() {
  try {
    console.log('🤖 Starting Automated Test...\n');
    
    // Test authentication status
    console.log('1️⃣ Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('   ❌ No authenticated user found');
      console.log('   💡 Please log in through the web interface first');
      console.log('   📖 Open http://localhost:3009 and log in');
      return false;
    }
    
    console.log(`   ✅ User authenticated: ${user.email}`);
    const userId = user.id;

    // Get or create test team
    console.log('\n2️⃣ Checking for test team...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', userId)
      .limit(1);

    if (teamsError) {
      console.error('   ❌ Failed to fetch teams:', teamsError.message);
      return false;
    }

    let teamId;
    if (teams && teams.length > 0) {
      teamId = teams[0].id;
      console.log(`   ✅ Using existing team: ${teams[0].name}`);
    } else {
      console.log('   📝 Creating new test team...');
      const { data: newTeam, error: createTeamError } = await supabase
        .from('teams')
        .insert({
          name: 'Auto Test Team',
          description: 'Automatically created team for testing',
          owner_id: userId,
          is_active: true
        })
        .select()
        .single();

      if (createTeamError) {
        console.error('   ❌ Failed to create team:', createTeamError.message);
        return false;
      }

      teamId = newTeam.id;
      console.log('   ✅ Created new team: Auto Test Team');

      // Add owner as team member
      await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        role: 'OWNER',
        is_active: true
      });
    }

    // Create test project
    console.log('\n3️⃣ Creating test project...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'Auto Test Project',
        description: 'Project for automated testing',
        status: 'ACTIVE',
        team_id: teamId,
        owner_id: userId
      })
      .select()
      .single();

    if (projectError) {
      console.error('   ❌ Failed to create project:', projectError.message);
      return false;
    }

    console.log('   ✅ Created test project');

    // Test task creation
    console.log('\n4️⃣ Testing task creation...');
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        ...testTask,
        team_id: teamId,
        project_id: project.id,
        assignee_id: userId,
        created_by: userId
      })
      .select('*')
      .single();

    if (taskError) {
      console.error('   ❌ Task creation failed:', taskError.message);
      console.error('   🔍 Error details:', taskError);
      return false;
    }

    console.log('   ✅ Task created successfully');

    // Test task update
    console.log('\n5️⃣ Testing task update...');
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        status: 'IN_PROGRESS',
        actual_hours: 1
      })
      .eq('id', newTask.id);

    if (updateError) {
      console.error('   ❌ Task update failed:', updateError.message);
      return false;
    }

    console.log('   ✅ Task updated successfully');

    // Test task deletion
    console.log('\n6️⃣ Testing task deletion...');
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', newTask.id);

    if (deleteError) {
      console.error('   ❌ Task deletion failed:', deleteError.message);
      return false;
    }

    console.log('   ✅ Task deleted successfully');

    // Clean up test project
    await supabase.from('projects').delete().eq('id', project.id);
    console.log('   🗑️  Test project cleaned up');

    // Final summary
    console.log('\n🎉 Automated Test Results:');
    console.log('===========================');
    console.log('✅ Authentication: PASSED');
    console.log('✅ Team Management: PASSED');
    console.log('✅ Project Creation: PASSED');
    console.log('✅ Task Creation: PASSED');
    console.log('✅ Task Update: PASSED');
    console.log('✅ Task Deletion: PASSED');
    console.log('===========================');
    console.log('🚀 ALL TESTS PASSED!');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Run "npm run test:data" for full test data creation');
    console.log('2. Test the UI manually at http://localhost:3009');
    console.log('3. Verify team switching and task filtering work correctly');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the test
autoTest();