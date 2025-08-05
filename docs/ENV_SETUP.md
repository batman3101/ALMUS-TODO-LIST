# 환경 변수 설정 가이드

## 통합 .env 파일 사용 방법

### 1. 단일 .env 파일 구성

프로젝트 루트에 하나의 `.env` 파일을 만들어 모든 환경 변수를 관리할 수 있습니다.

```bash
# 프로젝트 루트에서
cp .env.unified.example .env
```

### 2. 파일 구조

```
ALMUS ToDo List/
├── .env                    # 모든 환경 변수 (Git에서 제외)
├── .env.unified.example    # 통합 예제 파일
├── apps/
│   └── web-app/
│       └── (자동으로 루트 .env 사용)
└── scripts/
    └── (자동으로 루트 .env 사용)
```

### 3. Vite 설정

Vite는 기본적으로 다음 순서로 .env 파일을 찾습니다:
1. `apps/web-app/.env` (로컬)
2. `.env` (프로젝트 루트)

루트 .env만 사용하려면 `apps/web-app/.env` 파일을 삭제하면 됩니다.

### 4. 스크립트에서 사용

```javascript
// scripts/migrate.js
import dotenv from 'dotenv';
import path from 'path';

// 루트 .env 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 환경 변수 사용
const supabaseUrl = process.env.SUPABASE_URL;
```

### 5. package.json 스크립트 수정

```json
{
  "scripts": {
    "dev": "dotenv -e ../../.env -- vite",
    "build": "dotenv -e ../../.env -- vite build"
  }
}
```

또는 더 간단하게:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

### 6. TypeScript 타입 정의

```typescript
// types/env.d.ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_BASE_URL: string
  // ... 기타 VITE_ 환경 변수
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Node.js 환경 변수
declare namespace NodeJS {
  interface ProcessEnv {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    NODE_ENV: 'development' | 'production' | 'test'
    // ... 기타 서버 환경 변수
  }
}
```

### 7. 보안 주의사항

1. **절대 커밋하지 마세요**: `.env` 파일은 반드시 `.gitignore`에 포함
2. **접두사 규칙 준수**:
   - `VITE_`: 클라이언트에 노출되어도 안전한 변수
   - 접두사 없음: 서버에서만 사용하는 민감한 변수
3. **Service Role Key**: 절대 `VITE_` 접두사를 사용하지 마세요

### 8. 환경별 설정

개발/스테이징/프로덕션 환경을 구분하려면:

```bash
# 개발
cp .env.development .env

# 프로덕션
cp .env.production .env
```

또는 환경 변수로 제어:

```bash
# 개발 실행
NODE_ENV=development npm run dev

# 프로덕션 빌드
NODE_ENV=production npm run build
```

### 9. 문제 해결

#### Vite가 환경 변수를 읽지 못할 때:
1. 파일 경로 확인
2. `VITE_` 접두사 확인
3. 서버 재시작

#### 스크립트에서 환경 변수를 읽지 못할 때:
```javascript
// 명시적으로 경로 지정
import { config } from 'dotenv';
config({ path: '../../.env' });
```

### 10. 장점

- **단일 소스**: 하나의 파일에서 모든 설정 관리
- **일관성**: 모든 앱/스크립트가 동일한 설정 사용
- **유지보수 용이**: 한 곳에서 수정하면 전체 적용
- **배포 간소화**: 하나의 .env 파일만 관리