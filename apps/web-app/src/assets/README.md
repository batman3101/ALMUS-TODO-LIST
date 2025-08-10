# Web App Source Assets

웹 애플리케이션 소스 코드와 함께 번들링되는 에셋 폴더입니다.

## 폴더 구조

### `/icons`

- 컴포넌트에서 import하여 사용하는 아이콘들
- SVG 아이콘들 (React 컴포넌트로 변환 가능)
- 인라인 아이콘들

### `/images`

- 컴포넌트에서 import하여 사용하는 이미지들
- 최적화가 필요한 이미지들
- WebP, AVIF 등 최신 형식 이미지들

## 사용 방법

```jsx
// 이미지 import
import logoImage from '@/assets/images/logo.png';
import iconSvg from '@/assets/icons/arrow.svg';

// 컴포넌트에서 사용
<img src={logoImage} alt="Logo" />
<img src={iconSvg} alt="Arrow" />
```

## 최적화

- Vite가 자동으로 이미지 최적화를 수행합니다
- 작은 이미지들은 base64로 인라인됩니다
- 큰 이미지들은 별도 파일로 처리됩니다

## 권장사항

- SVG 아이콘은 `/icons` 폴더에
- 사진이나 복잡한 이미지는 `/images` 폴더에
- 파일 크기를 가능한 작게 유지하세요
