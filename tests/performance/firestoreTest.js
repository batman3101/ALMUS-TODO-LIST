const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

class FirestorePerformanceTest {
  constructor() {
    this.results = [];
    this.db = admin.firestore();
  }

  async generateTestData(teamId, taskCount = 10000) {
    console.log(`📝 테스트 데이터 생성 중... (${taskCount}개 Task)`);

    const batch = this.db.batch();
    const tasks = [];

    for (let i = 0; i < taskCount; i++) {
      const task = {
        title: `Test Task ${i + 1}`,
        description: `This is test task number ${i + 1}`,
        assigneeId: `user${(i % 10) + 1}`,
        status: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'][i % 4],
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
        dueDate: new Date(Date.now() + (i % 30) * 24 * 60 * 60 * 1000),
        teamId,
        projectId: `project${(i % 5) + 1}`,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const docRef = this.db.collection('tasks').doc();
      batch.set(docRef, task);
      tasks.push({ id: docRef.id, ...task });
    }

    await batch.commit();
    console.log(`✅ ${taskCount}개 Task 생성 완료`);

    return tasks;
  }

  async measureQueryPerformance(teamId, testName, queryFn) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await queryFn();
      const endTime = Date.now();
      const endMemory = process.memoryUsage();

      const performance = {
        testName,
        executionTime: endTime - startTime,
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
        resultCount: Array.isArray(result) ? result.length : 1,
        timestamp: new Date().toISOString(),
      };

      this.results.push(performance);
      console.log(
        `✅ ${testName}: ${performance.executionTime}ms (${performance.resultCount}개 결과)`
      );

      return { result, performance };
    } catch (error) {
      console.error(`❌ ${testName} 실패:`, error.message);
      return null;
    }
  }

  async runQueryTests(teamId) {
    console.log('🚀 Firestore 쿼리 성능 테스트 시작...');

    // 1. 기본 목록 조회 (페이징 없음)
    await this.measureQueryPerformance(teamId, '전체 Task 조회', async () => {
      const snapshot = await this.db
        .collection('tasks')
        .where('teamId', '==', teamId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    // 2. 페이징 조회 (20개씩)
    await this.measureQueryPerformance(
      teamId,
      '페이징 조회 (20개)',
      async () => {
        const snapshot = await this.db
          .collection('tasks')
          .where('teamId', '==', teamId)
          .orderBy('createdAt', 'desc')
          .limit(20)
          .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    );

    // 3. 상태별 필터링
    await this.measureQueryPerformance(
      teamId,
      '상태별 필터링 (TODO)',
      async () => {
        const snapshot = await this.db
          .collection('tasks')
          .where('teamId', '==', teamId)
          .where('status', '==', 'TODO')
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    );

    // 4. 담당자별 필터링
    await this.measureQueryPerformance(teamId, '담당자별 필터링', async () => {
      const snapshot = await this.db
        .collection('tasks')
        .where('teamId', '==', teamId)
        .where('assigneeId', '==', 'user1')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    // 5. 복합 필터링
    await this.measureQueryPerformance(
      teamId,
      '복합 필터링 (HIGH + IN_PROGRESS)',
      async () => {
        const snapshot = await this.db
          .collection('tasks')
          .where('teamId', '==', teamId)
          .where('priority', '==', 'HIGH')
          .where('status', '==', 'IN_PROGRESS')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    );

    // 6. 마감일 범위 조회
    await this.measureQueryPerformance(teamId, '마감일 범위 조회', async () => {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const snapshot = await this.db
        .collection('tasks')
        .where('teamId', '==', teamId)
        .where('dueDate', '>=', now)
        .where('dueDate', '<=', nextWeek)
        .orderBy('dueDate', 'asc')
        .limit(100)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    // 7. 집계 쿼리
    await this.measureQueryPerformance(
      teamId,
      '집계 쿼리 (상태별 개수)',
      async () => {
        const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
        const results = {};

        for (const status of statuses) {
          const snapshot = await this.db
            .collection('tasks')
            .where('teamId', '==', teamId)
            .where('status', '==', status)
            .get();

          results[status] = snapshot.size;
        }

        return results;
      }
    );

    // 8. 실시간 리스너 성능 (시뮬레이션)
    await this.measureQueryPerformance(
      teamId,
      '실시간 리스너 시뮬레이션',
      async () => {
        return new Promise(resolve => {
          const unsubscribe = this.db
            .collection('tasks')
            .where('teamId', '==', teamId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
              const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
              }));
              unsubscribe();
              resolve(tasks);
            });

          // 1초 후 타임아웃
          setTimeout(() => {
            unsubscribe();
            resolve([]);
          }, 1000);
        });
      }
    );
  }

  async measureWritePerformance(teamId, testName, writeFn) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await writeFn();
      const endTime = Date.now();
      const endMemory = process.memoryUsage();

      const performance = {
        testName,
        executionTime: endTime - startTime,
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
        timestamp: new Date().toISOString(),
      };

      this.results.push(performance);
      console.log(`✅ ${testName}: ${performance.executionTime}ms`);

      return { result, performance };
    } catch (error) {
      console.error(`❌ ${testName} 실패:`, error.message);
      return null;
    }
  }

  async runWriteTests(teamId) {
    console.log('🚀 Firestore 쓰기 성능 테스트 시작...');

    // 1. 단일 Task 생성
    await this.measureWritePerformance(teamId, '단일 Task 생성', async () => {
      const task = {
        title: 'Performance Test Task',
        description: 'This is a performance test task',
        assigneeId: 'user1',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId,
        projectId: 'project1',
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const docRef = await this.db.collection('tasks').add(task);
      return { id: docRef.id, ...task };
    });

    // 2. 배치 Task 생성 (100개)
    await this.measureWritePerformance(
      teamId,
      '배치 Task 생성 (100개)',
      async () => {
        const batch = this.db.batch();
        const tasks = [];

        for (let i = 0; i < 100; i++) {
          const task = {
            title: `Batch Task ${i + 1}`,
            description: `This is batch task ${i + 1}`,
            assigneeId: `user${(i % 10) + 1}`,
            status: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'][i % 4],
            priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
            dueDate: new Date(Date.now() + (i % 30) * 24 * 60 * 60 * 1000),
            teamId,
            projectId: `project${(i % 5) + 1}`,
            createdBy: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          };

          const docRef = this.db.collection('tasks').doc();
          batch.set(docRef, task);
          tasks.push({ id: docRef.id, ...task });
        }

        await batch.commit();
        return tasks;
      }
    );

    // 3. Task 업데이트
    await this.measureWritePerformance(teamId, 'Task 업데이트', async () => {
      const snapshot = await this.db
        .collection('tasks')
        .where('teamId', '==', teamId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update({
          title: 'Updated Task',
          updatedAt: new Date(),
          version: doc.data().version + 1,
        });
        return { id: doc.id, updated: true };
      }
      return null;
    });

    // 4. Task 삭제
    await this.measureWritePerformance(teamId, 'Task 삭제', async () => {
      const snapshot = await this.db
        .collection('tasks')
        .where('teamId', '==', teamId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.delete();
        return { id: doc.id, deleted: true };
      }
      return null;
    });
  }

  async generateReport() {
    const report = {
      summary: {
        totalTests: this.results.length,
        averageQueryTime:
          this.results.reduce((sum, r) => sum + r.executionTime, 0) /
          this.results.length,
        timestamp: new Date().toISOString(),
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    const reportPath = path.join(
      __dirname,
      '../reports/firestore-performance-report.json'
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Firestore 성능 테스트 리포트 생성: ${reportPath}`);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // 쿼리 성능 분석
    const queryResults = this.results.filter(
      r => r.testName.includes('조회') || r.testName.includes('필터링')
    );
    if (queryResults.length > 0) {
      const avgQueryTime =
        queryResults.reduce((sum, r) => sum + r.executionTime, 0) /
        queryResults.length;

      if (avgQueryTime > 1000) {
        recommendations.push({
          type: 'QUERY_PERFORMANCE',
          severity: 'HIGH',
          message: `평균 쿼리 실행 시간이 ${avgQueryTime}ms로 1초를 초과합니다.`,
          suggestion: '인덱스 최적화, 쿼리 구조 개선, 캐싱 전략을 검토하세요.',
        });
      }
    }

    // 쓰기 성능 분석
    const writeResults = this.results.filter(
      r =>
        r.testName.includes('생성') ||
        r.testName.includes('업데이트') ||
        r.testName.includes('삭제')
    );
    if (writeResults.length > 0) {
      const avgWriteTime =
        writeResults.reduce((sum, r) => sum + r.executionTime, 0) /
        writeResults.length;

      if (avgWriteTime > 500) {
        recommendations.push({
          type: 'WRITE_PERFORMANCE',
          severity: 'MEDIUM',
          message: `평균 쓰기 실행 시간이 ${avgWriteTime}ms로 500ms를 초과합니다.`,
          suggestion: '배치 작업 활용, 트랜잭션 최적화를 검토하세요.',
        });
      }
    }

    return recommendations;
  }

  async cleanup(teamId) {
    console.log('🧹 테스트 데이터 정리 중...');

    try {
      const snapshot = await this.db
        .collection('tasks')
        .where('teamId', '==', teamId)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ ${snapshot.size}개 테스트 데이터 삭제 완료`);
    } catch (error) {
      console.error('❌ 테스트 데이터 정리 실패:', error);
    }
  }
}

// 테스트 실행 함수
async function runFirestorePerformanceTests() {
  const test = new FirestorePerformanceTest();
  const teamId = 'test-team-performance';

  try {
    console.log('🚀 Firestore 성능 테스트 시작...');

    // 1. 테스트 데이터 생성
    await test.generateTestData(teamId, 10000);

    // 2. 쿼리 성능 테스트
    await test.runQueryTests(teamId);

    // 3. 쓰기 성능 테스트
    await test.runWriteTests(teamId);

    // 4. 리포트 생성
    const report = await test.generateReport();

    console.log('✅ Firestore 성능 테스트 완료!');
    console.log('📊 결과 요약:');
    console.log(`- 총 테스트: ${report.summary.totalTests}개`);
    console.log(
      `- 평균 쿼리 시간: ${report.summary.averageQueryTime.toFixed(2)}ms`
    );
    console.log(`- 권장사항: ${report.recommendations.length}개`);

    // 5. 테스트 데이터 정리
    await test.cleanup(teamId);
  } catch (error) {
    console.error('❌ Firestore 성능 테스트 실패:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  runFirestorePerformanceTests();
}

module.exports = { FirestorePerformanceTest, runFirestorePerformanceTests };
