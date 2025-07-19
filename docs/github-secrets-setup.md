# GitHub Secrets 설정 가이드

Firebase CI/CD 파이프라인을 위한 GitHub Secrets 설정 방법입니다.

## 필수 Secrets

### Firebase 관련

1. **FIREBASE_SERVICE_ACCOUNT**
   - Firebase 서비스 계정 JSON 파일의 내용
   - Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
   - 전체 JSON 내용을 복사하여 설정

2. **FIREBASE_TOKEN**
   - Firebase CLI 토큰
   - 터미널에서 `firebase login:ci` 실행 후 얻은 토큰

### 환경 변수

3. **VITE_FIREBASE_API_KEY**
   - Firebase 프로젝트 설정 → 일반 → 웹 API 키

4. **VITE_FIREBASE_AUTH_DOMAIN**
   - Firebase 프로젝트 설정 → 일반 → 인증 도메인

5. **VITE_FIREBASE_PROJECT_ID**
   - Firebase 프로젝트 ID (예: almus-todo-app)

6. **VITE_FIREBASE_STORAGE_BUCKET**
   - Firebase Storage 버킷 URL

7. **VITE_FIREBASE_MESSAGING_SENDER_ID**
   - Firebase 프로젝트 설정 → 클라우드 메시징 → 발신자 ID

8. **VITE_FIREBASE_APP_ID**
   - Firebase 프로젝트 설정 → 일반 → 앱 ID

9. **VITE_FIREBASE_VAPID_KEY**
   - Firebase 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서

10. **VITE_FUNCTIONS_URL**
    - Firebase Functions URL (예: https://asia-northeast3-almus-todo-app.cloudfunctions.net)

### 알림 (선택적)

11. **SLACK_WEBHOOK_URL**
    - Slack Incoming Webhook URL
    - 배포 실패 시 알림용

## 설정 방법

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 위의 각 항목에 대해 이름과 값을 설정

## 예시

```bash
# Firebase CLI 토큰 생성
firebase login:ci

# 서비스 계정 키 다운로드
# Firebase Console에서 다운로드한 JSON 파일 내용을 FIREBASE_SERVICE_ACCOUNT에 설정
```

## 확인 방법

1. GitHub Actions 탭에서 워크플로우 실행 확인
2. Firebase Console에서 배포된 Functions 및 Hosting 확인
3. 배포된 URL 접속하여 정상 작동 확인

## 문제 해결

### 일반적인 오류

1. **FIREBASE_SERVICE_ACCOUNT 오류**
   - JSON 형식이 올바른지 확인
   - 서비스 계정에 적절한 권한이 있는지 확인

2. **FIREBASE_TOKEN 오류**
   - 토큰이 만료되었을 수 있음
   - `firebase login:ci`로 새 토큰 생성

3. **환경 변수 오류**
   - 모든 VITE_ 변수가 설정되었는지 확인
   - Firebase 프로젝트 설정에서 정확한 값 확인

### 로그 확인

- GitHub Actions → 워크플로우 → 실행 → 로그 확인
- Firebase Console → Functions → 로그 확인
- Firebase Console → Hosting → 로그 확인 