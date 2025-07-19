#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor() {
    this.migrationScript = path.join(__dirname, 'postgresql-to-firestore-migration.ts');
    this.checkpointPath = path.join(__dirname, '../data/migration-checkpoints.json');
  }

  async checkPrerequisites() {
    console.log('🔍 마이그레이션 사전 조건 확인...');
    
    const errors = [];

    // 1. 환경 변수 확인
    const requiredEnvVars = [
      'PG_HOST',
      'PG_DATABASE', 
      'PG_USER',
      'PG_PASSWORD'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`환경 변수 ${envVar}가 설정되지 않았습니다.`);
      }
    }

    // 2. Firebase 서비스 계정 파일 확인
    const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
      errors.push('Firebase 서비스 계정 파일이 없습니다: config/firebase-service-account.json');
    }

    // 3. TypeScript 컴파일러 확인
    try {
      execSync('npx tsc --version', { stdio: 'pipe' });
    } catch (error) {
      errors.push('TypeScript 컴파일러가 설치되지 않았습니다.');
    }

    if (errors.length > 0) {
      console.error('❌ 마이그레이션 사전 조건 확인 실패:');
      errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }

    console.log('✅ 마이그레이션 사전 조건 확인 완료');
    return true;
  }

  async backupCheckpoints() {
    if (fs.existsSync(this.checkpointPath)) {
      const backupPath = `${this.checkpointPath}.backup.${Date.now()}`;
      fs.copyFileSync(this.checkpointPath, backupPath);
      console.log(`📦 체크포인트 백업 생성: ${backupPath}`);
    }
  }

  async runMigration() {
    console.log('🚀 PostgreSQL → Firestore 마이그레이션 시작...');
    
    try {
      // 1. 사전 조건 확인
      const prerequisitesOk = await this.checkPrerequisites();
      if (!prerequisitesOk) {
        process.exit(1);
      }

      // 2. 체크포인트 백업
      await this.backupCheckpoints();

      // 3. TypeScript 컴파일
      console.log('🔨 TypeScript 컴파일 중...');
      execSync(`npx tsc ${this.migrationScript} --outDir ./dist`, { stdio: 'inherit' });

      // 4. 마이그레이션 실행
      console.log('🔄 마이그레이션 실행 중...');
      const compiledScript = path.join(__dirname, '../dist/scripts/postgresql-to-firestore-migration.js');
      execSync(`node ${compiledScript}`, { stdio: 'inherit' });

      console.log('✅ 마이그레이션이 성공적으로 완료되었습니다!');
      
    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error.message);
      process.exit(1);
    }
  }

  async validateMigration() {
    console.log('🔍 마이그레이션 검증 시작...');
    
    try {
      // 검증 스크립트 실행
      const validationScript = path.join(__dirname, 'validate-migration.ts');
      if (fs.existsSync(validationScript)) {
        execSync(`npx ts-node ${validationScript}`, { stdio: 'inherit' });
      } else {
        console.log('⚠️ 검증 스크립트가 없습니다.');
      }
      
    } catch (error) {
      console.error('❌ 마이그레이션 검증 실패:', error.message);
    }
  }

  async rollbackMigration() {
    console.log('🔄 마이그레이션 롤백 시작...');
    
    try {
      // 롤백 스크립트 실행
      const rollbackScript = path.join(__dirname, 'rollback-migration.ts');
      if (fs.existsSync(rollbackScript)) {
        execSync(`npx ts-node ${rollbackScript}`, { stdio: 'inherit' });
        console.log('✅ 마이그레이션 롤백 완료');
      } else {
        console.log('⚠️ 롤백 스크립트가 없습니다.');
      }
      
    } catch (error) {
      console.error('❌ 마이그레이션 롤백 실패:', error.message);
    }
  }

  showUsage() {
    console.log(`
📋 PostgreSQL → Firestore 마이그레이션 도구

사용법:
  node scripts/run-migration.js [명령어]

명령어:
  run        마이그레이션 실행 (기본값)
  validate   마이그레이션 검증
  rollback   마이그레이션 롤백
  help       도움말 표시

환경 변수:
  PG_HOST        PostgreSQL 호스트 (기본값: localhost)
  PG_PORT        PostgreSQL 포트 (기본값: 5432)
  PG_DATABASE    PostgreSQL 데이터베이스명
  PG_USER        PostgreSQL 사용자명
  PG_PASSWORD    PostgreSQL 비밀번호

예시:
  PG_HOST=localhost PG_DATABASE=almus_todo PG_USER=postgres PG_PASSWORD=password node scripts/run-migration.js run
    `);
  }
}

// 메인 실행 함수
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2] || 'run';

  switch (command) {
    case 'run':
      await runner.runMigration();
      break;
    case 'validate':
      await runner.validateMigration();
      break;
    case 'rollback':
      await runner.rollbackMigration();
      break;
    case 'help':
      runner.showUsage();
      break;
    default:
      console.error(`❌ 알 수 없는 명령어: ${command}`);
      runner.showUsage();
      process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MigrationRunner }; 