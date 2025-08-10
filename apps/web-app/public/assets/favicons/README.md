# ALMUS Todo List - Favicons & App Icons

ALMUS Todo List 애플리케이션의 파비콘과 앱 아이콘 모음입니다. 다양한 플랫폼과 디바이스에서 일관된 브랜딩을 제공합니다.

## 파일 목록

### SVG 아이콘 (벡터)

- `favicon.svg` - 32x32 기본 파비콘 (SVG)
- `apple-touch-icon.svg` - 180x180 Apple Touch 아이콘
- `android-chrome-192x192.svg` - 192x192 Android Chrome 아이콘
- `android-chrome-512x512.svg` - 512x512 Android Chrome 아이콘 (고해상도)

### 필요한 추가 파일 (실제 사용시 생성)

- `favicon.ico` - 16x16, 32x32 ICO 형식 (브라우저 호환성)
- `apple-touch-icon.png` - 180x180 PNG (iOS Safari)
- `android-chrome-192x192.png` - 192x192 PNG
- `android-chrome-512x512.png` - 512x512 PNG

## 디자인 특징

### 브랜드 아이덴티티

- **주 색상**: Blue (#3B82F6) - 신뢰성과 전문성
- **보조 색상**: Green (#4ADE80) - 완료와 성공
- **강조 색상**: Amber (#FCD34D) - 진행중과 주의

### 아이콘 모티프

- **체크리스트**: 할 일 관리의 핵심 개념
- **Material Design**: 현대적이고 직관적인 디자인
- **계층 구조**: 완료-진행중-대기 상태의 시각적 표현

## 플랫폼별 사용

### 웹 브라우저

```html
<!-- 기본 파비콘 -->
<link rel="icon" href="/assets/favicons/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/assets/favicons/favicon.ico" type="image/x-icon" />

<!-- 고해상도 디스플레이 -->
<link
  rel="icon"
  type="image/svg+xml"
  sizes="any"
  href="/assets/favicons/favicon.svg"
/>
```

### iOS Safari

```html
<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" href="/assets/favicons/apple-touch-icon.svg" />
<meta name="apple-mobile-web-app-title" content="ALMUS" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

### Android Chrome

```html
<!-- Android Chrome Icons -->
<link
  rel="icon"
  type="image/svg+xml"
  sizes="192x192"
  href="/assets/favicons/android-chrome-192x192.svg"
/>
<link
  rel="icon"
  type="image/svg+xml"
  sizes="512x512"
  href="/assets/favicons/android-chrome-512x512.svg"
/>
```

### PWA Manifest

```json
{
  "icons": [
    {
      "src": "/assets/favicons/android-chrome-192x192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml"
    },
    {
      "src": "/assets/favicons/android-chrome-512x512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml"
    }
  ]
}
```

## 최적화 가이드

### SVG 장점

- **확장성**: 모든 해상도에서 선명함
- **작은 파일 크기**: 벡터 기반으로 효율적
- **색상 변경 용이**: CSS로 동적 색상 변경 가능
- **애니메이션 가능**: CSS/SMIL 애니메이션 지원

### 호환성 고려사항

```html
<!-- 최대 호환성을 위한 설정 -->
<link rel="icon" href="/assets/favicons/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/assets/favicons/favicon.ico" />
<link rel="apple-touch-icon" href="/assets/favicons/apple-touch-icon.svg" />
```

## 생성 방법 (참고)

### SVG to PNG 변환

```bash
# Inkscape 사용 (명령줄)
inkscape --export-type=png --export-width=192 --export-height=192 favicon.svg --export-filename=android-chrome-192x192.png

# ImageMagick 사용
convert -background none favicon.svg -resize 192x192 android-chrome-192x192.png
```

### ICO 파일 생성

```bash
# ImageMagick으로 여러 크기 ICO 생성
convert favicon.svg -define icon:auto-resize=16,32,48 favicon.ico
```

## 품질 체크리스트

### 디자인 품질

- [ ] 16x16에서도 인식 가능한 형태
- [ ] 고대비 환경에서 가독성 확보
- [ ] 브랜드 색상 일관성 유지
- [ ] 다크/라이트 모드 호환성

### 기술적 품질

- [ ] SVG 최적화 (불필요한 메타데이터 제거)
- [ ] 적절한 viewBox 설정
- [ ] 접근성 속성 포함 (title, desc)
- [ ] 브라우저 호환성 테스트

## 파일 크기

### 현재 SVG 파일들

- `favicon.svg`: ~1KB
- `apple-touch-icon.svg`: ~2KB
- `android-chrome-192x192.svg`: ~3KB
- `android-chrome-512x512.svg`: ~4KB

### 권장 크기 제한

- 파비콘: 1KB 이하
- 앱 아이콘: 5KB 이하
- 전체 아이콘 세트: 20KB 이하

## 향후 개선사항

### 추가 플랫폼 지원

- Windows Tile Icons (MS Apps)
- macOS Touch Bar Icons
- Browser Extension Icons

### 테마 변형

- 다크 모드 전용 아이콘
- 고대비 모드 아이콘
- 계절별/이벤트 테마 아이콘

이 파비콘 시스템을 통해 ALMUS Todo List가 모든 플랫폼에서 전문적이고 일관된 브랜드 이미지를 제공할 수 있습니다.
