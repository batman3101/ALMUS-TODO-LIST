# Husky Windows 환경 문제 해결 가이드

## 문제 상황

Windows 환경에서 Git Bash 경로에 공백이 포함되어 있어 (`C:\Program Files\Git\bin\bash.exe`) husky와 lint-staged가 정상적으로 작동하지 않습니다.

## 임시 해결 방법

### 1. Husky 비활성화 모드

현재 Windows 환경에서는 자동으로 husky가 비활성화되도록 설정했습니다.

- `npm install` 시 husky가 설치되지 않음
- 커밋 시 pre-commit hook이 실행되지 않음

### 2. 수동으로 lint 실행

커밋하기 전에 수동으로 lint와 format을 실행하세요:

```bash
npm run lint
npm run format
```

### 3. 강제 커밋 (비권장)

hook을 무시하고 커밋하려면:

```bash
git commit --no-verify -m "your commit message"
```

## 영구 해결 방법

### 방법 1: WSL2 사용 (권장)

1. Windows Store에서 Ubuntu 설치
2. WSL2에서 프로젝트 개발
3. Linux 환경에서는 husky가 정상 작동

### 방법 2: Git 재설치

1. Git을 제거
2. 공백 없는 경로에 재설치 (예: `C:\Git`)
3. 환경 변수 업데이트

### 방법 3: CI/CD 활용

GitHub Actions에서 자동으로 lint와 format 검사를 수행하도록 설정

## Linux/macOS에서 husky 활성화

다른 팀원이 Linux나 macOS를 사용한다면:

```bash
npm run husky:install
```

이 명령으로 husky를 수동으로 설치할 수 있습니다.
