#!/bin/bash

# Firebase to Supabase 마이그레이션 실행 스크립트

set -e

echo "🚀 Firebase to Supabase 마이그레이션 시작!"
echo "=========================================="

# 환경 변수 파일 확인
if [ ! -f "./scripts/.env.migration" ]; then
    echo "❌ 환경 변수 파일이 없습니다."
    echo "1. scripts/.env.migration.example을 scripts/.env.migration으로 복사하세요."
    echo "2. 필요한 환경 변수를 설정하세요."
    exit 1
fi

# 환경 변수 로드
source ./scripts/.env.migration

echo "📋 마이그레이션 전 체크리스트:"
echo "✓ 환경 변수 파일 존재"

# Firebase 서비스 계정 파일 확인
if [ ! -f "$FIREBASE_SERVICE_ACCOUNT_PATH" ]; then
    echo "❌ Firebase 서비스 계정 파일을 찾을 수 없습니다: $FIREBASE_SERVICE_ACCOUNT_PATH"
    exit 1
fi
echo "✓ Firebase 서비스 계정 파일 존재"

# Supabase 연결 테스트
echo "🔍 Supabase 연결 테스트 중..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
supabase.from('users').select('count').limit(1).then(({error}) => {
  if (error) {
    console.error('❌ Supabase 연결 실패:', error.message);
    process.exit(1);
  } else {
    console.log('✓ Supabase 연결 성공');
  }
});
"

# 백업 실행 여부 확인
if [ "${CREATE_BACKUP_BEFORE_MIGRATION:-true}" = "true" ]; then
    echo "📦 Firebase 데이터 백업 중..."
    node ./scripts/backup-firebase-data.js
    echo "✓ 백업 완료"
fi

# 마이그레이션 실행 확인
echo ""
echo "⚠️  주의: 이 작업은 Supabase 데이터베이스를 수정합니다."
echo "계속하시겠습니까? (y/N)"
read -r confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ 마이그레이션이 취소되었습니다."
    exit 0
fi

# 마이그레이션 실행
echo ""
echo "🔄 마이그레이션 실행 중..."
node ./scripts/migrate-firebase-to-supabase.js

echo ""
echo "🎉 마이그레이션 프로세스가 완료되었습니다!"
echo "📊 migration-report.json 파일에서 상세 결과를 확인하세요."