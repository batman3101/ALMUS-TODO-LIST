# 프로젝트 구조 및 데이터 흐름

이 문서는 ALMUS ToDo List 모노레포의 상위 구조, 핵심 모듈, 데이터 흐름(Supabase/Realtime/NestJS)과 주요 소스 파일의 역할을 요약합니다. 신규 기여자가 5분 내 구조를 파악하는 것을 목표로 합니다.

## 최상위 구조 개요

```
/
├── apps
│   ├── web-app                  # Vite + React + TS 프런트엔드
│   ├── mobile-app               # React Native (Expo)
│   └── desktop-app              # Electron 래퍼 (PWA 기반)
├── services
│   ├── auth-service             # 인증(OAuth/JWT), NestJS
│   ├── task-service             # 태스크(REST+GraphQL), NestJS + TypeORM
│   └── notification-service     # 알림/스케줄러, NestJS + TypeORM
├── libs
│   └── shared-types             # 공통 타입(스키마/열거형) 공유
├── lib
│   └── supabase                 # Supabase 클라이언트/SSR/middleware/타입
├── database, supabase/sql, scripts  # SQL 스키마/RLS/RPC/마이그레이션 스크립트
├── infra                        # k8s/terraform 매니페스트
└── .github/workflows            # CI 구성
```

## 핵심 모듈과 파일

### 프런트엔드 `apps/web-app`
- 인증 훅: `src/hooks/useAuth.ts`
  - `supabase.auth.getSession()` 기반 세션 로딩
  - 사용자 상태(`AuthUser`) 생성 및 로컬 상태 관리
  - `updateUser()`로 `public.users` 일부 필드 업데이트 지원
- 데이터 접근: `src/services/api.ts`
  - Supabase PostgREST를 직접 호출(`tasks`, `teams`, `projects`, `comments`, `users` 등)
  - RPC: `invite_team_member`, `get_team_analytics`, `get_user_task_stats`
- 실시간: `src/services/realtime.ts`
  - Supabase Realtime 추상화(테이블 변경 구독, Presence, Broadcast)
- 협업 WS(옵션): `src/services/websocket.ts`
  - socket.io 클라이언트(별도 WS 서버 가정)
- UI: `src/components/*` (칸반/간트/리스트/팀 관리 등)
- 앱 엔트리: `src/main.tsx` (React Query 전역 옵션), `src/App.tsx`

### 공용 타입 `libs/shared-types`
- DB 스키마/열거형/공용 타입을 앱/서비스 간 공유

### Supabase 유틸 `lib/supabase`
- 브라우저 클라이언트: `client.ts`
  - `createClient<Database>(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`
  - 환경 미설정 시 Mock 모드로 폴백(데모 용도)
- 서버/SSR: `server.ts`, `middleware.ts` (Next.js 호환 유틸)
- 타입: `database.types.ts`, 연결 점검: `connection-test.ts`

### 백엔드 서비스 `services/*` (NestJS)
- `auth-service`
  - 엔트리: `src/main.ts`, 루트 모듈: `src/app.module.ts`
  - OAuth/JWT, 가드/데코레이터/리졸버 구성
- `task-service`
  - 엔트리: `src/main.ts`, 루트 모듈: `src/app.module.ts`
  - TypeORM(Postgres) 연결, REST + GraphQL(`task.resolver.ts`)
- `notification-service`
  - 엔트리: `src/main.ts`, 루트 모듈: `src/app.module.ts`
  - TypeORM + `@nestjs/schedule` 기반 템플릿/스케줄링

## 시스템 상호작용 다이어그램

```mermaid
graph TD
  subgraph Apps
    WA["apps/web-app (Vite React)"]
    MA["apps/mobile-app (RN)"]
    DA["apps/desktop-app (Electron)"]
  end

  subgraph Libs
    ST["libs/shared-types"]
    SB["lib/supabase/client.ts (supabase-js)"]
  end

  subgraph Services[NestJS Services]
    AS["services/auth-service"]
    TS["services/task-service (REST+GraphQL)"]
    NS["services/notification-service"]
  end

  subgraph Data
    SUPA["Supabase (Auth + PostgREST + Realtime)"]
    PG["PostgreSQL (TypeORM)"]
  end

  WA --> SB
  WA -. Realtime .-> SUPA
  WA -. socket.io .->|"websocket.ts"| Services
  ST --> WA
  ST --> Services

  AS --> PG
  TS --> PG
  NS --> PG

  SB --> SUPA
  Services --> PG
```

## 데이터 흐름 요약
- 클라이언트(웹앱)는 Supabase-js로 인증/DB/Realtime에 직접 접근
- 서버 상태는 React Query로 캐싱(오프라인 친화적 설정)
- 실시간 갱신은 Realtime 구독으로 UI 반영
- 별도 복잡 로직/집계는 RPC(Postgres 함수) 또는 Nest 서비스로 확장

## 컨벤션
- 언어/도구: TypeScript, React, NestJS, TypeORM, Supabase
- 네이밍: 타입/클래스 파스칼, 변수/함수 카멜, 상수 UPPER_SNAKE_CASE
- 아키텍처: 기능 기준 폴더, 컨트롤러/서비스/엔티티 계층화, 공용 타입 공유

## 문서 유지보수 가이드
- 모듈/파일 이동 시 본 문서의 경로와 다이어그램 노드를 함께 갱신하세요.
- Supabase 테이블/함수 추가 시 `api.ts` 사용처와 RPC 목록을 업데이트하세요.
- 큰 구조 변경 시 루트 `README.md`에도 링크를 추가/갱신하세요.
