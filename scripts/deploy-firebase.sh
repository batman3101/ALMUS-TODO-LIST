#!/bin/bash

# Firebase 배포 스크립트
# 사용법: ./scripts/deploy-firebase.sh [environment]

set -e

# 환경 변수 설정
ENVIRONMENT=${1:-production}
PROJECT_ID="almus-todo-app"

echo "🚀 Firebase 배포 시작..."
echo "환경: $ENVIRONMENT"
echo "프로젝트: $PROJECT_ID"

# Firebase CLI 설치 확인
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI가 설치되지 않았습니다. 설치 중..."
    npm install -g firebase-tools
fi

# Firebase 로그인 확인
if ! firebase projects:list &> /dev/null; then
    echo "Firebase에 로그인되어 있지 않습니다."
    firebase login
fi

# 프로젝트 설정
echo "프로젝트 설정 중..."
firebase use $PROJECT_ID

# 의존성 설치
echo "의존성 설치 중..."
npm ci
cd apps/web-app && npm ci && cd ../..
cd functions && npm ci && cd ..

# 빌드
echo "애플리케이션 빌드 중..."
cd apps/web-app
npm run build
cd ../..

cd functions
npm run build
cd ..

# 배포
echo "Firebase에 배포 중..."

if [ "$ENVIRONMENT" = "production" ]; then
    # 프로덕션 배포
    firebase deploy --project $PROJECT_ID
else
    # 스테이징 배포
    firebase deploy --project $PROJECT_ID --only hosting:staging
fi

echo "✅ 배포 완료!"

# 배포 후 확인
echo "배포 확인 중..."
sleep 10

# Health Check
echo "Health Check 실행 중..."

# Firebase Hosting 확인
HOSTING_URL="https://$PROJECT_ID.web.app"
echo "Hosting URL: $HOSTING_URL"
if curl -f "$HOSTING_URL" > /dev/null 2>&1; then
    echo "✅ Firebase Hosting 정상 작동"
else
    echo "❌ Firebase Hosting 접근 실패"
    exit 1
fi

# Firebase Functions 확인 (선택적)
FUNCTIONS_URL="https://asia-northeast3-$PROJECT_ID.cloudfunctions.net"
echo "Functions URL: $FUNCTIONS_URL"
if curl -f "$FUNCTIONS_URL" > /dev/null 2>&1; then
    echo "✅ Firebase Functions 정상 작동"
else
    echo "⚠️ Firebase Functions 접근 실패 (선택적)"
fi

echo "🎉 배포 및 확인 완료!"
echo "Firebase Hosting: $HOSTING_URL"
echo "Firebase Functions: $FUNCTIONS_URL" 