# Mobile App Assets

모바일 애플리케이션 전용 에셋 폴더입니다.

## 폴더 구조

### `/icons`
- 앱 아이콘들 (iOS/Android)
- 탭바 아이콘들
- 네비게이션 아이콘들

**iOS 아이콘 크기:**
- 20x20, 29x29, 40x40, 58x58, 60x60, 80x80, 87x87, 120x120, 180x180, 1024x1024

**Android 아이콘 크기:**
- 36x36 (ldpi), 48x48 (mdpi), 72x72 (hdpi), 96x96 (xhdpi), 144x144 (xxhdpi), 192x192 (xxxhdpi)

### `/images`
- 앱 내에서 사용되는 이미지들
- 온보딩 이미지들
- 튜토리얼 이미지들

### `/splash`
- 스플래시 스크린 이미지들
- 로딩 화면 이미지들

**스플래시 스크린 크기 (iOS):**
- iPhone: 750x1334, 828x1792, 1125x2436, 1242x2688
- iPad: 1536x2048, 2048x2732

**스플래시 스크린 크기 (Android):**
- 다양한 density에 맞는 크기들

## 파일 명명 규칙

### iOS
```
AppIcon-20@1x.png
AppIcon-20@2x.png
AppIcon-20@3x.png
```

### Android
```
ic_launcher.png
ic_launcher_round.png
```

## 플랫폼별 요구사항

### iOS
- PNG 형식 필수
- 알파 채널 없음 (앱 아이콘)
- 투명도 없음

### Android
- PNG 또는 벡터 드로어블
- 적응형 아이콘 지원
- 다양한 density 지원

## 생성 도구

- **앱 아이콘**: App Icon Generator, Figma 플러그인
- **스플래시**: Expo CLI, React Native CLI
- **최적화**: ImageOptim, TinyPNG