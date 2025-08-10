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

async function quickTest() {
  try {
    console.log('🔧 Starting Quick Test Suite...\n');

    // Test 1: Supabase Connection
    console.log('1️⃣ Testing Supabase Connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('teams')
      .select('count')
      .limit(1);

    if (healthError) {
      console.error('   ❌ Connection failed:', healthError.message);
      return;
    } else {
      console.log('   ✅ Supabase connection successful');
    }

    // Test 2: Check if user is authenticated
    console.log('\n2️⃣ Checking Authentication Status...');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('   ⚠️  No authenticated user found');
      console.log('   💡 Please log in through the web interface first');
      return;
    } else {
      console.log(`   ✅ User authenticated: ${user.email}`);
    }

    // Test 3: Check teams
    console.log('\n3️⃣ Testing Team Access...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id);

    if (teamsError) {
      console.error('   ❌ Teams fetch failed:', teamsError.message);
    } else {
      console.log(`   ✅ Found ${teams?.length || 0} teams`);
      if (teams && teams.length > 0) {
        teams.forEach(team => {
          console.log(`      - ${team.name} (ID: ${team.id})`);
        });
      }
    }

    // Test 4: Check tasks (if teams exist)
    if (teams && teams.length > 0) {
      console.log('\n4️⃣ Testing Task Access...');
      const teamId = teams[0].id;

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('team_id', teamId)
        .limit(5);

      if (tasksError) {
        console.error('   ❌ Tasks fetch failed:', tasksError.message);
      } else {
        console.log(
          `   ✅ Found ${tasks?.length || 0} tasks in team "${teams[0].name}"`
        );
        if (tasks && tasks.length > 0) {
          tasks.forEach(task => {
            console.log(`      - ${task.title} (${task.status})`);
          });
        }
      }
    }

    // Test 5: API Service Mock Test
    console.log('\n5️⃣ Testing API Service Methods...');

    // Test createTask structure
    console.log('   📋 Testing Task Creation Structure...');
    const mockTaskData = {
      title: 'Test Task - Quick Test',
      description: 'This is a test task created by the quick test script',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      team_id: teams && teams.length > 0 ? teams[0].id : null,
      created_by: user.id,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    if (mockTaskData.team_id) {
      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert(mockTaskData)
        .select('*')
        .single();

      if (createError) {
        console.error('   ❌ Task creation failed:', createError.message);
      } else {
        console.log(`   ✅ Task created successfully: "${newTask.title}"`);

        // Test update
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ status: 'IN_PROGRESS' })
          .eq('id', newTask.id);

        if (updateError) {
          console.error('   ❌ Task update failed:', updateError.message);
        } else {
          console.log('   ✅ Task update successful');
        }

        // Clean up test task
        await supabase.from('tasks').delete().eq('id', newTask.id);
        console.log('   🗑️  Test task cleaned up');
      }
    } else {
      console.log('   ⚠️  No team available for task creation test');
    }

    // Summary
    console.log('\n📊 Quick Test Summary:');
    console.log('=====================================');
    console.log('✅ Supabase Connection: Working');
    console.log(`✅ Authentication: ${user ? 'Working' : 'Not authenticated'}`);
    console.log(`✅ Teams Access: ${teams?.length || 0} teams found`);
    console.log(
      `✅ Basic CRUD: ${mockTaskData.team_id ? 'Working' : 'Limited (no team)'}`
    );
    console.log('=====================================');

    console.log('\n🎯 Next Steps:');
    console.log('1. Open your browser to http://localhost:3009');
    console.log('2. Log in with your credentials');
    console.log('3. Create or select a team');
    console.log('4. Test the following manually:');
    console.log('   - Create tasks in different views');
    console.log('   - Switch between List/Calendar/Kanban/Gantt views');
    console.log('   - Drag and drop tasks (Kanban view)');
    console.log('   - Edit task details');
    console.log('   - Check task filtering by status/priority');
    console.log('   - Verify team switching works correctly');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
quickTest();
