# ALMUS Todo List - Icons Library

ALMUS Todo List 프로젝트의 아이콘 라이브러리입니다. Material Design 원칙을 기반으로 한 일관성 있는 아이콘 시스템을 제공합니다.

## 아이콘 시스템 구성

### 1. Lucide React Icons (주요 사용)

- **라이브러리**: `lucide-react` (이미 설치됨)
- **특징**: 고품질, 일관된 디자인, React 최적화
- **사용법**: `IconRegistry.tsx`를 통한 중앙 관리

### 2. 커스텀 SVG Icons

- **위치**: `/assets/icons/` 폴더
- **형식**: SVG (벡터 그래픽, 확장성 좋음)
- **스타일**: Material Design 가이드라인 준수

## 폴더 구조

```
/assets/icons/
├── task-management/     # 태스크 관리 관련 아이콘
│   ├── check-circle.svg
│   ├── add-task.svg
│   ├── calendar-days.svg
│   └── priority-flag.svg
├── navigation/          # 네비게이션 아이콘
│   ├── menu-hamburger.svg
│   └── home.svg
├── status/             # 상태 표시 아이콘
│   └── in-progress.svg
├── social/             # 소셜/협업 아이콘
│   └── team.svg
├── actions/            # 액션 버튼 아이콘
├── ui/                 # UI 요소 아이콘
└── system/             # 시스템 관련 아이콘
```

## 사용 방법

### 1. Lucide React 아이콘 사용

```tsx
import { Icon } from '@/components/icons/IconRegistry';

// 기본 사용
<Icon name="check" category="task" size={24} />

// 클래스와 색상 적용
<Icon
  name="home"
  category="navigation"
  size={20}
  className="text-blue-500 hover:text-blue-600"
/>
```

### 2. 태스크 상태 아이콘

```tsx
import { TaskStatusIcon } from '@/components/icons/IconRegistry';

<TaskStatusIcon status="completed" />
<TaskStatusIcon status="in_progress" />
<TaskStatusIcon status="pending" />
<TaskStatusIcon status="overdue" />
```

### 3. 우선순위 아이콘

```tsx
import { PriorityIcon } from '@/components/icons/IconRegistry';

<PriorityIcon priority="high" />
<PriorityIcon priority="medium" />
<PriorityIcon priority="low" />
```

### 4. 커스텀 SVG 아이콘

```tsx
import SvgIcon from '@/components/icons/SvgIcon';

<SvgIcon name="check-circle" category="task-management" size={24} />;
```

## 아이콘 카테고리별 가이드

### Task Management (태스크 관리)

- `check-circle`: 완료된 태스크
- `add-task`: 새 태스크 추가
- `calendar-days`: 일정 및 마감일
- `priority-flag`: 우선순위 표시

### Navigation (네비게이션)

- `menu-hamburger`: 메인 메뉴
- `home`: 홈/대시보드

### Status (상태)

- `in-progress`: 진행중인 작업 (애니메이션 포함)

### Social (소셜/협업)

- `team`: 팀 협업

## 색상 가이드

### 태스크 상태별 색상

- **Pending**: `text-gray-400` (#9CA3AF)
- **In Progress**: `text-blue-500` (#3B82F6)
- **Completed**: `text-green-500` (#10B981)
- **Overdue**: `text-red-500` (#EF4444)

### 우선순위별 색상

- **Low**: `text-green-500` (#10B981)
- **Medium**: `text-yellow-500` (#F59E0B)
- **High**: `text-red-500` (#EF4444)

### 브랜드 색상

- **Primary**: `#3B82F6` (Blue 500)
- **Secondary**: `#10B981` (Emerald 500)
- **Accent**: `#F59E0B` (Amber 500)

## 아이콘 쇼케이스

개발 중 아이콘을 확인하려면 `IconShowcase` 컴포넌트를 사용하세요:

```tsx
import IconShowcase from '@/components/icons/IconShowcase';

// 개발용 페이지에서
<IconShowcase />;
```

## 새 아이콘 추가하기

### 1. Lucide React 아이콘 추가

1. `IconRegistry.tsx`에서 필요한 아이콘을 import
2. 해당 카테고리에 아이콘 추가
3. 타입 안전성 확보

### 2. 커스텀 SVG 아이콘 추가

1. Material Design 가이드라인에 맞춰 SVG 제작
2. 적절한 카테고리 폴더에 저장
3. 24x24 기본 크기, 벡터 형식 사용
4. 색상은 `currentColor` 또는 CSS 변수 사용

## 성능 최적화

### 번들 크기 최적화

- Lucide React는 tree-shaking 지원
- 사용하는 아이콘만 번들에 포함됨
- SVG는 필요시에만 로드

### 로딩 최적화

- 자주 사용되는 아이콘은 Lucide React 사용
- 특수한 아이콘만 커스텀 SVG 사용
- 아이콘 크기는 용도에 맞게 조정 (16, 20, 24, 32px)

## 접근성 (Accessibility)

### 권장사항

- 아이콘에는 항상 의미있는 `alt` 텍스트 제공
- 색상만으로 정보 전달 금지
- 충분한 대비율 확보 (WCAG 2.1 AA 기준)
- 키보드 네비게이션 지원

```tsx
// 좋은 예
<Icon name="check" alt="완료됨" />
<TaskStatusIcon status="completed" aria-label="태스크 완료" />

// 나쁜 예
<Icon name="check" /> {/* alt 없음 */}
```

## 브랜딩 가이드라인

### 일관성 유지

- 선 두께: 1.5-2px
- 모서리: 둥근 모서리 (`stroke-linecap="round"`)
- 크기: 24x24 기본, 16/20/32 변형
- 스타일: 미니멀, 명확한 형태

### 브랜드 색상 활용

- 주요 액션: Blue (#3B82F6)
- 성공/완료: Green (#10B981)
- 경고/중요: Amber (#F59E0B)
- 오류/위험: Red (#EF4444)

이 아이콘 시스템을 통해 ALMUS Todo List의 일관된 UI/UX를 제공하고 사용자 경험을 향상시킬 수 있습니다.
