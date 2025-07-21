const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class PerformanceTest {
  constructor() {
    this.results = [];
    this.browser = null;
    this.context = null;
  }

  async init() {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
  }

  async cleanup() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async measurePageLoad(url, testName) {
    const page = await this.context.newPage();

    // 네트워크 요청 모니터링
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
      });
    });

    // 성능 메트릭 수집
    const startTime = Date.now();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      // 성능 메트릭 수집
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');

        return {
          domContentLoaded:
            navigation.domContentLoadedEventEnd -
            navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint:
            paint.find(p => p.name === 'first-contentful-paint')?.startTime ||
            0,
          largestContentfulPaint: 0, // LCP는 별도 측정 필요
        };
      });

      const totalTime = Date.now() - startTime;

      const result = {
        testName,
        url,
        totalTime,
        requests: requests.length,
        metrics,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);
      console.log(
        `✅ ${testName}: ${totalTime}ms (${requests.length} requests)`
      );

      return result;
    } catch (error) {
      console.error(`❌ ${testName} 실패:`, error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  async measureTaskOperations(baseUrl, testName) {
    const page = await this.context.newPage();

    try {
      // 로그인
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', 'admin@almus.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${baseUrl}/tasks`);

      // Task 생성 성능 측정
      const createStart = Date.now();
      await page.click('button[data-testid="create-task"]');
      await page.fill('input[name="title"]', 'Performance Test Task');
      await page.fill(
        'textarea[name="description"]',
        'This is a performance test task'
      );
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="task-item"]');
      const createTime = Date.now() - createStart;

      // Task 목록 로딩 성능 측정
      const listStart = Date.now();
      await page.reload();
      await page.waitForSelector('[data-testid="task-list"]');
      const listTime = Date.now() - listStart;

      // 검색 성능 측정
      const searchStart = Date.now();
      await page.fill('input[data-testid="search-input"]', 'Performance');
      await page.waitForTimeout(500); // 검색 지연 시간
      const searchTime = Date.now() - searchStart;

      const result = {
        testName,
        createTime,
        listTime,
        searchTime,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);
      console.log(
        `✅ ${testName}: 생성=${createTime}ms, 목록=${listTime}ms, 검색=${searchTime}ms`
      );

      return result;
    } catch (error) {
      console.error(`❌ ${testName} 실패:`, error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  async measureConcurrentUsers(baseUrl, userCount, testName) {
    const promises = [];

    for (let i = 0; i < userCount; i++) {
      promises.push(this.simulateUser(baseUrl, i));
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const result = {
      testName,
      userCount,
      successful,
      failed,
      totalTime,
      averageTime: totalTime / userCount,
      timestamp: new Date().toISOString(),
    };

    this.results.push(result);
    console.log(
      `✅ ${testName}: ${successful}/${userCount} 성공, 평균=${result.averageTime}ms`
    );

    return result;
  }

  async simulateUser(baseUrl, userId) {
    const page = await this.context.newPage();

    try {
      // 로그인
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', `user${userId}@almus.com`);
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${baseUrl}/tasks`);

      // Task 목록 조회
      await page.waitForSelector('[data-testid="task-list"]');

      // 검색 수행
      await page.fill('input[data-testid="search-input"]', 'test');
      await page.waitForTimeout(300);

      return { userId, success: true };
    } catch (error) {
      return { userId, success: false, error: error.message };
    } finally {
      await page.close();
    }
  }

  async generateReport() {
    const report = {
      summary: {
        totalTests: this.results.length,
        timestamp: new Date().toISOString(),
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    const reportPath = path.join(
      __dirname,
      '../reports/performance-report.json'
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 성능 테스트 리포트 생성: ${reportPath}`);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // 페이지 로드 시간 분석
    const pageLoadResults = this.results.filter(r => r.totalTime);
    if (pageLoadResults.length > 0) {
      const avgLoadTime =
        pageLoadResults.reduce((sum, r) => sum + r.totalTime, 0) /
        pageLoadResults.length;

      if (avgLoadTime > 1000) {
        recommendations.push({
          type: 'PAGE_LOAD',
          severity: 'HIGH',
          message: `평균 페이지 로드 시간이 ${avgLoadTime}ms로 1초를 초과합니다.`,
          suggestion: '이미지 최적화, 코드 스플리팅, 캐싱 전략을 검토하세요.',
        });
      }
    }

    // 동시 사용자 테스트 분석
    const concurrentResults = this.results.filter(r => r.userCount);
    if (concurrentResults.length > 0) {
      const avgSuccessRate =
        concurrentResults.reduce(
          (sum, r) => sum + r.successful / r.userCount,
          0
        ) / concurrentResults.length;

      if (avgSuccessRate < 0.95) {
        recommendations.push({
          type: 'CONCURRENT_USERS',
          severity: 'HIGH',
          message: `동시 사용자 테스트 성공률이 ${(avgSuccessRate * 100).toFixed(1)}%로 낮습니다.`,
          suggestion:
            '서버 리소스 확장, 데이터베이스 최적화, 캐싱을 검토하세요.',
        });
      }
    }

    return recommendations;
  }
}

// 테스트 실행 함수
async function runPerformanceTests() {
  const test = new PerformanceTest();

  try {
    await test.init();

    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';

    console.log('🚀 성능 테스트 시작...');

    // 1. 페이지 로드 성능 테스트
    await test.measurePageLoad(`${baseUrl}/login`, '로그인 페이지 로드');
    await test.measurePageLoad(`${baseUrl}/tasks`, 'Task 목록 페이지 로드');
    await test.measurePageLoad(`${baseUrl}/kanban`, '칸반 보드 페이지 로드');
    await test.measurePageLoad(`${baseUrl}/gantt`, '간트 차트 페이지 로드');

    // 2. Task 작업 성능 테스트
    await test.measureTaskOperations(baseUrl, 'Task CRUD 작업');

    // 3. 동시 사용자 테스트
    await test.measureConcurrentUsers(baseUrl, 10, '10명 동시 사용자');
    await test.measureConcurrentUsers(baseUrl, 25, '25명 동시 사용자');
    await test.measureConcurrentUsers(baseUrl, 50, '50명 동시 사용자');

    // 4. 리포트 생성
    const report = await test.generateReport();

    console.log('✅ 성능 테스트 완료!');
    console.log('📊 결과 요약:');
    console.log(`- 총 테스트: ${report.summary.totalTests}개`);
    console.log(`- 권장사항: ${report.recommendations.length}개`);
  } catch (error) {
    console.error('❌ 성능 테스트 실패:', error);
  } finally {
    await test.cleanup();
  }
}

// 스크립트 실행
if (require.main === module) {
  runPerformanceTests();
}

module.exports = { PerformanceTest, runPerformanceTests };
