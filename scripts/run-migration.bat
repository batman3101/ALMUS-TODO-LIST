@echo off
setlocal enabledelayedexpansion

echo 🚀 Firebase to Supabase 마이그레이션 시작!
echo ==========================================

:: 환경 변수 파일 확인
if not exist "scripts\.env.migration" (
    echo ❌ 환경 변수 파일이 없습니다.
    echo 1. scripts\.env.migration.example을 scripts\.env.migration으로 복사하세요.
    echo 2. 필요한 환경 변수를 설정하세요.
    pause
    exit /b 1
)

:: 환경 변수 로드
for /f "tokens=1,2 delims==" %%a in (scripts\.env.migration) do (
    set %%a=%%b
)

echo 📋 마이그레이션 전 체크리스트:
echo ✓ 환경 변수 파일 존재

:: Firebase 서비스 계정 파일 확인
if not exist "%FIREBASE_SERVICE_ACCOUNT_PATH%" (
    echo ❌ Firebase 서비스 계정 파일을 찾을 수 없습니다: %FIREBASE_SERVICE_ACCOUNT_PATH%
    pause
    exit /b 1
)
echo ✓ Firebase 서비스 계정 파일 존재

:: 백업 실행 여부 확인
if "%CREATE_BACKUP_BEFORE_MIGRATION%"=="true" (
    echo 📦 Firebase 데이터 백업 중...
    node scripts\backup-firebase-data.js
    if errorlevel 1 (
        echo ❌ 백업 실패
        pause
        exit /b 1
    )
    echo ✓ 백업 완료
)

:: 마이그레이션 실행 확인
echo.
echo ⚠️  주의: 이 작업은 Supabase 데이터베이스를 수정합니다.
set /p confirm="계속하시겠습니까? (y/N): "

if /i not "%confirm%"=="y" (
    echo ❌ 마이그레이션이 취소되었습니다.
    pause
    exit /b 0
)

:: 마이그레이션 실행
echo.
echo 🔄 마이그레이션 실행 중...
node scripts\migrate-firebase-to-supabase.js

if errorlevel 1 (
    echo ❌ 마이그레이션 실패
    pause
    exit /b 1
)

echo.
echo 🎉 마이그레이션 프로세스가 완료되었습니다!
echo 📊 migration-report.json 파일에서 상세 결과를 확인하세요.
pause