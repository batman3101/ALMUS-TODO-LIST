# Firebase 연결 상태 점검 가이드

## 🔍 자동 연결 진단 도구

### 1. 환경 변수 검증 스크립트

이 스크립트를 `package.json`에 추가하세요:

```json
{
  "scripts": {
    "check-env": "node scripts/check-firebase-env.js",
    "check-firebase": "node scripts/check-firebase-connection.js"
  }
}
```

### 2. 환경 변수 검증 스크립트 생성

**파일 위치**: `scripts/check-firebase-env.js`

```javascript
#!/usr/bin/env node

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

console.log(chalk.blue('🔥 Firebase 환경 변수 검증 시작\n'));

// 필수 환경 변수 목록
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// .env 파일 확인
const envPath = path.join(process.cwd(), '.env');
let envExists = false;
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  envExists = true;
  console.log(chalk.green('✅ .env 파일 발견'));
} catch (error) {
  console.log(chalk.red('❌ .env 파일이 없습니다'));
  console.log(chalk.yellow('   → .env.example을 복사하여 .env 파일을 생성하세요'));
}

// 환경 변수 검증
let allValid = true;
const results = [];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  const isValid = value && value.trim() !== '' && !value.includes('your-');
  
  results.push({
    name: varName,
    value: value,
    isValid: isValid,
    status: isValid ? '✅' : '❌'
  });
  
  if (!isValid) {
    allValid = false;
  }
});

// 결과 출력
console.log('\n📋 환경 변수 검증 결과:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

results.forEach(result => {
  const valueDisplay = result.value 
    ? (result.value.length > 20 ? result.value.substring(0, 20) + '...' : result.value)
    : '(비어있음)';
    
  console.log(`${result.status} ${result.name.padEnd(35)} ${valueDisplay}`);
  
  if (!result.isValid) {
    if (!result.value) {
      console.log(chalk.red(`   → ${result.name} 값이 설정되지 않았습니다`));
    } else if (result.value.includes('your-')) {
      console.log(chalk.red(`   → ${result.name} 값이 더미 값입니다. 실제 값으로 교체하세요`));
    }
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 최종 결과
if (allValid) {
  console.log(chalk.green('\n🎉 모든 환경 변수가 올바르게 설정되었습니다!'));
  console.log(chalk.blue('   → npm run check-firebase 명령으로 연결 테스트를 진행하세요'));
} else {
  console.log(chalk.red('\n❌ 일부 환경 변수에 문제가 있습니다'));
  console.log(chalk.yellow('\n🔧 해결 방법:'));
  console.log('   1. Firebase Console에서 프로젝트 설정 → 일반 → 웹 앱 선택');
  console.log('   2. "SDK 설정 및 구성" 섹션에서 config 객체 복사');
  console.log('   3. .env 파일에 VITE_ 접두사와 함께 값 설정');
  console.log('   4. 서버 재시작 후 다시 확인');
  
  process.exit(1);
}

// .env 파일 보안 검증
if (envExists) {
  console.log(chalk.blue('\n🔒 보안 검증:'));
  
  // .gitignore 확인
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  try {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('.env')) {
      console.log(chalk.green('✅ .env 파일이 .gitignore에 포함됨'));
    } else {
      console.log(chalk.red('❌ .env 파일이 .gitignore에 없습니다'));
      console.log(chalk.yellow('   → .gitignore에 .env 추가 필요'));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  .gitignore 파일을 확인할 수 없습니다'));
  }
}

console.log(chalk.blue('\n📖 상세한 설정 가이드:'));
console.log('   → docs/firebase-quick-start.md');
console.log('   → docs/firebase-troubleshooting.md');
```

### 3. Firebase 연결 테스트 스크립트

**파일 위치**: `scripts/check-firebase-connection.js`

```javascript
#!/usr/bin/env node

const chalk = require('chalk');

// Firebase 초기화 테스트
async function testFirebaseConnection() {
  console.log(chalk.blue('🔥 Firebase 연결 테스트 시작\n'));
  
  try {
    // 동적 import 사용 (ES modules)
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, connectFirestoreEmulator, collection, getDocs, limit, query } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');
    const { getStorage } = await import('firebase/storage');
    
    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID
    };
    
    console.log('📱 Firebase 앱 초기화 중...');
    const app = initializeApp(firebaseConfig);
    console.log(chalk.green('✅ Firebase 앱 초기화 성공'));
    
    // Firestore 연결 테스트
    console.log('🗄️  Firestore 연결 테스트 중...');
    const db = getFirestore(app);
    
    // 간단한 쿼리 테스트 (빈 컬렉션이어도 OK)
    const testQuery = query(collection(db, 'test'), limit(1));
    await getDocs(testQuery);
    console.log(chalk.green('✅ Firestore 연결 성공'));
    
    // Auth 서비스 테스트
    console.log('🔐 Firebase Auth 연결 테스트 중...');
    const auth = getAuth(app);
    console.log(chalk.green('✅ Firebase Auth 연결 성공'));
    
    // Storage 서비스 테스트  
    console.log('📁 Firebase Storage 연결 테스트 중...');
    const storage = getStorage(app);
    console.log(chalk.green('✅ Firebase Storage 연결 성공'));
    
    console.log(chalk.green('\n🎉 모든 Firebase 서비스 연결 성공!'));
    console.log(chalk.blue('\n📋 다음 단계:'));
    console.log('   1. firebase deploy --only firestore:indexes');
    console.log('   2. firebase deploy --only firestore:rules'); 
    console.log('   3. npm run dev (개발 서버 시작)');
    
  } catch (error) {
    console.log(chalk.red('\n❌ Firebase 연결 실패'));
    console.log(chalk.red('오류 내용:', error.message));
    
    // 일반적인 오류 해결 가이드
    if (error.message.includes('API key')) {
      console.log(chalk.yellow('\n🔧 해결 방법:'));
      console.log('   → API 키가 잘못되었습니다');
      console.log('   → Firebase Console에서 올바른 API 키를 확인하세요');
    } else if (error.message.includes('project')) {
      console.log(chalk.yellow('\n🔧 해결 방법:'));
      console.log('   → 프로젝트 ID가 잘못되었습니다');
      console.log('   → Firebase Console에서 올바른 프로젝트 ID를 확인하세요');
    } else if (error.message.includes('permission')) {
      console.log(chalk.yellow('\n🔧 해결 방법:'));
      console.log('   → Firestore 보안 규칙을 확인하세요');
      console.log('   → firebase deploy --only firestore:rules');
    }
    
    console.log(chalk.blue('\n📖 자세한 문제 해결:'));
    console.log('   → docs/firebase-troubleshooting.md');
    
    process.exit(1);
  }
}

// 환경 변수 로드
require('dotenv').config();

// 연결 테스트 실행
testFirebaseConnection();
```

### 4. 사용법

#### 4.1 환경 변수 검증

```bash
# 환경 변수 검증 
npm run check-env

# 결과 예시:
# 🔥 Firebase 환경 변수 검증 시작
# ✅ .env 파일 발견
# 📋 환경 변수 검증 결과:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ✅ VITE_FIREBASE_API_KEY              AIzaSyExample...
# ✅ VITE_FIREBASE_AUTH_DOMAIN          project.firebaseapp.com
# ❌ VITE_FIREBASE_PROJECT_ID           your-project-id
#    → VITE_FIREBASE_PROJECT_ID 값이 더미 값입니다
```

#### 4.2 Firebase 연결 테스트

```bash
# Firebase 연결 테스트
npm run check-firebase

# 결과 예시:
# 🔥 Firebase 연결 테스트 시작
# 📱 Firebase 앱 초기화 중...
# ✅ Firebase 앱 초기화 성공
# 🗄️  Firestore 연결 테스트 중...
# ✅ Firestore 연결 성공
# 🎉 모든 Firebase 서비스 연결 성공!
```

### 5. 자동화 통합

#### 5.1 개발 서버 시작 전 자동 체크

`package.json` 수정:

```json
{
  "scripts": {
    "dev": "npm run check-env && vite",
    "build": "npm run check-env && npm run check-firebase && vite build"
  }
}
```

#### 5.2 CI/CD 파이프라인 통합

```yaml
# .github/workflows/firebase-check.yml
name: Firebase Connection Check

on: [push, pull_request]

jobs:
  check-firebase:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Check Firebase Environment
        run: npm run check-env
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
```

### 6. 문제별 자동 진단

#### 6.1 일반적인 오류 패턴

1. **환경 변수 누락**
   ```
   ❌ VITE_FIREBASE_API_KEY (비어있음)
   → VITE_FIREBASE_API_KEY 값이 설정되지 않았습니다
   ```

2. **더미 값 사용**
   ```
   ❌ VITE_FIREBASE_PROJECT_ID your-project-id
   → VITE_FIREBASE_PROJECT_ID 값이 더미 값입니다
   ```

3. **프로젝트 액세스 오류**
   ```
   ❌ Firebase 연결 실패
   오류 내용: Project 'invalid-project' not found
   ```

#### 6.2 해결 가이드 자동 표시

스크립트가 오류를 감지하면 자동으로 관련 해결 가이드를 표시합니다:

- 환경 변수 오류 → Firebase Console 설정 가이드
- 연결 오류 → 보안 규칙 및 권한 가이드  
- 인덱스 오류 → 인덱스 설정 가이드

### 7. 모니터링 및 알림

#### 7.1 개발 환경 상태 모니터링

```bash
# 주기적 연결 상태 확인 (cron job 등에서 사용)
npm run check-firebase && echo "✅ Firebase 정상" || echo "❌ Firebase 오류"
```

#### 7.2 Slack/Discord 알림 통합

```javascript
// scripts/firebase-monitor.js
const { WebhookClient } = require('discord.js');

async function notifyStatus(status, message) {
  const webhook = new WebhookClient({ 
    url: process.env.DISCORD_WEBHOOK_URL 
  });
  
  await webhook.send({
    content: `🔥 Firebase Status: ${status}\n${message}`,
    username: 'Firebase Monitor'
  });
}
```

---

**⚠️ 중요**: 이 도구들을 사용하여 Firebase 연결 문제를 사전에 방지하고, 문제 발생 시 빠른 진단이 가능합니다.

**🔗 관련 문서**: 
- [Firebase 빠른 시작 가이드](./firebase-quick-start.md)
- [Firebase 문제 해결 가이드](./firebase-troubleshooting.md)
- [Firestore 인덱스 설정 가이드](./firestore-indexes-setup.md)