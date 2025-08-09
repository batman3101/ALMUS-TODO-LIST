import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Mock data templates
const mockProjects = [
  { name: '웹사이트 리뉴얼', description: '회사 웹사이트 전면 개편', status: 'ACTIVE' },
  { name: '모바일 앱 개발', description: 'iOS/Android 앱 신규 개발', status: 'PLANNING' },
  { name: '데이터베이스 마이그레이션', description: 'Legacy DB를 PostgreSQL로 전환', status: 'ACTIVE' },
  { name: 'CI/CD 파이프라인 구축', description: 'GitHub Actions 기반 자동화', status: 'COMPLETED' },
  { name: 'API 문서화', description: 'Swagger를 활용한 API 문서 작성', status: 'ACTIVE' }
];

const mockTasks = [
  // High Priority Tasks
  {
    title: '로그인 기능 구현',
    description: 'JWT 기반 인증 시스템 구현',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: '데이터베이스 백업 설정',
    description: '일일 자동 백업 스크립트 작성',
    status: 'TODO',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: '성능 최적화',
    description: '쿼리 최적화 및 인덱싱',
    status: 'TODO',
    priority: 'HIGH',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  
  // Medium Priority Tasks
  {
    title: 'UI 컴포넌트 라이브러리 구축',
    description: '재사용 가능한 React 컴포넌트 개발',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: '테스트 케이스 작성',
    description: '단위 테스트 및 통합 테스트 작성',
    status: 'TODO',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: 'API 엔드포인트 개발',
    description: 'RESTful API 엔드포인트 구현',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: '사용자 대시보드 디자인',
    description: 'Figma를 활용한 대시보드 UI 디자인',
    status: 'DONE',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  
  // Low Priority Tasks
  {
    title: '코드 리팩토링',
    description: '레거시 코드 정리 및 개선',
    status: 'TODO',
    priority: 'LOW',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: '문서 업데이트',
    description: 'README 및 개발 가이드 업데이트',
    status: 'TODO',
    priority: 'LOW',
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: '로깅 시스템 개선',
    description: '구조화된 로깅 및 모니터링 설정',
    status: 'DONE',
    priority: 'LOW',
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  
  // Tasks for different statuses
  {
    title: '배포 자동화 스크립트',
    description: 'Docker 및 Kubernetes 설정',
    status: 'TODO',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: '보안 취약점 스캔',
    description: 'OWASP Top 10 체크리스트 검토',
    status: 'REVIEW',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: '캐싱 전략 구현',
    description: 'Redis를 활용한 캐싱 레이어 구축',
    status: 'TODO',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

async function createTestData() {
  try {
    console.log('🚀 Starting test data creation...\n');
    
    // Get user credentials
    const email = await question('📧 Enter your email: ');
    const password = await question('🔑 Enter your password: ');
    
    console.log('\n📝 Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      rl.close();
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error('❌ No user ID found');
      rl.close();
      return;
    }

    console.log('✅ Authenticated successfully');
    console.log(`👤 User: ${email}\n`);

    // Get or create test team
    console.log('👥 Checking for existing teams...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', userId);

    if (teamsError) {
      console.error('❌ Failed to fetch teams:', teamsError);
      rl.close();
      return;
    }

    let teamId;
    
    if (teams && teams.length > 0) {
      // Show existing teams
      console.log('\n📋 Found existing teams:');
      teams.forEach((team, index) => {
        console.log(`  ${index + 1}. ${team.name} (ID: ${team.id})`);
      });
      
      const choice = await question('\n💡 Enter team number to use (or 0 to create new): ');
      const teamIndex = parseInt(choice) - 1;
      
      if (teamIndex >= 0 && teamIndex < teams.length) {
        teamId = teams[teamIndex].id;
        console.log(`✅ Using team: ${teams[teamIndex].name}`);
      }
    }
    
    if (!teamId) {
      const teamName = await question('📝 Enter name for new test team: ');
      console.log('📝 Creating new team...');
      
      const { data: newTeam, error: createTeamError } = await supabase
        .from('teams')
        .insert({
          name: teamName || 'Test Team',
          description: 'Team for testing purposes',
          owner_id: userId,
          is_active: true
        })
        .select()
        .single();

      if (createTeamError) {
        console.error('❌ Failed to create team:', createTeamError);
        rl.close();
        return;
      }

      teamId = newTeam.id;
      console.log(`✅ Created new team: ${teamName || 'Test Team'}`);

      // Add owner as team member
      await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        role: 'OWNER',
        is_active: true
      });
    }

    // Ask if user wants to clear existing data
    const clearData = await question('\n🗑️ Clear existing tasks and projects for this team? (y/n): ');
    
    if (clearData.toLowerCase() === 'y') {
      console.log('🗑️ Clearing existing test data...');
      
      await supabase
        .from('tasks')
        .delete()
        .eq('team_id', teamId);
      
      await supabase
        .from('projects')
        .delete()
        .eq('team_id', teamId);

      console.log('✅ Cleared existing test data');
    }

    // Create projects
    console.log('\n📁 Creating test projects...');
    const projectIds: string[] = [];
    
    for (const project of mockProjects) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          description: project.description,
          status: project.status,
          team_id: teamId,
          owner_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to create project:`, error.message);
        continue;
      }

      projectIds.push(data.id);
      console.log(`  ✅ Created project: ${project.name}`);
    }

    // Create tasks
    console.log('\n📋 Creating test tasks...');
    let taskCount = 0;
    
    for (const task of mockTasks) {
      // Always assign to a project (project_id is NOT NULL in schema)
      const projectId = projectIds.length > 0 
        ? projectIds[Math.floor(Math.random() * projectIds.length)]
        : projectIds[0]; // fallback to first project
      
      // Randomly assign to user (50% chance)
      const assigneeId = Math.random() > 0.5 ? userId : null;

      const { error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          team_id: teamId,
          project_id: projectId,
          assignee_id: assigneeId,
          created_by: userId
        });

      if (error) {
        console.error(`❌ Failed to create task "${task.title}":`, error.message);
        console.error('Full error:', error);
        continue;
      }

      taskCount++;
      console.log(`  ✅ Created task: ${task.title} (${task.status}, ${task.priority})`);
    }

    // Summary
    console.log('\n📊 Test Data Creation Summary:');
    console.log('================================');
    console.log(`✅ Team ID: ${teamId}`);
    console.log(`✅ Projects created: ${projectIds.length}`);
    console.log(`✅ Tasks created: ${taskCount}`);
    console.log('================================');
    
    console.log('\n🎉 Test data creation completed successfully!');
    console.log('\n📌 You can now test the following:');
    console.log('  1. ✅ Supabase connection');
    console.log('  2. ✅ Task CRUD operations');
    console.log('  3. ✅ Different task statuses and priorities');
    console.log('  4. ✅ Overdue tasks (check Today view)');
    console.log('  5. ✅ Tasks for This Week view');
    console.log('  6. ✅ Kanban board with various statuses');
    console.log('  7. ✅ Calendar view with scheduled tasks');
    console.log('  8. ✅ Gantt chart with timeline');
    
    console.log('\n🔄 Refresh your browser to see the new test data!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    rl.close();
  }
}

// Run the script
createTestData();