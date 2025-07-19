# ALMUS Todo List

소규모 팀을 위한 멀티플랫폼(웹·모바일·데스크톱) 업무 관리 SaaS입니다.

## 🚀 기술 스택

### 프론트엔드
- **웹앱**: React + TypeScript, Redux Toolkit, React Query
- **모바일앱**: React Native (Expo)
- **데스크톱앱**: Electron (PWA 기반)

### 백엔드
- **API**: Node.js (NestJS), GraphQL Gateway + REST Fallback
- **데이터베이스**: PostgreSQL (파티셔닝), Redis
- **인증**: OAuth2, JWT

### 인프라
- **컨테이너**: Docker, Kubernetes (EKS)
- **클라우드**: AWS (EKS, RDS, S3, CloudFront, SNS)
- **CI/CD**: GitHub Actions → Docker → ArgoCD
- **모니터링**: ELK Stack, Prometheus + Grafana

## 📁 프로젝트 구조

```
/
├── apps/
│   ├── web-app/          # React 웹앱
│   ├── mobile-app/       # React Native 모바일앱
│   └── desktop-app/      # Electron 데스크톱앱
├── services/
│   ├── auth-service/     # 인증 서비스
│   ├── task-service/     # 태스크 관리 서비스
│   ├── board-service/    # 보드 관리 서비스
│   └── notification-service/ # 알림 서비스
├── libs/
│   ├── shared-types/     # 공통 타입 정의
│   └── shared-utils/     # 공통 유틸리티
├── infra/
│   ├── terraform/        # AWS 인프라 코드
│   └── k8s/             # Kubernetes 매니페스트
└── scripts/
    └── migrate/         # DB 마이그레이션 스크립트
```

## 🛠️ 개발 환경 설정

### 필수 요구사항
- Node.js 18.x 이상
- Yarn 1.22.x 이상
- Docker Desktop
- Git

### 설치 및 실행

1. **의존성 설치**
   ```bash
   yarn install
   ```

2. **개발 서버 실행**
   ```bash
   # 모든 앱/서비스 개발 서버 실행
   yarn dev
   
   # 특정 앱만 실행
   yarn workspace @almus/web-app dev
   yarn workspace @almus/mobile-app start
   ```

3. **코드 품질 검사**
   ```bash
   # 린트 검사
   yarn lint
   
   # 코드 포맷팅
   yarn format
   
   # 테스트 실행
   yarn test
   ```

## 🚀 배포

### CI/CD 파이프라인
- GitHub Actions를 통한 자동 빌드 및 테스트
- Docker 이미지 빌드 및 컨테이너 레지스트리 푸시
- ArgoCD를 통한 Kubernetes 배포

### 인프라 프로비저닝
```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

## 📋 주요 기능

### 핵심 기능
- ✅ Task/TODO CRUD
- ✅ 그리드 뷰 (엑셀 유사)
- ✅ 칸반 뷰 (Drag & Drop)
- ✅ 간트 차트 뷰
- ✅ 팀 협업 (멘션, 댓글, 파일 첨부)
- ✅ 다국어 지원 (한국어·베트남어)
- ✅ 알림·리마인더
- ✅ 권한 관리
- ✅ 대시보드

### 지원 기능
- OAuth(Google, Microsoft) 로그인
- 다크 모드·접근성
- 오프라인 캐싱(PWA)
- Slack·Teams·KakaoTalk 통합 알림
- 캘린더 연동
- API 공개(REST·GraphQL)

## 🔧 개발 가이드

### 코드 컨벤션
- **ESLint**: TypeScript 린팅
- **Prettier**: 코드 포맷팅
- **Husky**: Git 훅
- **Commitlint**: 커밋 메시지 검증

### 커밋 메시지 규칙
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert

### 테스트 전략
- **Unit Tests**: 70% (빠르고 격리된 테스트)
- **Integration Tests**: 20% (모듈 경계 테스트)
- **Acceptance Tests**: 10% (사용자 시나리오 테스트)

## 📊 성능 목표
- 평균 페이지 응답 ≤1초
- 가용성 99.9%
- 10k Task 데이터셋 로드 2초 이내
- 동시 편집 충돌 방지 (OT 기반)

## 🔒 보안
- OAuth2, JWT 인증
- AES-256 at-rest 암호화
- GDPR & ISO 27001 준수
- HTTPS 강제, CSP, Input Validation

## 📈 모니터링
- ELK Stack 로그 저장
- Prometheus 메트릭 수집
- Grafana 대시보드
- 실시간 알림

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 지원

- 이슈: [GitHub Issues](https://github.com/almus/todo-list/issues)
- 문서: [Wiki](https://github.com/almus/todo-list/wiki)
- 이메일: support@almus-todo.com 