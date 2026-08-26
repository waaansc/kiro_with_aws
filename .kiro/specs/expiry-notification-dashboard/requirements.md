# Requirements Document

## Introduction

만료일/소비기한 알림 대시보드는 기프티콘, 냉장고 식재료, 정기 결제일 등 잊어버리기 쉬운 유효기간을 등록하고 D-day를 한눈에 관리하는 초경량 웹 애플리케이션이다. 단일 사용자 기준으로 동작하며, AWS 서버리스 인프라 위에서 운영된다. AI 챗봇을 통한 이미지 기반 자동 등록과 위치 기반 사용처 검색 기능을 포함한다.

## Glossary

- **Dashboard**: 등록된 모든 아이템의 D-day 정보를 색상 코드와 함께 한눈에 보여주는 메인 화면
- **Item**: 만료일이 있는 등록 대상(기프티콘, 식재료, 정기결제 등)을 나타내는 데이터 단위
- **Item_Manager**: 아이템의 생성, 조회, 수정, 삭제를 담당하는 시스템 컴포넌트
- **Dashboard_Renderer**: D-day 계산 및 색상 구분, 정렬, 필터링을 담당하는 화면 렌더링 컴포넌트
- **AI_Chatbot**: AWS Bedrock Claude 모델 기반의 채팅 인터페이스로, 자연어 및 이미지 입력을 처리하는 컴포넌트
- **Image_Analyzer**: AWS Bedrock를 활용하여 첨부된 이미지에서 상품명, 만료일, 브랜드 등의 정보를 추출하는 컴포넌트
- **Location_Finder**: 사용자 위치 기반으로 기프티콘/쿠폰 사용 가능 매장을 검색하는 컴포넌트
- **Category**: 아이템 분류 체계 (기프티콘, 식재료, 정기결제, 기타)
- **D-day**: 만료일까지 남은 일수
- **Archive**: 만료된 아이템을 별도 보관하는 상태

## Requirements

### Requirement 1: 아이템 생성

**User Story:** 사용자로서, 만료일이 있는 아이템을 등록하고 싶다. 그래서 만료일을 체계적으로 관리할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 아이템 등록을 요청하면, THE Item_Manager SHALL 이름(1자 이상 50자 이하), 카테고리, 만료일(현재 날짜 이후)을 필수 항목으로 검증한 후 아이템을 생성한다.
2. WHEN 아이템이 생성되면, THE Item_Manager SHALL 고유 UUID를 할당하고 생성 시각을 기록한다.
3. WHEN 사용자가 카테고리를 선택하면, THE Item_Manager SHALL 기프티콘(카페, 편의점, 외식, 기타), 식재료(냉장, 냉동, 상온), 정기결제(구독 서비스, 보험, 멤버십), 기타 중 하나를 지정한다.
4. WHEN 사용자가 이미지를 첨부하면, THE Item_Manager SHALL 5MB 이하의 JPEG, PNG, WEBP 형식 이미지를 S3에 저장하고 URL을 아이템에 연결한다.
5. IF 필수 항목(이름, 카테고리, 만료일) 중 하나라도 누락되면, THEN THE Item_Manager SHALL 누락된 항목을 명시하는 오류 메시지를 반환한다.
6. IF 이미지 업로드가 실패하면, THEN THE Item_Manager SHALL 이미지 업로드 실패를 알리는 오류 메시지를 표시하되, 이미지 없이 아이템 등록은 허용한다.

### Requirement 2: 아이템 조회

**User Story:** 사용자로서, 등록된 아이템 목록을 조회하고 싶다. 그래서 현재 관리 중인 아이템을 확인할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 아이템 목록을 요청하면, THE Item_Manager SHALL 아카이브되지 않은 모든 아이템을 만료일 가까운 순으로 정렬하여 이름, 카테고리, 만료일, D-day를 포함한 목록을 반환한다.
2. WHEN 사용자가 카테고리 필터를 적용하면, THE Item_Manager SHALL 해당 카테고리에 속하는 아이템만 만료일 가까운 순 정렬을 유지하여 반환한다.
3. WHEN 사용자가 특정 아이템을 선택하면, THE Item_Manager SHALL 해당 아이템의 전체 상세 정보(이름, 카테고리, 서브카테고리, 만료일, D-day, 브랜드, 메모, 이미지URL, 생성일)를 반환한다.
4. IF 조회 결과가 0건이면, THEN THE Item_Manager SHALL 등록된 아이템이 없음을 안내하는 메시지를 표시한다.
5. IF 존재하지 않는 아이템 ID로 상세 조회를 요청하면, THEN THE Item_Manager SHALL 해당 아이템을 찾을 수 없다는 오류를 반환한다.

### Requirement 3: 아이템 수정

**User Story:** 사용자로서, 등록한 아이템의 정보를 수정하고 싶다. 그래서 변경된 내용을 반영할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 아이템 수정을 요청하면, THE Item_Manager SHALL 이름, 카테고리, 서브카테고리, 만료일, 브랜드, 메모, 이미지 필드에 대해 변경된 값을 검증하고 업데이트한다.
2. IF 수정 대상 아이템이 존재하지 않으면, THEN THE Item_Manager SHALL 해당 아이템을 찾을 수 없다는 오류를 반환한다.
3. IF 만료일을 오늘 이전 날짜로 수정하면, THEN THE Item_Manager SHALL 과거 날짜에 대한 경고를 표시하되 저장을 허용한다.
4. IF 필수 항목(이름, 카테고리, 만료일) 중 하나가 비어있거나 null로 수정되면, THEN THE Item_Manager SHALL 해당 필드가 필수임을 알리는 오류를 반환하고 수정을 거부한다.
5. WHEN 아이템이 성공적으로 수정되면, THE Item_Manager SHALL 수정 완료 확인 응답을 반환한다.

### Requirement 4: 아이템 삭제

**User Story:** 사용자로서, 불필요한 아이템을 삭제하고 싶다. 그래서 목록을 깔끔하게 유지할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 아이템 ID를 지정하여 삭제를 요청하면, THE Item_Manager SHALL 해당 아이템을 데이터베이스에서 영구 삭제한다.
2. IF 삭제 대상 아이템이 존재하지 않으면, THEN THE Item_Manager SHALL 해당 아이템을 찾을 수 없다는 오류를 반환한다.
3. WHEN 아이템이 성공적으로 삭제되면, THE Item_Manager SHALL 삭제 완료 확인 응답을 반환한다.
4. IF 삭제 처리 중 시스템 오류가 발생하면, THEN THE Item_Manager SHALL 오류 메시지를 반환하고 아이템 데이터를 보존한다.

### Requirement 5: 만료 아이템 아카이브

**User Story:** 사용자로서, 만료된 아이템을 자동으로 아카이브하고 싶다. 그래서 활성 목록이 깔끔하게 유지된다.

#### Acceptance Criteria

1. WHEN 사용자가 대시보드 페이지를 로딩하거나 새로고침하면, THE Item_Manager SHALL 만료일이 현재 날짜 이전인 모든 아이템의 isArchived 상태를 true로 변경한다.
2. WHEN 사용자가 아카이브된 아이템 목록을 요청하면, THE Item_Manager SHALL 아카이브 상태인 모든 아이템을 만료일 최근 순으로 정렬하여 반환한다.
3. WHEN 사용자가 아카이브된 아이템 삭제를 요청하면, THE Item_Manager SHALL 삭제 확인을 요청한 후 해당 아이템을 영구 삭제한다.
4. WHEN 사용자가 아카이브된 아이템 복원을 요청하면, THE Item_Manager SHALL 해당 아이템의 isArchived 상태를 false로 변경하여 활성 목록으로 복원한다.

### Requirement 6: D-day 대시보드 렌더링

**User Story:** 사용자로서, 모든 아이템의 남은 일수를 한눈에 보고 싶다. 그래서 긴급한 아이템을 빠르게 파악할 수 있다.

#### Acceptance Criteria

1. THE Dashboard_Renderer SHALL 각 아이템에 대해 현재 날짜 기준 D-day를 계산하고, 남은 일수가 양수이면 "D-N" 형식으로, 만료된 경우 "D+N" 형식으로 표시한다.
2. WHILE 아이템의 D-day가 0 이상 3 이하이면, THE Dashboard_Renderer SHALL 해당 아이템을 빨간색으로 표시한다.
3. WHILE 아이템의 D-day가 4 이상 7 이하이면, THE Dashboard_Renderer SHALL 해당 아이템을 주황색으로 표시한다.
4. WHILE 아이템의 D-day가 8 이상이면, THE Dashboard_Renderer SHALL 해당 아이템을 초록색으로 표시한다.
5. WHILE 아이템의 D-day가 음수(만료됨)이면, THE Dashboard_Renderer SHALL 해당 아이템을 회색으로 표시한다.
6. THE Dashboard_Renderer SHALL 만료된 아이템을 목록 하단에 배치하고, 나머지 아이템을 만료일 가까운 순으로 정렬한다.
7. WHEN 사용자가 카테고리 필터를 선택하면, THE Dashboard_Renderer SHALL 선택된 카테고리의 아이템만 표시한다.
8. WHEN 사용자가 카테고리 필터를 해제하면, THE Dashboard_Renderer SHALL 전체 아이템을 다시 표시한다.
9. IF 등록된 아이템이 없으면, THEN THE Dashboard_Renderer SHALL 아이템을 등록하도록 안내하는 빈 상태 메시지를 표시한다.

### Requirement 7: AI 챗봇 자연어 처리

**User Story:** 사용자로서, 채팅으로 아이템을 등록하거나 조회하고 싶다. 그래서 빠르고 편리하게 관리할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 채팅 메시지를 전송하면, THE AI_Chatbot SHALL AWS Bedrock Claude 모델을 호출하여 사용자 의도를 분석한다.
2. WHEN 사용자가 아이템 등록 의도의 메시지를 전송하면, THE AI_Chatbot SHALL 메시지에서 아이템명, 카테고리, 만료일을 추출하여 등록을 수행하고, 등록 완료 확인을 응답한다.
3. IF 등록 의도 메시지에서 필수 정보(아이템명, 카테고리, 만료일)를 추출할 수 없으면, THEN THE AI_Chatbot SHALL 누락된 정보를 사용자에게 질문하여 확인한다.
4. WHEN 사용자가 아이템 조회 의도의 메시지를 전송하면, THE AI_Chatbot SHALL 조건에 맞는 아이템 목록을 최대 10개까지 채팅 형식으로 응답한다.
5. IF 조회 결과가 0건이면, THEN THE AI_Chatbot SHALL 조건에 맞는 아이템이 없음을 안내한다.
6. WHEN 사용자가 아이템 삭제 의도의 메시지를 전송하면, THE AI_Chatbot SHALL 대상 아이템을 명시하여 삭제 확인을 요청한 후 삭제를 수행한다.
7. IF AI_Chatbot이 사용자 의도를 파악하지 못하면, THEN THE AI_Chatbot SHALL 이해하지 못했음을 안내하고 가능한 명령 예시를 제공한다.

### Requirement 8: AI 이미지 분석 및 자동 등록

**User Story:** 사용자로서, 기프티콘이나 식재료 라벨 사진을 첨부하면 자동으로 아이템이 등록되길 원한다. 그래서 수동 입력 없이 빠르게 등록할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 JPEG, PNG, WEBP 형식의 10MB 이하 이미지를 채팅에 첨부하면, THE Image_Analyzer SHALL AWS Bedrock Claude 모델을 호출하여 이미지 내용을 분석한다.
2. WHEN Image_Analyzer가 이미지를 분석하면, THE Image_Analyzer SHALL 이미지 유형(기프티콘, 식재료 라벨, 정기결제 스크린샷)을 자동 분류한다.
3. WHEN 기프티콘 이미지가 분석되면, THE Image_Analyzer SHALL 브랜드명, 상품명, 만료일을 추출하여 반환한다.
4. WHEN 식재료 라벨 이미지가 분석되면, THE Image_Analyzer SHALL 제품명, 소비기한을 추출하여 반환한다.
5. WHEN 정기결제 스크린샷 이미지가 분석되면, THE Image_Analyzer SHALL 서비스명, 결제일을 추출하여 반환한다.
6. WHEN 이미지 분석이 완료되면, THE AI_Chatbot SHALL 추출된 정보를 사용자에게 표시하고 등록 확인, 수정, 또는 취소 옵션을 제공한다.
7. IF 이미지에서 일부 정보만 추출된 경우, THEN THE AI_Chatbot SHALL 추출된 정보를 표시하고 누락된 항목의 수동 입력을 요청한다.
8. IF Image_Analyzer가 이미지에서 관련 정보를 전혀 추출하지 못하면, THEN THE AI_Chatbot SHALL 분석 실패를 안내하고 수동 입력을 요청한다.
9. IF 이미지 형식이 지원되지 않거나 크기가 10MB를 초과하면, THEN THE Image_Analyzer SHALL 지원 형식 및 크기 제한을 안내하는 오류를 반환한다.

### Requirement 9: 위치 기반 사용처 검색

**User Story:** 사용자로서, 보유한 기프티콘을 사용할 수 있는 가까운 매장을 찾고 싶다. 그래서 기프티콘을 만료 전에 사용할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 기프티콘 아이템에서 "근처 매장 찾기"를 요청하면, THE Location_Finder SHALL 브라우저 Geolocation API를 통해 10초 이내에 현재 위치를 획득한다.
2. WHEN 현재 위치가 획득되면, THE Location_Finder SHALL 반경 5km 이내에서 해당 브랜드의 매장 목록을 지도 API를 통해 검색한다.
3. WHEN 매장 검색 결과가 반환되면, THE Location_Finder SHALL 지도 위에 마커로 매장 위치를 표시하고 현재 위치로부터의 거리를 "N.Nkm" 형식으로 제공한다.
4. THE Location_Finder SHALL 검색된 매장을 거리 가까운 순으로 정렬하여 목록을 표시한다.
5. IF 사용자가 위치 권한을 거부하면, THEN THE Location_Finder SHALL 위치 권한이 필요함을 안내하는 메시지를 표시한다.
6. IF 해당 브랜드의 매장을 반경 내에서 찾을 수 없으면, THEN THE Location_Finder SHALL 근처에 매장을 찾을 수 없음을 안내하는 메시지를 표시한다.
7. IF 위치 획득이 10초 이내에 완료되지 않으면, THEN THE Location_Finder SHALL 위치 획득 실패를 안내하고 재시도 옵션을 제공한다.
8. IF 지도 API 호출이 실패하면, THEN THE Location_Finder SHALL API 오류를 안내하고 재시도 옵션을 제공한다.

### Requirement 10: 모바일 반응형 UI

**User Story:** 사용자로서, 모바일 기기에서도 편리하게 대시보드를 사용하고 싶다. 그래서 일상에서 빠르게 만료일을 확인할 수 있다.

#### Acceptance Criteria

1. THE Dashboard_Renderer SHALL 320px 이상의 모든 뷰포트 너비에서 가로 스크롤 없이 콘텐츠가 표시되도록 반응형 레이아웃을 제공한다.
2. THE Dashboard_Renderer SHALL 모든 인터랙티브 요소에 최소 44px x 44px 크기의 탭 대상을 제공한다.
3. WHILE 뷰포트 너비가 768px 미만이면, THE Dashboard_Renderer SHALL 단일 컬럼 레이아웃으로 전환한다.
4. THE Dashboard_Renderer SHALL 본문 텍스트에 최소 14px 폰트 크기를 적용한다.

### Requirement 11: 오프라인 데이터 캐시

**User Story:** 사용자로서, 네트워크가 불안정한 상황에서도 등록된 아이템을 조회하고 싶다. 그래서 언제든 만료일을 확인할 수 있다.

#### Acceptance Criteria

1. WHEN 아이템 데이터를 서버에서 성공적으로 조회하면, THE Item_Manager SHALL 전체 아이템 목록 데이터를 브라우저 localStorage에 캐시하고, 캐시 시점의 타임스탬프를 함께 저장한다.
2. IF 서버 API 요청이 실패하면, THEN THE Item_Manager SHALL localStorage에 캐시된 데이터를 표시하고, 오프라인 상태임을 나타내는 표시를 화면에 제공한다.
3. IF 서버 API 요청이 실패하고 localStorage에 캐시된 데이터가 없으면, THEN THE Item_Manager SHALL 캐시된 데이터가 없음을 안내하는 메시지를 표시한다.
4. WHEN 네트워크가 복구되어 서버 API 요청이 성공하면, THE Item_Manager SHALL 서버 데이터를 최신으로 간주하여 localStorage 캐시를 서버 데이터로 갱신하고, 오프라인 상태 표시를 제거한다.

### Requirement 12: 성능 요구사항

**User Story:** 사용자로서, 대시보드가 빠르게 로딩되길 원한다. 그래서 즉각적으로 만료일 정보를 확인할 수 있다.

#### Acceptance Criteria

1. THE Dashboard_Renderer SHALL 등록된 아이템이 100개 이하인 상태에서 초기 페이지의 모든 아이템 목록이 화면에 렌더링 완료되기까지 2초 이내에 로딩을 완료한다.
2. WHEN 사용자가 AI_Chatbot에 텍스트 메시지를 전송하면, THE AI_Chatbot SHALL 5초 이내에 응답을 반환한다.
3. WHEN 사용자가 AI_Chatbot에 이미지를 첨부한 메시지를 전송하면, THE AI_Chatbot SHALL 10초 이내에 분석 결과 응답을 반환한다.
4. WHEN 사용자가 아이템 CRUD 작업을 요청하면, THE Item_Manager SHALL 1초 이내에 작업 완료 결과를 화면에 반영한다.
5. IF AI_Chatbot 또는 Item_Manager의 응답이 지정된 시간 제한을 초과하면, THEN THE Dashboard_Renderer SHALL 타임아웃을 나타내는 오류 메시지를 표시하고 사용자에게 재시도 옵션을 제공한다.
