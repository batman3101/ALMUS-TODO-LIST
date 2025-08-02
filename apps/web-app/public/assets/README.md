# Web App Public Assets

웹 애플리케이션의 공개 에셋 폴더입니다. 이 폴더의 파일들은 브라우저에서 직접 접근 가능합니다.

## 폴더 구조

### `/favicons`
- 파비콘 파일들 (favicon.ico, apple-touch-icon.png 등)
- 다양한 크기의 앱 아이콘들
- 브라우저 탭과 북마크에 표시되는 아이콘들

**추천 파일들:**
- `favicon.ico` (16x16, 32x32)
- `apple-touch-icon.png` (180x180)
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

### `/logos`
- 회사/프로젝트 로고 파일들
- 다양한 크기와 형식의 로고
- 브랜딩에 사용되는 로고 변형들

**사용 예시:**
- 헤더/네비게이션 로고
- 로딩 스크린 로고
- 이메일 서명용 로고

### `/icons`
- UI에서 사용되는 아이콘들
- SVG, PNG 형식의 아이콘 파일들
- 버튼, 메뉴, 기능별 아이콘들

### `/images`
- 일반적인 이미지 파일들
- 배경 이미지, 일러스트레이션
- 컨텐츠용 이미지들

## 파일 명명 규칙

- 소문자와 하이픈 사용: `app-logo.png`
- 크기 포함: `logo-192x192.png`
- 용도 명시: `hero-background.jpg`
- 형식 명시: `icon-arrow.svg`

## 접근 방법

```jsx
// React 컴포넌트에서 사용
<img src="/assets/logos/app-logo.png" alt="App Logo" />

// CSS에서 사용
background-image: url('/assets/images/hero-bg.jpg');
```