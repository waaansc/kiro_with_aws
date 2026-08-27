# DESIGN.md — 비주얼 디자인 시스템

이 문서는 레퍼런스 이미지에서 추출한 디자인 원칙과 시각적 규칙을 정의합니다.
모든 화면에 일관되게 적용할 수 있는 가이드입니다.

---

## 1. 디자인 철학

| 키워드 | 설명 |
|--------|------|
| **미니멀** | 불필요한 장식 요소 배제, 콘텐츠가 주인공 |
| **여백 중심** | 넉넉한 패딩과 마진으로 호흡감 부여 |
| **흑백 기반** | 색상을 최소화하고, 타이포그래피와 여백으로 위계 표현 |
| **그리드 정렬** | 카드 기반 레이아웃, 일관된 간격 유지 |
| **콘텐츠 퍼스트** | 이미지와 텍스트가 명확한 계층 구조를 가짐 |

---

## 2. 컬러 팔레트

### 기본 색상 (모노크롬 베이스)

| 용도 | 색상 | Tailwind |
|------|------|----------|
| 배경 | `#FFFFFF` | `bg-white` |
| 본문 텍스트 | `#1A1A1A` | `text-gray-900` |
| 서브 텍스트 | `#6B7280` | `text-gray-500` |
| 경계선 | `#F3F4F6` | `border-gray-100` |
| 카드 배경 | `#FFFFFF` | `bg-white` |
| 호버 배경 | `#F9FAFB` | `hover:bg-gray-50` |

### 액센트 색상 (최소 사용)

| 용도 | 색상 | Tailwind | 사용 규칙 |
|------|------|----------|-----------|
| 긴급 (D-day 0~3) | `#EF4444` | `bg-red-500` | D-day 뱃지에만 사용 |
| 주의 (D-day 4~7) | `#F97316` | `bg-orange-500` | D-day 뱃지에만 사용 |
| 안전 (D-day 8+) | `#22C55E` | `bg-green-500` | D-day 뱃지에만 사용 |
| 인터랙티브 | `#1A1A1A` | `text-gray-900` | 링크, 버튼 (밑줄 또는 볼드) |

> **원칙**: 색상은 정보 전달 목적으로만 사용. 장식적 색상 사용 금지.

---

## 3. 타이포그래피

### 폰트 스택

```css
font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', sans-serif;
```

### 타입 스케일

| 레벨 | 용도 | 크기 | 굵기 | Tailwind |
|------|------|------|------|----------|
| Display | 페이지 타이틀 | 36px | 700 (Bold) | `text-4xl font-bold` |
| Heading 1 | 섹션 제목 | 24px | 700 (Bold) | `text-2xl font-bold` |
| Heading 2 | 카드 제목 | 16px | 600 (Semibold) | `text-base font-semibold` |
| Body | 본문, 설명 | 14px | 400 (Regular) | `text-sm font-normal` |
| Caption | 태그, 메타 정보 | 12px | 500 (Medium) | `text-xs font-medium` |

### 타이포그래피 규칙

- **제목은 볼드, 본문은 레귤러** — 굵기 대비로 위계 표현
- **줄 높이**: 제목 1.2, 본문 1.6 (`leading-tight`, `leading-relaxed`)
- **글자 간격**: 기본값 유지, 대문자 태그만 약간 넓게
- **색상 대비**: 제목은 `gray-900`, 설명은 `gray-500`

---

## 4. 레이아웃 & 그리드

### 구조 원칙

```
┌─────────────────────────────────────┐
│  여백 (px-5)                         │
│  ┌───────────────────────────────┐  │
│  │  페이지 타이틀                  │  │
│  │  (큰 볼드 텍스트, mb-8)        │  │
│  ├───────────────────────────────┤  │
│  │  필터/탭 바 (간격: gap-4)      │  │
│  ├───────────────────────────────┤  │
│  │  ┌─────────┐  ┌─────────┐    │  │
│  │  │ 카드 1  │  │ 카드 2  │    │  │
│  │  │         │  │         │    │  │
│  │  └─────────┘  └─────────┘    │  │
│  │  ┌─────────┐  ┌─────────┐    │  │
│  │  │ 카드 3  │  │ 카드 4  │    │  │
│  │  └─────────┘  └─────────┘    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 간격 시스템

| 용도 | 값 | Tailwind |
|------|-----|----------|
| 페이지 좌우 패딩 | 20px | `px-5` |
| 섹션 간 간격 | 48px | `mb-12` |
| 카드 그리드 간격 | 24px | `gap-6` |
| 카드 내부 패딩 | 0 (이미지) / 16px (텍스트) | `p-0` / `pt-4` |
| 태그 간 간격 | 8px | `gap-2` |
| 텍스트 줄 간격 | 8px | `mt-2` |

### 반응형 규칙

| 브레이크포인트 | 그리드 | 비고 |
|----------------|--------|------|
| < 640px (모바일) | 1열 | 카드 풀 너비 |
| ≥ 640px (태블릿) | 2열 | 기본 그리드 |
| ≥ 1024px (데스크톱) | 2~3열 | 최대 너비 제한 |

---

## 5. 컴포넌트 스타일

### 카드

```
┌─────────────────────────┐
│                         │
│   [이미지 영역]          │  ← aspect-[4/3], rounded-lg, overflow-hidden
│   배경: gray-100         │
│                         │
├─────────────────────────┤
│                         │
│   제목 (semibold)        │  ← text-base font-semibold text-gray-900
│   설명 (regular)         │  ← text-sm text-gray-500, mt-1
│                         │
│   [태그] [태그]          │  ← mt-3, 캡슐 스타일
│                         │
└─────────────────────────┘
```

**카드 규칙:**
- 테두리 없음 (border-0)
- 그림자 없음 (기본 상태)
- 호버 시 미세한 변화만: `hover:opacity-90` 또는 `hover:translate-y-[-2px]`
- 이미지와 텍스트 사이 경계선 없음
- 이미지 모서리: `rounded-lg` (8px)

### 태그/뱃지

```css
/* 기본 태그 */
px-3 py-1 text-xs font-medium rounded-full
border border-gray-200 text-gray-600 bg-white

/* D-day 뱃지 (색상 채움) */
px-3 py-1 text-xs font-bold rounded-full text-white
```

**태그 규칙:**
- 라운드: `rounded-full` (완전 원형 모서리)
- 배경: 투명 + 테두리 (기본), 색상 채움 (D-day)
- 크기: 작고 가벼운 느낌 (`text-xs`)

### 버튼

| 유형 | 스타일 | Tailwind |
|------|--------|----------|
| Primary | 검정 배경 + 흰 텍스트 | `bg-gray-900 text-white rounded-lg px-5 py-3` |
| Secondary | 투명 + 테두리 | `border border-gray-300 text-gray-700 rounded-lg px-5 py-3` |
| Ghost | 텍스트만 (밑줄) | `text-gray-900 underline` |
| Danger | 빨간 테두리 | `border border-red-300 text-red-600 rounded-lg px-5 py-3` |

**버튼 규칙:**
- 라운드: `rounded-lg` (8px) — 완전 둥글지 않게
- 최소 높이: 44px (접근성)
- 호버: 약간 투명도 변화 `hover:opacity-80`
- 그림자 없음

### 필터/탭 바

```css
/* 비활성 */
text-sm text-gray-500 font-normal cursor-pointer

/* 활성 */
text-sm text-gray-900 font-semibold cursor-pointer
/* 밑줄 없음, 굵기 변화로만 구분 */
```

**탭 규칙:**
- 배경색 변화 없음 (기존 파란색 배경 → 제거)
- 활성: 볼드 + 어두운 색상
- 비활성: 레귤러 + 밝은 색상
- 간격: `gap-6` (넉넉하게)

---

## 6. 이미지 처리

| 규칙 | 설명 |
|------|------|
| 비율 | `aspect-[4/3]` 또는 `aspect-video` 일관 유지 |
| 맞춤 | `object-cover` (잘림 허용, 비율 유지) |
| 모서리 | `rounded-lg` (8px) |
| 배경 (없을 때) | `bg-gray-100` + 아이콘 플레이스홀더 |
| 호버 | 약간 확대 `hover:scale-[1.02]` transition |

---

## 7. 여백 & 호흡

> "여백은 디자인의 일부다."

| 원칙 | 적용 |
|------|------|
| 페이지 상단 여백 | `pt-12` 이상 |
| 타이틀 ↔ 콘텐츠 | `mb-8` ~ `mb-12` |
| 카드 ↔ 카드 | `gap-6` |
| 카드 내부 이미지 ↔ 텍스트 | `mt-4` |
| 텍스트 줄 사이 | `mt-1` ~ `mt-2` |
| 섹션 마무리 바닥 | `pb-16` 이상 |

---

## 8. 인터랙션 & 모션

| 요소 | 효과 | CSS |
|------|------|-----|
| 카드 호버 | 미세 상승 | `transition-transform hover:translate-y-[-2px]` |
| 버튼 호버 | 투명도 변화 | `transition-opacity hover:opacity-80` |
| 페이지 전환 | 없음 (즉시) | — |
| 로딩 | 심플 스피너 | border 애니메이션 |

**모션 규칙:**
- 과도한 애니메이션 금지
- 트랜지션: `duration-200 ease-out`
- 목적이 있는 움직임만 (피드백 제공)

---

## 9. 우리 앱에 적용할 때의 매핑

| 레퍼런스 요소 | 우리 앱 대응 | 변환 |
|---------------|-------------|------|
| "Projects" 페이지 타이틀 | "대시보드" | 동일 스타일 적용 |
| 필터 탭 (All, Web design...) | 카테고리 필터 (전체, 기프티콘...) | 배경색 제거 → 텍스트 굵기로 구분 |
| 프로젝트 카드 (이미지 + 제목 + 설명 + 태그) | 아이템 카드 (이미지 + 이름 + 만료일 + D-day 뱃지) | 동일 구조 적용 |
| 카드 태그 ("BRANDING", "WEB DESIGN") | 카테고리 태그 + D-day 뱃지 | 캡슐 스타일 유지 |
| 2열 그리드 | 모바일 1열, 태블릿+ 2열 | 반응형 적용 |

---

## 10. 금지 사항 (하지 말 것)

- ❌ 그림자 (box-shadow) 남용 — 카드에 그림자 넣지 않기
- ❌ 그라데이션 배경
- ❌ 둥근 모서리 과다 (버튼에 rounded-full 쓰지 않기)
- ❌ 색상 과다 사용 (3색 이상 동시 사용 금지)
- ❌ 아이콘 과다 (텍스트로 충분한 곳에 아이콘 넣지 않기)
- ❌ 복잡한 애니메이션
- ❌ 배경색이 들어간 필터 버튼 (파란색 배경 등)

---

## 11. Tailwind 기본 설정 요약

```css
/* 전역 기본값 */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;
  color: #1A1A1A;
  background: #FFFFFF;
  line-height: 1.6;
}

/* 카드 기본 */
.card {
  @apply rounded-lg overflow-hidden transition-transform duration-200 hover:translate-y-[-2px];
}

/* 태그 기본 */
.tag {
  @apply px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600;
}
```

---

*이 가이드를 기반으로 전체 화면을 리디자인합니다.*
