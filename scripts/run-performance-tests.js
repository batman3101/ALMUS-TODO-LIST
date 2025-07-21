#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceTestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runLighthouseTests() {
    console.log('🔍 Lighthouse 성능 테스트 시작...');

    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';
    const pages = [
      { name: '로그인 페이지', url: `${baseUrl}/login` },
      { name: 'Task 목록 페이지', url: `${baseUrl}/tasks` },
      { name: '칸반 보드 페이지', url: `${baseUrl}/kanban` },
      { name: '간트 차트 페이지', url: `${baseUrl}/gantt` },
    ];

    for (const page of pages) {
      try {
        console.log(`📊 ${page.name} 테스트 중...`);

        const outputPath = path.join(
          __dirname,
          '../reports',
          `${page.name.replace(/\s+/g, '-')}-lighthouse.json`
        );

        // Lighthouse 실행
        const command = `npx lighthouse "${page.url}" --output=json --output-path="${outputPath}" --chrome-flags="--headless --no-sandbox"`;

        execSync(command, { stdio: 'pipe' });

        // 결과 읽기
        const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

        const result = {
          page: page.name,
          url: page.url,
          performance: {
            score: report.categories.performance.score * 100,
            firstContentfulPaint:
              report.audits['first-contentful-paint'].numericValue,
            largestContentfulPaint:
              report.audits['largest-contentful-paint'].numericValue,
            firstInputDelay: report.audits['max-potential-fid'].numericValue,
            cumulativeLayoutShift:
              report.audits['cumulative-layout-shift'].numericValue,
          },
          timestamp: new Date().toISOString(),
        };

        this.results.push(result);
        console.log(
          `✅ ${page.name}: 성능 점수 ${result.performance.score.toFixed(1)}점`
        );
      } catch (error) {
        console.error(`❌ ${page.name} 테스트 실패:`, error.message);
      }
    }
  }

  async runWebPageTest() {
    console.log('🌐 WebPageTest 성능 테스트 시작...');

    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';

    // WebPageTest API 키가 있는 경우에만 실행
    const apiKey = process.env.WEBPAGETEST_API_KEY;
    if (!apiKey) {
      console.log('⚠️ WebPageTest API 키가 없어서 건너뜁니다.');
      return;
    }

    const pages = [
      { name: '로그인 페이지', url: `${baseUrl}/login` },
      { name: 'Task 목록 페이지', url: `${baseUrl}/tasks` },
    ];

    for (const page of pages) {
      try {
        console.log(`📊 ${page.name} WebPageTest 중...`);

        // WebPageTest API 호출
        const testUrl = `https://www.webpagetest.org/runtest.php?url=${encodeURIComponent(page.url)}&k=${apiKey}&f=json`;
        const response = await fetch(testUrl);
        const data = await response.json();

        if (data.statusCode === 200) {
          // 테스트 완료 대기
          await this.waitForWebPageTestResult(data.data.testId);
        }
      } catch (error) {
        console.error(`❌ ${page.name} WebPageTest 실패:`, error.message);
      }
    }
  }

  async waitForWebPageTestResult(testId) {
    const maxAttempts = 30; // 최대 5분 대기
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const statusUrl = `https://www.webpagetest.org/testStatus.php?test=${testId}`;
        const response = await fetch(statusUrl);
        const data = await response.json();

        if (data.statusCode === 200 && data.data.statusCode === 200) {
          console.log(`✅ WebPageTest 완료: ${testId}`);
          return data.data;
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // 10초 대기
        attempts++;
      } catch (error) {
        console.error('WebPageTest 상태 확인 실패:', error.message);
        attempts++;
      }
    }

    console.log(`⚠️ WebPageTest 타임아웃: ${testId}`);
  }

  async runLoadTests() {
    console.log('⚡ 부하 테스트 시작...');

    try {
      // Playwright 부하 테스트 실행
      const loadTestPath = path.join(
        __dirname,
        '../tests/performance/loadTest.js'
      );
      execSync(`node ${loadTestPath}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ 부하 테스트 실패:', error.message);
    }
  }

  async runFirestoreTests() {
    console.log('🔥 Firestore 성능 테스트 시작...');

    try {
      // Firestore 성능 테스트 실행
      const firestoreTestPath = path.join(
        __dirname,
        '../tests/performance/firestoreTest.js'
      );
      execSync(`node ${firestoreTestPath}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Firestore 테스트 실패:', error.message);
    }
  }

  generateSummaryReport() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;

    const report = {
      summary: {
        totalTests: this.results.length,
        totalTime: totalTime,
        timestamp: new Date().toISOString(),
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    const reportPath = path.join(
      __dirname,
      '../reports/performance-summary.json'
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 성능 테스트 요약 리포트 생성: ${reportPath}`);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Lighthouse 성능 점수 분석
    const lighthouseResults = this.results.filter(r => r.performance?.score);
    if (lighthouseResults.length > 0) {
      const avgScore =
        lighthouseResults.reduce((sum, r) => sum + r.performance.score, 0) /
        lighthouseResults.length;

      if (avgScore < 90) {
        recommendations.push({
          type: 'LIGHTHOUSE_PERFORMANCE',
          severity: 'HIGH',
          message: `평균 Lighthouse 성능 점수가 ${avgScore.toFixed(1)}점으로 90점 미만입니다.`,
          suggestion:
            '이미지 최적화, 코드 스플리팅, 번들 크기 최적화를 검토하세요.',
        });
      }
    }

    // Core Web Vitals 분석
    lighthouseResults.forEach(result => {
      const { performance } = result;

      if (performance.largestContentfulPaint > 2500) {
        recommendations.push({
          type: 'CORE_WEB_VITALS',
          severity: 'HIGH',
          message: `${result.page}의 LCP가 ${performance.largestContentfulPaint}ms로 2.5초를 초과합니다.`,
          suggestion: '이미지 최적화, 서버 응답 시간 개선을 검토하세요.',
        });
      }

      if (performance.firstInputDelay > 100) {
        recommendations.push({
          type: 'CORE_WEB_VITALS',
          severity: 'MEDIUM',
          message: `${result.page}의 FID가 ${performance.firstInputDelay}ms로 100ms를 초과합니다.`,
          suggestion:
            'JavaScript 번들 최적화, 메인 스레드 블로킹 제거를 검토하세요.',
        });
      }

      if (performance.cumulativeLayoutShift > 0.1) {
        recommendations.push({
          type: 'CORE_WEB_VITALS',
          severity: 'MEDIUM',
          message: `${result.page}의 CLS가 ${performance.cumulativeLayoutShift}로 0.1을 초과합니다.`,
          suggestion: '이미지 크기 지정, 동적 콘텐츠 로딩 최적화를 검토하세요.',
        });
      }
    });

    return recommendations;
  }

  async run() {
    console.log('🚀 성능 테스트 실행 시작...');

    try {
      // 1. Lighthouse 테스트
      await this.runLighthouseTests();

      // 2. WebPageTest (선택적)
      await this.runWebPageTest();

      // 3. 부하 테스트
      await this.runLoadTests();

      // 4. Firestore 테스트
      await this.runFirestoreTests();

      // 5. 요약 리포트 생성
      const report = this.generateSummaryReport();

      console.log('✅ 성능 테스트 완료!');
      console.log('📊 결과 요약:');
      console.log(`- 총 테스트: ${report.summary.totalTests}개`);
      console.log(
        `- 총 소요 시간: ${(report.summary.totalTime / 1000).toFixed(1)}초`
      );
      console.log(`- 권장사항: ${report.recommendations.length}개`);

      // 권장사항 출력
      if (report.recommendations.length > 0) {
        console.log('\n📋 권장사항:');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.severity}] ${rec.message}`);
          console.log(`   💡 ${rec.suggestion}`);
        });
      }
    } catch (error) {
      console.error('❌ 성능 테스트 실행 실패:', error);
      process.exit(1);
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  runner.run();
}

module.exports = { PerformanceTestRunner };
