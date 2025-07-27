#!/usr/bin/env node

/**
 * Firebase to Supabase 데이터 마이그레이션 스크립트
 * 
 * 이 스크립트는 Firebase Firestore의 데이터를 
 * Supabase PostgreSQL로 마이그레이션합니다.
 */

const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 환경 변수 확인
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'FIREBASE_SERVICE_ACCOUNT_PATH'
];

console.log('🔍 환경 변수 확인 중...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ 다음 환경 변수가 설정되지 않았습니다:', missingVars.join(', '));
  console.log('📝 다음과 같이 설정해주세요:');
  console.log('export SUPABASE_URL="your-supabase-url"');
  console.log('export SUPABASE_SERVICE_KEY="your-supabase-service-key"');
  console.log('export FIREBASE_SERVICE_ACCOUNT_PATH="path/to/firebase-service-account.json"');
  process.exit(1);
}

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Firebase Admin 초기화
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase 서비스 계정 파일을 찾을 수 없습니다:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 마이그레이션 통계
const migrationStats = {
  users: { total: 0, success: 0, failed: 0 },
  teams: { total: 0, success: 0, failed: 0 },
  projects: { total: 0, success: 0, failed: 0 },
  tasks: { total: 0, success: 0, failed: 0 },
  comments: { total: 0, success: 0, failed: 0 },
  teamMembers: { total: 0, success: 0, failed: 0 },
  notifications: { total: 0, success: 0, failed: 0 }
};

// 유틸리티 함수들
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logProgress = (collection, current, total) => {
  const percentage = Math.round((current / total) * 100);
  console.log(`📊 ${collection}: ${current}/${total} (${percentage}%)`);
};

const handleError = (collection, docId, error) => {
  console.error(`❌ ${collection} 마이그레이션 실패 [${docId}]:`, error.message);
  migrationStats[collection].failed++;
};

// 컬렉션별 마이그레이션 함수들

/**
 * 사용자 데이터 마이그레이션
 */
async function migrateUsers() {
  console.log('\n👥 사용자 데이터 마이그레이션 시작...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    migrationStats.users.total = usersSnapshot.size;
    
    console.log(`📈 총 ${usersSnapshot.size}명의 사용자 데이터를 마이그레이션합니다.`);
    
    let processed = 0;
    for (const doc of usersSnapshot.docs) {
      try {
        const userData = doc.data();
        
        const supabaseUser = {
          id: doc.id,
          email: userData.email,
          name: userData.name || userData.displayName,
          avatar_url: userData.avatar || userData.photoURL,
          created_at: userData.createdAt?.toDate?.() || new Date(),
          updated_at: userData.updatedAt?.toDate?.() || new Date(),
          last_sign_in: userData.lastSignIn?.toDate?.() || null,
          is_active: userData.isActive !== false
        };
        
        const { error } = await supabase
          .from('users')
          .upsert(supabaseUser, { onConflict: 'id' });
        
        if (error) throw error;
        
        migrationStats.users.success++;
        processed++;
        
        if (processed % 10 === 0) {
          logProgress('사용자', processed, migrationStats.users.total);
        }
        
        await delay(100); // API 속도 제한 방지
        
      } catch (error) {
        handleError('users', doc.id, error);
      }
    }
    
    console.log(`✅ 사용자 마이그레이션 완료: ${migrationStats.users.success}/${migrationStats.users.total}`);
    
  } catch (error) {
    console.error('❌ 사용자 마이그레이션 중 오류:', error);
  }
}

/**
 * 팀 데이터 마이그레이션
 */
async function migrateTeams() {
  console.log('\n🏢 팀 데이터 마이그레이션 시작...');
  
  try {
    const teamsSnapshot = await db.collection('teams').get();
    migrationStats.teams.total = teamsSnapshot.size;
    
    console.log(`📈 총 ${teamsSnapshot.size}개의 팀 데이터를 마이그레이션합니다.`);
    
    let processed = 0;
    for (const doc of teamsSnapshot.docs) {
      try {
        const teamData = doc.data();
        
        const supabaseTeam = {
          id: doc.id,
          name: teamData.name,
          description: teamData.description || null,
          owner_id: teamData.ownerId || teamData.createdBy,
          created_at: teamData.createdAt?.toDate?.() || new Date(),
          updated_at: teamData.updatedAt?.toDate?.() || new Date(),
          is_active: teamData.isActive !== false,
          settings: teamData.settings || {}
        };
        
        const { error } = await supabase
          .from('teams')
          .upsert(supabaseTeam, { onConflict: 'id' });
        
        if (error) throw error;
        
        migrationStats.teams.success++;
        processed++;
        
        if (processed % 5 === 0) {
          logProgress('팀', processed, migrationStats.teams.total);
        }
        
        await delay(100);
        
      } catch (error) {
        handleError('teams', doc.id, error);
      }
    }
    
    console.log(`✅ 팀 마이그레이션 완료: ${migrationStats.teams.success}/${migrationStats.teams.total}`);
    
  } catch (error) {
    console.error('❌ 팀 마이그레이션 중 오류:', error);
  }
}

/**
 * 팀 멤버 데이터 마이그레이션
 */
async function migrateTeamMembers() {
  console.log('\n👥 팀 멤버 데이터 마이그레이션 시작...');
  
  try {
    const membersSnapshot = await db.collection('team_members').get();
    migrationStats.teamMembers.total = membersSnapshot.size;
    
    console.log(`📈 총 ${membersSnapshot.size}개의 팀 멤버 데이터를 마이그레이션합니다.`);
    
    let processed = 0;
    for (const doc of membersSnapshot.docs) {
      try {
        const memberData = doc.data();
        
        const supabaseMember = {
          id: doc.id,
          team_id: memberData.teamId,
          user_id: memberData.userId,
          role: memberData.role || 'VIEWER',
          joined_at: memberData.joinedAt?.toDate?.() || new Date(),
          invited_by: memberData.invitedBy || null,
          is_active: memberData.isActive !== false
        };
        
        const { error } = await supabase
          .from('team_members')
          .upsert(supabaseMember, { onConflict: 'id' });
        
        if (error) throw error;
        
        migrationStats.teamMembers.success++;
        processed++;
        
        if (processed % 10 === 0) {
          logProgress('팀 멤버', processed, migrationStats.teamMembers.total);
        }
        
        await delay(50);
        
      } catch (error) {
        handleError('teamMembers', doc.id, error);
      }
    }
    
    console.log(`✅ 팀 멤버 마이그레이션 완료: ${migrationStats.teamMembers.success}/${migrationStats.teamMembers.total}`);
    
  } catch (error) {
    console.error('❌ 팀 멤버 마이그레이션 중 오류:', error);
  }
}

/**
 * 프로젝트 데이터 마이그레이션
 */
async function migrateProjects() {
  console.log('\n📁 프로젝트 데이터 마이그레이션 시작...');
  
  try {
    const projectsSnapshot = await db.collection('projects').get();
    migrationStats.projects.total = projectsSnapshot.size;
    
    console.log(`📈 총 ${projectsSnapshot.size}개의 프로젝트 데이터를 마이그레이션합니다.`);
    
    let processed = 0;
    for (const doc of projectsSnapshot.docs) {
      try {
        const projectData = doc.data();
        
        const supabaseProject = {
          id: doc.id,
          name: projectData.name,
          description: projectData.description || null,
          team_id: projectData.teamId,
          owner_id: projectData.ownerId || projectData.createdBy,
          status: projectData.status || 'ACTIVE',
          start_date: projectData.startDate?.toDate?.() || null,
          end_date: projectData.endDate?.toDate?.() || null,
          created_at: projectData.createdAt?.toDate?.() || new Date(),
          updated_at: projectData.updatedAt?.toDate?.() || new Date(),
          settings: projectData.settings || {}
        };
        
        const { error } = await supabase
          .from('projects')
          .upsert(supabaseProject, { onConflict: 'id' });
        
        if (error) throw error;
        
        migrationStats.projects.success++;
        processed++;
        
        if (processed % 5 === 0) {
          logProgress('프로젝트', processed, migrationStats.projects.total);
        }
        
        await delay(100);
        
      } catch (error) {
        handleError('projects', doc.id, error);
      }
    }
    
    console.log(`✅ 프로젝트 마이그레이션 완료: ${migrationStats.projects.success}/${migrationStats.projects.total}`);
    
  } catch (error) {
    console.error('❌ 프로젝트 마이그레이션 중 오류:', error);
  }
}

/**
 * 태스크 데이터 마이그레이션
 */
async function migrateTasks() {
  console.log('\n📝 태스크 데이터 마이그레이션 시작...');
  
  try {
    const tasksSnapshot = await db.collection('tasks').get();
    migrationStats.tasks.total = tasksSnapshot.size;
    
    console.log(`📈 총 ${tasksSnapshot.size}개의 태스크 데이터를 마이그레이션합니다.`);
    
    let processed = 0;
    for (const doc of tasksSnapshot.docs) {
      try {
        const taskData = doc.data();
        
        const supabaseTask = {
          id: doc.id,
          title: taskData.title,
          description: taskData.description || null,
          status: taskData.status || 'TODO',
          priority: taskData.priority || 'MEDIUM',
          team_id: taskData.teamId,
          project_id: taskData.projectId || null,
          assignee_id: taskData.assigneeId || taskData.assignedTo || null,
          created_by: taskData.createdBy,
          start_date: taskData.startDate?.toDate?.() || null,
          due_date: taskData.dueDate?.toDate?.() || null,
          completed_at: taskData.completedAt?.toDate?.() || null,
          created_at: taskData.createdAt?.toDate?.() || new Date(),
          updated_at: taskData.updatedAt?.toDate?.() || new Date(),
          estimated_hours: taskData.estimatedHours || null,
          actual_hours: taskData.actualHours || null,
          tags: taskData.tags || [],
          metadata: taskData.metadata || {}
        };
        
        const { error } = await supabase
          .from('tasks')
          .upsert(supabaseTask, { onConflict: 'id' });
        
        if (error) throw error;
        
        migrationStats.tasks.success++;
        processed++;
        
        if (processed % 10 === 0) {
          logProgress('태스크', processed, migrationStats.tasks.total);
        }
        
        await delay(50);
        
      } catch (error) {
        handleError('tasks', doc.id, error);
      }
    }
    
    console.log(`✅ 태스크 마이그레이션 완료: ${migrationStats.tasks.success}/${migrationStats.tasks.total}`);
    
  } catch (error) {
    console.error('❌ 태스크 마이그레이션 중 오류:', error);
  }
}

/**
 * 댓글 데이터 마이그레이션
 */
async function migrateComments() {
  console.log('\n💬 댓글 데이터 마이그레이션 시작...');
  
  try {
    const commentsSnapshot = await db.collection('comments').get();
    migrationStats.comments.total = commentsSnapshot.size;
    
    console.log(`📈 총 ${commentsSnapshot.size}개의 댓글 데이터를 마이그레이션합니다.`);
    
    let processed = 0;
    for (const doc of commentsSnapshot.docs) {
      try {
        const commentData = doc.data();
        
        const supabaseComment = {
          id: doc.id,
          content: commentData.content,
          resource_type: commentData.resourceType || 'task',
          resource_id: commentData.resourceId,
          author_id: commentData.authorId,
          parent_comment_id: commentData.parentCommentId || null,
          created_at: commentData.createdAt?.toDate?.() || new Date(),
          updated_at: commentData.updatedAt?.toDate?.() || new Date(),
          is_edited: commentData.isEdited || false,
          metadata: commentData.metadata || {}
        };
        
        const { error } = await supabase
          .from('comments')
          .upsert(supabaseComment, { onConflict: 'id' });
        
        if (error) throw error;
        
        migrationStats.comments.success++;
        processed++;
        
        if (processed % 20 === 0) {
          logProgress('댓글', processed, migrationStats.comments.total);
        }
        
        await delay(25);
        
      } catch (error) {
        handleError('comments', doc.id, error);
      }
    }
    
    console.log(`✅ 댓글 마이그레이션 완료: ${migrationStats.comments.success}/${migrationStats.comments.total}`);
    
  } catch (error) {
    console.error('❌ 댓글 마이그레이션 중 오류:', error);
  }
}

/**
 * 알림 데이터 마이그레이션
 */
async function migrateNotifications() {
  console.log('\n🔔 알림 데이터 마이그레이션 시작...');
  
  try {
    const notificationsSnapshot = await db.collection('notifications').get();
    migrationStats.notifications.total = notificationsSnapshot.size;
    
    console.log(`📈 총 ${notificationsSnapshot.size}개의 알림 데이터를 마이그레이션합니다.`);
    
    let processed = 0;
    for (const doc of notificationsSnapshot.docs) {
      try {
        const notificationData = doc.data();
        
        const supabaseNotification = {
          id: doc.id,
          user_id: notificationData.userId,
          type: notificationData.type || 'task_update',
          title: notificationData.title,
          message: notificationData.message,
          resource_type: notificationData.resourceType || null,
          resource_id: notificationData.resourceId || null,
          is_read: notificationData.isRead || false,
          read_at: notificationData.readAt?.toDate?.() || null,
          created_at: notificationData.createdAt?.toDate?.() || new Date(),
          metadata: notificationData.metadata || {}
        };
        
        const { error } = await supabase
          .from('notifications')
          .upsert(supabaseNotification, { onConflict: 'id' });
        
        if (error) throw error;
        
        migrationStats.notifications.success++;
        processed++;
        
        if (processed % 20 === 0) {
          logProgress('알림', processed, migrationStats.notifications.total);
        }
        
        await delay(25);
        
      } catch (error) {
        handleError('notifications', doc.id, error);
      }
    }
    
    console.log(`✅ 알림 마이그레이션 완료: ${migrationStats.notifications.success}/${migrationStats.notifications.total}`);
    
  } catch (error) {
    console.error('❌ 알림 마이그레이션 중 오류:', error);
  }
}

/**
 * 마이그레이션 결과 리포트 생성
 */
function generateMigrationReport() {
  console.log('\n📊 마이그레이션 결과 리포트');
  console.log('='.repeat(50));
  
  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalRecords = 0;
  
  Object.entries(migrationStats).forEach(([collection, stats]) => {
    const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
    console.log(`${collection.padEnd(15)} | ${stats.success.toString().padStart(4)}/${stats.total.toString().padStart(4)} (${successRate}%) | 실패: ${stats.failed}`);
    
    totalSuccessful += stats.success;
    totalFailed += stats.failed;
    totalRecords += stats.total;
  });
  
  console.log('='.repeat(50));
  const overallSuccessRate = totalRecords > 0 ? Math.round((totalSuccessful / totalRecords) * 100) : 0;
  console.log(`전체               | ${totalSuccessful.toString().padStart(4)}/${totalRecords.toString().padStart(4)} (${overallSuccessRate}%) | 실패: ${totalFailed}`);
  
  // 결과를 파일로 저장
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRecords,
      totalSuccessful,
      totalFailed,
      successRate: overallSuccessRate
    },
    details: migrationStats
  };
  
  const reportPath = path.join(__dirname, '..', 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 상세 리포트가 저장되었습니다: ${reportPath}`);
}

/**
 * 메인 마이그레이션 함수
 */
async function runMigration() {
  const startTime = Date.now();
  
  console.log('🚀 Firebase to Supabase 데이터 마이그레이션 시작!');
  console.log('시작 시간:', new Date().toLocaleString('ko-KR'));
  
  try {
    // 의존성 순서대로 마이그레이션 실행
    await migrateUsers();          // 1. 사용자 (다른 모든 데이터의 기초)
    await migrateTeams();          // 2. 팀
    await migrateTeamMembers();    // 3. 팀 멤버 (사용자 + 팀 필요)
    await migrateProjects();       // 4. 프로젝트 (팀 필요)
    await migrateTasks();          // 5. 태스크 (프로젝트, 사용자 필요)
    await migrateComments();       // 6. 댓글 (태스크, 사용자 필요)
    await migrateNotifications();  // 7. 알림 (사용자 필요)
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 마이그레이션 완료!');
    console.log(`총 소요 시간: ${duration}초`);
    
    generateMigrationReport();
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 심각한 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  runMigration().then(() => {
    console.log('\n✅ 마이그레이션 프로세스가 완료되었습니다.');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigration,
  migrateUsers,
  migrateTeams,
  migrateProjects,
  migrateTasks,
  migrateComments
};