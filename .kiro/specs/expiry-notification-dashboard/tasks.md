# Implementation Plan: 만료일/소비기한 알림 대시보드

## Overview

React + TypeScript + Vite 프론트엔드와 AWS Lambda + API Gateway + DynamoDB 서버리스 백엔드로 구성된 만료일 관리 대시보드를 구현한다. 1일 MVP 제약에 따라 핵심 CRUD + 대시보드 → AI 이미지 분석 → 위치 검색 순으로 구현한다.

## Tasks

- [x] 1. 프로젝트 초기 설정 및 공통 인터페이스 정의
  - [x] 1.1 프론트엔드 프로젝트 생성 및 설정
    - Vite + React + TypeScript 프로젝트 생성
    - Tailwind CSS 설정
    - React Router v6 설치 및 라우팅 기본 구조 설정
    - Vitest + fast-check + Testing Library 테스트 환경 설정
    - 디렉토리 구조 생성 (components/, hooks/, pages/, utils/, types/, tests/)
    - _Requirements: 10.1, 10.3, 10.4_

  - [x] 1.2 백엔드 프로젝트 생성 및 설정
    - Lambda 함수 디렉토리 구조 생성 (lambda/items/, lambda/chat/, lambda/image/, lambda/location/)
    - 공통 유틸리티 디렉토리 생성 (lambda/shared/)
    - TypeScript 설정 및 빌드 스크립트
    - AWS SDK v3 의존성 설치 (DynamoDB, S3, Bedrock)
    - _Requirements: 1.1, 7.1, 8.1, 9.1_

  - [x] 1.3 공통 타입 및 인터페이스 정의
    - Category, ItemSummary, CreateItemRequest, CreateItemResponse 등 공통 타입 파일 작성
    - ApiError, ValidationResult 인터페이스 정의
    - 프론트엔드/백엔드 공유 타입은 shared 디렉토리에 배치
    - _Requirements: 1.1, 1.3, 2.1, 2.3_

- [x] 2. 아이템 CRUD 백엔드 Lambda 구현
  - [x] 2.1 DynamoDB 클라이언트 및 테이블 유틸리티 구현
    - DynamoDB DocumentClient 초기화 모듈 작성
    - 테이블명 환경변수 설정 처리
    - 공통 에러 클래스(ValidationError, NotFoundError) 정의
    - 에러 핸들러 미들웨어 구현
    - _Requirements: 4.4, 12.4_

  - [x] 2.2 아이템 생성 API (POST /api/items) 구현
    - 요청 유효성 검증 함수 구현 (이름 1~50자, 카테고리, 만료일 검증)
    - UUID v4 생성 및 createdAt 타임스탬프 설정
    - 이미지 Base64 → S3 업로드 로직 (선택적)
    - DynamoDB PutItem 실행
    - 에러 처리: 필수 항목 누락 시 구체적 오류 메시지 반환
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.3 아이템 생성 유효성 검증 Property 테스트
    - **Property 1: 아이템 생성 유효성 검증**
    - **Validates: Requirements 1.1, 1.5**

  - [ ]* 2.4 생성된 아이템 불변 속성 Property 테스트
    - **Property 2: 생성된 아이템의 불변 속성**
    - **Validates: Requirements 1.2**

  - [x] 2.5 아이템 조회 API (GET /api/items, GET /api/items/:id) 구현
    - 전체 목록 조회: isArchived=false 아이템을 만료일 가까운 순 정렬 반환
    - 카테고리 필터: GSI(category-expiryDate-index) 활용
    - 상세 조회: 아이템 ID로 전체 필드 반환, D-day 계산 포함
    - 아카이브 목록 조회: isArchived=true 아이템 반환
    - 에러 처리: 0건 시 빈 배열 반환, 존재하지 않는 ID 시 404 반환
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2_

  - [x] 2.6 아이템 수정 API (PUT /api/items/:id) 구현
    - 변경 필드 유효성 검증 (필수 항목 null/빈값 거부)
    - 만료일 과거 날짜 시 경고 포함하되 저장 허용
    - DynamoDB UpdateExpression으로 부분 업데이트
    - ConditionExpression으로 아이템 존재 여부 확인
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.7 수정 시 필수 항목 null 거부 Property 테스트
    - **Property 12: 수정 시 필수 항목 null 거부**
    - **Validates: Requirements 3.4**

  - [x] 2.8 아이템 삭제 API (DELETE /api/items/:id) 구현
    - ConditionExpression으로 존재 여부 확인 후 삭제
    - 존재하지 않는 아이템 삭제 시 404 반환
    - 시스템 오류 시 데이터 보존 보장
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.9 만료 아이템 아카이브 API 구현
    - 만료일이 현재 날짜 이전인 아이템 일괄 아카이브 (isArchived=true)
    - 아카이브 복원 엔드포인트 (PATCH /api/items/:id/restore)
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ]* 2.10 아이템 CRUD 라운드트립 Property 테스트
    - **Property 4: 아이템 CRUD 라운드트립**
    - **Validates: Requirements 2.3, 3.1**

  - [ ]* 2.11 아이템 삭제 후 조회 불가 Property 테스트
    - **Property 5: 아이템 삭제 후 조회 불가**
    - **Validates: Requirements 4.1**

  - [ ]* 2.12 만료 아이템 자동 아카이브 Property 테스트
    - **Property 10: 만료 아이템 자동 아카이브**
    - **Validates: Requirements 5.1**

- [x] 3. Checkpoint - 백엔드 CRUD 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. D-day 대시보드 프론트엔드 구현
  - [x] 4.1 D-day 계산 및 색상 유틸리티 함수 구현
    - calculateDday(expiryDate, today) 순수 함수 구현
    - getUrgencyColor(dday) 색상 결정 함수 구현
    - sortItemsByExpiry(items) 정렬 함수 구현
    - filterByCategory(items, category) 필터 함수 구현
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 4.2 D-day 계산 정확성 Property 테스트
    - **Property 6: D-day 계산 정확성**
    - **Validates: Requirements 6.1**

  - [ ]* 4.3 긴급도 색상 코딩 Property 테스트
    - **Property 7: 긴급도 색상 코딩**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

  - [ ]* 4.4 대시보드 정렬 불변식 Property 테스트
    - **Property 8: 대시보드 정렬 불변식**
    - **Validates: Requirements 2.1, 6.6**

  - [ ]* 4.5 카테고리 필터링 Property 테스트
    - **Property 9: 카테고리 필터링**
    - **Validates: Requirements 2.2, 6.7, 6.8**

  - [x] 4.6 useItems 커스텀 Hook 구현
    - 아이템 목록 조회 (fetch + 에러 핸들링)
    - 아이템 생성, 수정, 삭제 함수
    - 로딩 상태, 에러 상태 관리
    - React Context + useReducer로 전역 상태 관리
    - _Requirements: 2.1, 12.4_

  - [x] 4.7 useOfflineCache Hook 및 오프라인 모드 구현
    - localStorage 캐시 저장/조회/갱신 로직
    - API 실패 시 캐시 폴백 처리
    - 오프라인 상태 표시 UI
    - 네트워크 복구 시 캐시 갱신
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 4.8 오프라인 캐시 라운드트립 Property 테스트
    - **Property 17: 오프라인 캐시 라운드트립**
    - **Validates: Requirements 11.1**

  - [x] 4.9 DashboardPage 메인 화면 구현
    - 아이템 카드 리스트 (ItemCard 컴포넌트)
    - D-day 뱃지 색상 코딩 표시
    - 카테고리 필터 바 (CategoryFilter 컴포넌트)
    - 빈 상태 안내 메시지
    - 만료 아이템 하단 배치 + 회색 표시
    - 아이템 추가 버튼 (AddItemButton)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 4.10 아이템 등록/수정 폼 UI 구현
    - 이름, 카테고리(드롭다운), 서브카테고리, 만료일(DatePicker), 브랜드, 메모 필드
    - 이미지 첨부 기능 (5MB 제한, JPEG/PNG/WEBP)
    - 유효성 검증 인라인 에러 표시
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 3.1_

  - [x] 4.11 모바일 반응형 레이아웃 구현
    - 320px 이상 가로 스크롤 없는 레이아웃
    - 768px 미만 단일 컬럼 전환
    - 최소 44px x 44px 탭 대상
    - 최소 14px 본문 폰트 크기
    - BottomNavigation 컴포넌트 (대시보드, 채팅, 아카이브)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 4.12 아카이브 페이지 구현
    - 아카이브된 아이템 목록 표시 (만료일 최근순 정렬)
    - 아이템 복원 기능
    - 아이템 영구 삭제 (확인 다이얼로그 포함)
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 5. Checkpoint - 핵심 CRUD + 대시보드 동작 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. AI 챗봇 및 이미지 분석 구현
  - [x] 6.1 Chat Lambda 함수 구현
    - AWS Bedrock Claude 클라이언트 초기화
    - 사용자 메시지 의도 분석 (등록, 조회, 삭제, 기타)
    - 등록 의도: 아이템명/카테고리/만료일 추출 → 아이템 생성
    - 조회 의도: 조건 맞는 아이템 최대 10개 반환
    - 삭제 의도: 대상 확인 후 삭제 수행
    - 의도 불명 시 예시 명령 안내
    - 대화 히스토리 컨텍스트 관리
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 6.2 Image Analysis Lambda 함수 구현
    - 이미지 형식/크기 검증 (10MB 이하, JPEG/PNG/WEBP)
    - AWS Bedrock Claude Vision API 호출
    - 이미지 유형 자동 분류 (기프티콘, 식재료 라벨, 정기결제)
    - 유형별 데이터 추출 (브랜드, 상품명, 만료일, 서비스명 등)
    - 분석 결과 신뢰도 점수 포함 반환
    - 에러 처리: 형식 미지원, 크기 초과, 분석 실패
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [ ]* 6.3 이미지 분석 요청 검증 Property 테스트
    - **Property 13: 이미지 분석 요청 검증**
    - **Validates: Requirements 8.1, 8.9**

  - [ ]* 6.4 이미지 업로드 검증 Property 테스트
    - **Property 3: 이미지 업로드 검증**
    - **Validates: Requirements 1.4**

  - [x] 6.5 ChatPage 프론트엔드 구현
    - ChatWindow 컴포넌트 (메시지 버블 표시)
    - MessageInput 컴포넌트 (텍스트 입력 + 전송)
    - ImageUpload 컴포넌트 (이미지 첨부 버튼)
    - ExtractedInfoCard 컴포넌트 (분석 결과 표시 + 등록 확인/수정/취소)
    - useChat 커스텀 Hook 구현
    - 응답 타임아웃 처리 (텍스트 5초, 이미지 10초)
    - _Requirements: 7.1, 7.2, 8.6, 8.7, 8.8, 12.2, 12.3_

- [x] 7. Checkpoint - AI 챗봇 기능 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. 위치 기반 사용처 검색 구현
  - [x] 8.1 Location Lambda 함수 구현
    - Kakao Maps API 키워드 검색 클라이언트 구현
    - 브랜드명 기반 매장 검색 (GET /api/locations/:brand)
    - 거리 계산 함수 (Haversine formula)
    - 반경 5km 필터링 및 거리순 정렬
    - 에러 처리: API 실패, 매장 없음
    - _Requirements: 9.2, 9.3, 9.4, 9.6, 9.8_

  - [ ]* 8.2 위치 검색 거리 필터 Property 테스트
    - **Property 14: 위치 검색 거리 필터**
    - **Validates: Requirements 9.2**

  - [ ]* 8.3 거리 포맷팅 Property 테스트
    - **Property 15: 거리 포맷팅**
    - **Validates: Requirements 9.3**

  - [ ]* 8.4 매장 거리순 정렬 Property 테스트
    - **Property 16: 매장 거리순 정렬**
    - **Validates: Requirements 9.4**

  - [x] 8.5 MapModal 프론트엔드 구현
    - useLocation 커스텀 Hook (Geolocation API, 10초 타임아웃)
    - Kakao Maps SDK 연동 (지도 표시 + 마커)
    - StoreList 컴포넌트 (매장 목록 + 거리 표시)
    - 위치 권한 거부 시 안내 메시지
    - 매장 미발견 시 안내 메시지
    - 위치 획득 실패 시 재시도 옵션
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 9. 전체 통합 및 성능 최적화
  - [x] 9.1 API Gateway 라우팅 및 CORS 설정
    - 모든 엔드포인트 API Gateway에 연결
    - CORS 설정 (프론트엔드 도메인 허용)
    - Lambda Proxy Integration 설정
    - _Requirements: 12.4_

  - [x] 9.2 프론트엔드-백엔드 통합 연결
    - API base URL 환경변수 설정
    - 모든 페이지에서 실제 API 호출 연결 확인
    - 대시보드 로딩 시 자동 아카이브 트리거
    - 성능 확인 (100개 아이템 기준 2초 이내 렌더링)
    - _Requirements: 5.1, 12.1, 12.4, 12.5_

  - [ ]* 9.3 아카이브/복원 라운드트립 Property 테스트
    - **Property 11: 아카이브/복원 라운드트립**
    - **Validates: Requirements 5.4**

- [x] 10. Final Checkpoint - 전체 통합 테스트 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- 1일 MVP 제약에 따라 우선순위: CRUD + Dashboard → AI 이미지 분석 → 위치 검색 순
- AWS CDK 인프라 배포는 본 구현 태스크 범위 밖 (별도 인프라 작업)
- 테스트 프레임워크: Vitest + fast-check (Property-Based Testing)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["2.1", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.5", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["2.3", "2.4", "2.6", "2.8", "2.9", "4.6", "4.7"] },
    { "id": 5, "tasks": ["2.7", "2.10", "2.11", "2.12", "4.8", "4.9", "4.10"] },
    { "id": 6, "tasks": ["4.11", "4.12"] },
    { "id": 7, "tasks": ["6.1", "6.2", "8.1"] },
    { "id": 8, "tasks": ["6.3", "6.4", "6.5", "8.2", "8.3", "8.4"] },
    { "id": 9, "tasks": ["8.5", "9.1"] },
    { "id": 10, "tasks": ["9.2", "9.3"] }
  ]
}
```
