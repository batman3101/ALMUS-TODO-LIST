import * as admin from 'firebase-admin';
import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Firebase Admin 초기화
const serviceAccount = require('../config/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'almus-todo-app',
});

const db = admin.firestore();

// PostgreSQL 연결 설정
const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'almus_todo',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 체크포인트 관리
interface Checkpoint {
  lastProcessedId: string;
  collection: string;
  processedCount: number;
  totalCount: number;
  timestamp: Date;
}

class MigrationManager {
  private checkpointPath: string;
  private checkpoints: Map<string, Checkpoint>;

  constructor() {
    this.checkpointPath = path.join(
      __dirname,
      '../data/migration-checkpoints.json'
    );
    this.checkpoints = new Map();
    this.loadCheckpoints();
  }

  private loadCheckpoints() {
    try {
      if (fs.existsSync(this.checkpointPath)) {
        const data = JSON.parse(fs.readFileSync(this.checkpointPath, 'utf8'));
        this.checkpoints = new Map(Object.entries(data));
        console.log('✅ 체크포인트 로드 완료');
      }
    } catch (error) {
      console.log('⚠️ 체크포인트 파일이 없습니다. 새로 시작합니다.');
    }
  }

  private saveCheckpoints() {
    try {
      const data = Object.fromEntries(this.checkpoints);
      fs.mkdirSync(path.dirname(this.checkpointPath), { recursive: true });
      fs.writeFileSync(this.checkpointPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ 체크포인트 저장 실패:', error);
    }
  }

  getCheckpoint(collection: string): Checkpoint | null {
    return this.checkpoints.get(collection) || null;
  }

  updateCheckpoint(collection: string, checkpoint: Checkpoint) {
    this.checkpoints.set(collection, checkpoint);
    this.saveCheckpoints();
  }

  async migrateUsers() {
    console.log('👥 사용자 데이터 마이그레이션 시작...');

    const checkpoint = this.getCheckpoint('users');
    const batchSize = 500;
    let processedCount = checkpoint?.processedCount || 0;
    let lastProcessedId = checkpoint?.lastProcessedId || '';

    try {
      // 총 사용자 수 조회
      const totalCountResult = await pgPool.query(
        'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'
      );
      const totalCount = parseInt(totalCountResult.rows[0].count);

      console.log(`📊 총 ${totalCount}명의 사용자 데이터 처리 예정`);

      while (processedCount < totalCount) {
        const query = `
          SELECT 
            id, email, name, role, team_id, created_at, updated_at,
            COALESCE(project_ids, '[]'::jsonb) as project_ids
          FROM users 
          WHERE deleted_at IS NULL 
            ${lastProcessedId ? `AND id > '${lastProcessedId}'` : ''}
          ORDER BY id 
          LIMIT ${batchSize}
        `;

        const result = await pgPool.query(query);
        const users = result.rows;

        if (users.length === 0) break;

        // Firestore 배치 쓰기
        const batch = db.batch();

        for (const user of users) {
          const firestoreUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            teamId: user.team_id,
            projectIds: user.project_ids || [],
            createdAt: admin.firestore.Timestamp.fromDate(
              new Date(user.created_at)
            ),
            updatedAt: admin.firestore.Timestamp.fromDate(
              new Date(user.updated_at)
            ),
          };

          const docRef = db.collection('users').doc(user.id);
          batch.set(docRef, firestoreUser);
        }

        await batch.commit();

        processedCount += users.length;
        lastProcessedId = users[users.length - 1].id;

        // 체크포인트 업데이트
        this.updateCheckpoint('users', {
          lastProcessedId,
          collection: 'users',
          processedCount,
          totalCount,
          timestamp: new Date(),
        });

        console.log(`✅ 사용자 ${processedCount}/${totalCount} 처리 완료`);
      }

      console.log('✅ 사용자 데이터 마이그레이션 완료');
    } catch (error) {
      console.error('❌ 사용자 마이그레이션 실패:', error);
      throw error;
    }
  }

  async migrateTeams() {
    console.log('🏢 팀 데이터 마이그레이션 시작...');

    const checkpoint = this.getCheckpoint('teams');
    const batchSize = 100;
    let processedCount = checkpoint?.processedCount || 0;
    let lastProcessedId = checkpoint?.lastProcessedId || '';

    try {
      // 총 팀 수 조회
      const totalCountResult = await pgPool.query(
        'SELECT COUNT(*) as count FROM teams WHERE deleted_at IS NULL'
      );
      const totalCount = parseInt(totalCountResult.rows[0].count);

      console.log(`📊 총 ${totalCount}개의 팀 데이터 처리 예정`);

      while (processedCount < totalCount) {
        const query = `
          SELECT 
            id, name, description, created_by, is_active, created_at, updated_at
          FROM teams 
          WHERE deleted_at IS NULL 
            ${lastProcessedId ? `AND id > '${lastProcessedId}'` : ''}
          ORDER BY id 
          LIMIT ${batchSize}
        `;

        const result = await pgPool.query(query);
        const teams = result.rows;

        if (teams.length === 0) break;

        // Firestore 배치 쓰기
        const batch = db.batch();

        for (const team of teams) {
          const firestoreTeam = {
            id: team.id,
            name: team.name,
            description: team.description,
            createdBy: team.created_by,
            isActive: team.is_active,
            createdAt: admin.firestore.Timestamp.fromDate(
              new Date(team.created_at)
            ),
            updatedAt: admin.firestore.Timestamp.fromDate(
              new Date(team.updated_at)
            ),
          };

          const docRef = db.collection('teams').doc(team.id);
          batch.set(docRef, firestoreTeam);
        }

        await batch.commit();

        processedCount += teams.length;
        lastProcessedId = teams[teams.length - 1].id;

        // 체크포인트 업데이트
        this.updateCheckpoint('teams', {
          lastProcessedId,
          collection: 'teams',
          processedCount,
          totalCount,
          timestamp: new Date(),
        });

        console.log(`✅ 팀 ${processedCount}/${totalCount} 처리 완료`);
      }

      console.log('✅ 팀 데이터 마이그레이션 완료');
    } catch (error) {
      console.error('❌ 팀 마이그레이션 실패:', error);
      throw error;
    }
  }

  async migrateProjects() {
    console.log('📋 프로젝트 데이터 마이그레이션 시작...');

    const checkpoint = this.getCheckpoint('projects');
    const batchSize = 100;
    let processedCount = checkpoint?.processedCount || 0;
    let lastProcessedId = checkpoint?.lastProcessedId || '';

    try {
      // 총 프로젝트 수 조회
      const totalCountResult = await pgPool.query(
        'SELECT COUNT(*) as count FROM projects WHERE deleted_at IS NULL'
      );
      const totalCount = parseInt(totalCountResult.rows[0].count);

      console.log(`📊 총 ${totalCount}개의 프로젝트 데이터 처리 예정`);

      while (processedCount < totalCount) {
        const query = `
          SELECT 
            id, name, description, team_id, created_by, is_active, created_at, updated_at
          FROM projects 
          WHERE deleted_at IS NULL 
            ${lastProcessedId ? `AND id > '${lastProcessedId}'` : ''}
          ORDER BY id 
          LIMIT ${batchSize}
        `;

        const result = await pgPool.query(query);
        const projects = result.rows;

        if (projects.length === 0) break;

        // Firestore 배치 쓰기
        const batch = db.batch();

        for (const project of projects) {
          const firestoreProject = {
            id: project.id,
            name: project.name,
            description: project.description,
            teamId: project.team_id,
            createdBy: project.created_by,
            isActive: project.is_active,
            createdAt: admin.firestore.Timestamp.fromDate(
              new Date(project.created_at)
            ),
            updatedAt: admin.firestore.Timestamp.fromDate(
              new Date(project.updated_at)
            ),
          };

          const docRef = db.collection('projects').doc(project.id);
          batch.set(docRef, firestoreProject);
        }

        await batch.commit();

        processedCount += projects.length;
        lastProcessedId = projects[projects.length - 1].id;

        // 체크포인트 업데이트
        this.updateCheckpoint('projects', {
          lastProcessedId,
          collection: 'projects',
          processedCount,
          totalCount,
          timestamp: new Date(),
        });

        console.log(`✅ 프로젝트 ${processedCount}/${totalCount} 처리 완료`);
      }

      console.log('✅ 프로젝트 데이터 마이그레이션 완료');
    } catch (error) {
      console.error('❌ 프로젝트 마이그레이션 실패:', error);
      throw error;
    }
  }

  async migrateTasks() {
    console.log('📝 Task 데이터 마이그레이션 시작...');

    const checkpoint = this.getCheckpoint('tasks');
    const batchSize = 500;
    let processedCount = checkpoint?.processedCount || 0;
    let lastProcessedId = checkpoint?.lastProcessedId || '';

    try {
      // 총 Task 수 조회
      const totalCountResult = await pgPool.query(
        'SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NULL'
      );
      const totalCount = parseInt(totalCountResult.rows[0].count);

      console.log(`📊 총 ${totalCount}개의 Task 데이터 처리 예정`);

      while (processedCount < totalCount) {
        const query = `
          SELECT 
            id, title, description, assignee_id, status, priority, due_date,
            created_by, project_id, team_id, version, start_date, end_date,
            COALESCE(dependencies, '[]'::jsonb) as dependencies, progress,
            created_at, updated_at
          FROM tasks 
          WHERE deleted_at IS NULL 
            ${lastProcessedId ? `AND id > '${lastProcessedId}'` : ''}
          ORDER BY id 
          LIMIT ${batchSize}
        `;

        const result = await pgPool.query(query);
        const tasks = result.rows;

        if (tasks.length === 0) break;

        // Firestore 배치 쓰기
        const batch = db.batch();

        for (const task of tasks) {
          const firestoreTask = {
            id: task.id,
            title: task.title,
            description: task.description,
            assigneeId: task.assignee_id,
            status: task.status,
            priority: task.priority,
            dueDate: task.due_date
              ? admin.firestore.Timestamp.fromDate(new Date(task.due_date))
              : null,
            createdBy: task.created_by,
            projectId: task.project_id,
            teamId: task.team_id,
            version: task.version,
            startDate: task.start_date
              ? admin.firestore.Timestamp.fromDate(new Date(task.start_date))
              : null,
            endDate: task.end_date
              ? admin.firestore.Timestamp.fromDate(new Date(task.end_date))
              : null,
            dependencies: task.dependencies || [],
            progress: task.progress || 0,
            createdAt: admin.firestore.Timestamp.fromDate(
              new Date(task.created_at)
            ),
            updatedAt: admin.firestore.Timestamp.fromDate(
              new Date(task.updated_at)
            ),
          };

          const docRef = db.collection('tasks').doc(task.id);
          batch.set(docRef, firestoreTask);
        }

        await batch.commit();

        processedCount += tasks.length;
        lastProcessedId = tasks[tasks.length - 1].id;

        // 체크포인트 업데이트
        this.updateCheckpoint('tasks', {
          lastProcessedId,
          collection: 'tasks',
          processedCount,
          totalCount,
          timestamp: new Date(),
        });

        console.log(`✅ Task ${processedCount}/${totalCount} 처리 완료`);
      }

      console.log('✅ Task 데이터 마이그레이션 완료');
    } catch (error) {
      console.error('❌ Task 마이그레이션 실패:', error);
      throw error;
    }
  }

  async migrateNotifications() {
    console.log('🔔 알림 데이터 마이그레이션 시작...');

    const checkpoint = this.getCheckpoint('notifications');
    const batchSize = 1000;
    let processedCount = checkpoint?.processedCount || 0;
    let lastProcessedId = checkpoint?.lastProcessedId || '';

    try {
      // 총 알림 수 조회
      const totalCountResult = await pgPool.query(
        'SELECT COUNT(*) as count FROM notifications WHERE deleted_at IS NULL'
      );
      const totalCount = parseInt(totalCountResult.rows[0].count);

      console.log(`📊 총 ${totalCount}개의 알림 데이터 처리 예정`);

      while (processedCount < totalCount) {
        const query = `
          SELECT 
            id, user_id, type, title, message, data, channels, is_read, is_sent,
            sent_at, created_at, updated_at
          FROM notifications 
          WHERE deleted_at IS NULL 
            ${lastProcessedId ? `AND id > '${lastProcessedId}'` : ''}
          ORDER BY id 
          LIMIT ${batchSize}
        `;

        const result = await pgPool.query(query);
        const notifications = result.rows;

        if (notifications.length === 0) break;

        // Firestore 배치 쓰기
        const batch = db.batch();

        for (const notification of notifications) {
          const firestoreNotification = {
            id: notification.id,
            userId: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data || {},
            channels: notification.channels || [],
            isRead: notification.is_read,
            isSent: notification.is_sent,
            sentAt: notification.sent_at
              ? admin.firestore.Timestamp.fromDate(
                  new Date(notification.sent_at)
                )
              : null,
            createdAt: admin.firestore.Timestamp.fromDate(
              new Date(notification.created_at)
            ),
            updatedAt: admin.firestore.Timestamp.fromDate(
              new Date(notification.updated_at)
            ),
          };

          const docRef = db.collection('notifications').doc(notification.id);
          batch.set(docRef, firestoreNotification);
        }

        await batch.commit();

        processedCount += notifications.length;
        lastProcessedId = notifications[notifications.length - 1].id;

        // 체크포인트 업데이트
        this.updateCheckpoint('notifications', {
          lastProcessedId,
          collection: 'notifications',
          processedCount,
          totalCount,
          timestamp: new Date(),
        });

        console.log(`✅ 알림 ${processedCount}/${totalCount} 처리 완료`);
      }

      console.log('✅ 알림 데이터 마이그레이션 완료');
    } catch (error) {
      console.error('❌ 알림 마이그레이션 실패:', error);
      throw error;
    }
  }

  async validateMigration() {
    console.log('🔍 마이그레이션 데이터 검증 시작...');

    try {
      // PostgreSQL 데이터 수 조회
      const pgCounts = await this.getPostgreSQLCounts();

      // Firestore 데이터 수 조회
      const fsCounts = await this.getFirestoreCounts();

      console.log('📊 데이터 정합성 검증 결과:');
      console.log('PostgreSQL | Firestore | 차이');
      console.log('-----------|-----------|------');

      let hasDiscrepancy = false;

      for (const [collection, pgCount] of Object.entries(pgCounts)) {
        const fsCount = fsCounts[collection] || 0;
        const diff = pgCount - fsCount;

        console.log(
          `${pgCount.toString().padStart(10)} | ${fsCount.toString().padStart(9)} | ${diff > 0 ? '+' : ''}${diff}`
        );

        if (diff !== 0) {
          hasDiscrepancy = true;
        }
      }

      if (hasDiscrepancy) {
        console.log('⚠️ 데이터 불일치가 발견되었습니다.');
        return false;
      } else {
        console.log('✅ 모든 데이터가 정확히 마이그레이션되었습니다.');
        return true;
      }
    } catch (error) {
      console.error('❌ 데이터 검증 실패:', error);
      return false;
    }
  }

  private async getPostgreSQLCounts() {
    const counts: Record<string, number> = {};

    const collections = [
      'users',
      'teams',
      'projects',
      'tasks',
      'notifications',
    ];

    for (const collection of collections) {
      const result = await pgPool.query(
        `SELECT COUNT(*) as count FROM ${collection} WHERE deleted_at IS NULL`
      );
      counts[collection] = parseInt(result.rows[0].count);
    }

    return counts;
  }

  private async getFirestoreCounts() {
    const counts: Record<string, number> = {};

    const collections = [
      'users',
      'teams',
      'projects',
      'tasks',
      'notifications',
    ];

    for (const collection of collections) {
      const snapshot = await db.collection(collection).count().get();
      counts[collection] = snapshot.data().count;
    }

    return counts;
  }

  async runMigration() {
    console.log('🚀 PostgreSQL → Firestore 마이그레이션 시작...');

    try {
      // 1. 사용자 마이그레이션
      await this.migrateUsers();

      // 2. 팀 마이그레이션
      await this.migrateTeams();

      // 3. 프로젝트 마이그레이션
      await this.migrateProjects();

      // 4. Task 마이그레이션
      await this.migrateTasks();

      // 5. 알림 마이그레이션
      await this.migrateNotifications();

      // 6. 데이터 검증
      const isValid = await this.validateMigration();

      if (isValid) {
        console.log('🎉 마이그레이션이 성공적으로 완료되었습니다!');
      } else {
        console.log('⚠️ 마이그레이션에 문제가 있습니다. 검토가 필요합니다.');
      }
    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error);
      throw error;
    } finally {
      await pgPool.end();
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const migrationManager = new MigrationManager();
  migrationManager.runMigration().catch(console.error);
}

export { MigrationManager };
