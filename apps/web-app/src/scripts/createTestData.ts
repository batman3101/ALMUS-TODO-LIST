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

// Test user credentials
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'Test123456!';

// Mock data templates
const mockProjects = [
  {
    name: '웹사이트 리뉴얼',
    description: '회사 웹사이트 전면 개편',
    status: 'IN_PROGRESS',
  },
  {
    name: '모바일 앱 개발',
    description: 'iOS/Android 앱 신규 개발',
    status: 'PLANNING',
  },
  {
    name: '데이터베이스 마이그레이션',
    description: 'Legacy DB를 PostgreSQL로 전환',
    status: 'IN_PROGRESS',
  },
  {
    name: 'CI/CD 파이프라인 구축',
    description: 'GitHub Actions 기반 자동화',
    status: 'COMPLETED',
  },
  {
    name: 'API 문서화',
    description: 'Swagger를 활용한 API 문서 작성',
    status: 'IN_PROGRESS',
  },
];

const mockTasks = [
  // High Priority Tasks
  {
    title: '로그인 기능 구현',
    description: 'JWT 기반 인증 시스템 구현',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    estimated_hours: 8,
    actual_hours: 4,
    tags: ['backend', 'auth', 'security'],
  },
  {
    title: '데이터베이스 백업 설정',
    description: '일일 자동 백업 스크립트 작성',
    status: 'TODO',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    estimated_hours: 4,
    tags: ['database', 'devops'],
  },
  {
    title: '성능 최적화',
    description: '쿼리 최적화 및 인덱싱',
    status: 'TODO',
    priority: 'HIGH',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday (overdue)
    estimated_hours: 6,
    tags: ['performance', 'database'],
  },

  // Medium Priority Tasks
  {
    title: 'UI 컴포넌트 라이브러리 구축',
    description: '재사용 가능한 React 컴포넌트 개발',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    estimated_hours: 16,
    actual_hours: 8,
    tags: ['frontend', 'react', 'ui/ux'],
  },
  {
    title: '테스트 케이스 작성',
    description: '단위 테스트 및 통합 테스트 작성',
    status: 'TODO',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 12,
    tags: ['testing', 'quality'],
  },
  {
    title: 'API 엔드포인트 개발',
    description: 'RESTful API 엔드포인트 구현',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 10,
    actual_hours: 6,
    tags: ['backend', 'api'],
  },
  {
    title: '사용자 대시보드 디자인',
    description: 'Figma를 활용한 대시보드 UI 디자인',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 8,
    actual_hours: 10,
    completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['design', 'ui/ux'],
  },

  // Low Priority Tasks
  {
    title: '코드 리팩토링',
    description: '레거시 코드 정리 및 개선',
    status: 'TODO',
    priority: 'LOW',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 20,
    tags: ['refactoring', 'maintenance'],
  },
  {
    title: '문서 업데이트',
    description: 'README 및 개발 가이드 업데이트',
    status: 'TODO',
    priority: 'LOW',
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 4,
    tags: ['documentation'],
  },
  {
    title: '로깅 시스템 개선',
    description: '구조화된 로깅 및 모니터링 설정',
    status: 'COMPLETED',
    priority: 'LOW',
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 6,
    actual_hours: 7,
    completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['monitoring', 'devops'],
  },

  // Tasks for different statuses
  {
    title: '배포 자동화 스크립트',
    description: 'Docker 및 Kubernetes 설정',
    status: 'BLOCKED',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 12,
    tags: ['devops', 'deployment'],
  },
  {
    title: '보안 취약점 스캔',
    description: 'OWASP Top 10 체크리스트 검토',
    status: 'IN_REVIEW',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 6,
    actual_hours: 5,
    tags: ['security', 'audit'],
  },
  {
    title: '캐싱 전략 구현',
    description: 'Redis를 활용한 캐싱 레이어 구축',
    status: 'CANCELLED',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 8,
    tags: ['performance', 'infrastructure'],
  },
];

async function createTestData() {
  try {
    console.log('🚀 Starting test data creation...');

    // 1. Sign in as test user
    console.log('📝 Signing in as test user...');
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log(
        '💡 Please ensure test user exists with email:',
        TEST_USER_EMAIL
      );
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error('❌ No user ID found');
      return;
    }

    console.log('✅ Authenticated successfully');

    // 2. Get or create test team
    console.log('👥 Checking for existing team...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', userId)
      .eq('name', 'Test Team');

    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError);
      return;
    }

    let teamId;

    if (teams && teams.length > 0) {
      teamId = teams[0].id;
      console.log('✅ Found existing test team:', teamId);
    } else {
      console.log('📝 Creating new test team...');
      const { data: newTeam, error: createTeamError } = await supabase
        .from('teams')
        .insert({
          name: 'Test Team',
          description: 'Team for testing purposes',
          owner_id: userId,
          is_active: true,
        })
        .select()
        .single();

      if (createTeamError) {
        console.error('❌ Failed to create team:', createTeamError);
        return;
      }

      teamId = newTeam.id;
      console.log('✅ Created new test team:', teamId);

      // Add owner as team member
      await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        role: 'OWNER',
        status: 'ACTIVE',
      });
    }

    // 3. Clear existing test data
    console.log('🗑️ Clearing existing test data...');

    // Delete existing tasks for this team
    await supabase.from('tasks').delete().eq('team_id', teamId);

    // Delete existing projects for this team
    await supabase.from('projects').delete().eq('team_id', teamId);

    console.log('✅ Cleared existing test data');

    // 4. Create projects
    console.log('📁 Creating test projects...');
    const projectIds: string[] = [];

    for (const project of mockProjects) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...project,
          team_id: teamId,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create project:', error);
        continue;
      }

      projectIds.push(data.id);
      console.log(`  ✅ Created project: ${project.name}`);
    }

    // 5. Create tasks
    console.log('📋 Creating test tasks...');
    let taskCount = 0;

    for (const task of mockTasks) {
      // Randomly assign to project (70% chance)
      const projectId =
        Math.random() > 0.3 && projectIds.length > 0
          ? projectIds[Math.floor(Math.random() * projectIds.length)]
          : null;

      // Randomly assign to user (50% chance)
      const assigneeId = Math.random() > 0.5 ? userId : null;

      const { error } = await supabase.from('tasks').insert({
        ...task,
        team_id: teamId,
        project_id: projectId,
        assignee_id: assigneeId,
        created_by: userId,
      });

      if (error) {
        console.error(`❌ Failed to create task "${task.title}":`, error);
        continue;
      }

      taskCount++;
      console.log(
        `  ✅ Created task: ${task.title} (${task.status}, ${task.priority})`
      );
    }

    // 6. Summary
    console.log('\n📊 Test Data Creation Summary:');
    console.log('================================');
    console.log(`✅ Team: Test Team (ID: ${teamId})`);
    console.log(`✅ Projects created: ${projectIds.length}`);
    console.log(`✅ Tasks created: ${taskCount}`);
    console.log('================================');

    console.log('\n🎉 Test data creation completed successfully!');
    console.log('📌 You can now test the following:');
    console.log('  1. Supabase connection');
    console.log('  2. Task CRUD operations');
    console.log('  3. Different task statuses and priorities');
    console.log('  4. Overdue tasks (check Today view)');
    console.log('  5. Tasks for This Week view');
    console.log('  6. Kanban board with various statuses');
    console.log('  7. Calendar view with scheduled tasks');
    console.log('  8. Gantt chart with timeline');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createTestData();
