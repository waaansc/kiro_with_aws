# API Gateway 라우팅 설정

본 문서는 API Gateway REST API의 엔드포인트 라우팅, Lambda Proxy Integration, CORS 설정을 정의한다.

## API Gateway 설정

- **API Type**: REST API
- **Stage**: `prod`
- **Base Path**: `/api`
- **Integration Type**: Lambda Proxy Integration (모든 엔드포인트)

## CORS 설정

모든 엔드포인트에 다음 CORS 헤더가 적용된다:

| 헤더 | 값 |
|------|-----|
| Access-Control-Allow-Origin | `*` (또는 `ALLOWED_ORIGIN` 환경변수로 특정 도메인 제한) |
| Access-Control-Allow-Headers | `Content-Type,Authorization` |
| Access-Control-Allow-Methods | `GET,POST,PUT,DELETE,PATCH,OPTIONS` |
| Content-Type | `application/json` |

모든 리소스에 OPTIONS 메서드가 설정되어 CORS 프리플라이트 요청을 처리한다.

## 엔드포인트 라우팅

### Items Lambda (`lambda/items/handler.handler`)

아이템 CRUD 작업을 처리하는 Lambda 함수.

| HTTP 메서드 | 경로 | 설명 | Requirements |
|-------------|------|------|-------------|
| POST | `/api/items` | 아이템 생성 | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 |
| POST | `/api/items/archive-expired` | 만료 아이템 일괄 아카이브 | 5.1 |
| GET | `/api/items` | 아이템 목록 조회 (카테고리 필터, 아카이브 필터 지원) | 2.1, 2.2, 2.4 |
| GET | `/api/items/{id}` | 아이템 상세 조회 | 2.3, 2.5 |
| PUT | `/api/items/{id}` | 아이템 수정 | 3.1, 3.2, 3.3, 3.4, 3.5 |
| DELETE | `/api/items/{id}` | 아이템 삭제 | 4.1, 4.2, 4.3, 4.4 |
| PATCH | `/api/items/{id}/restore` | 아카이브 아이템 복원 | 5.4 |
| OPTIONS | `/api/items`, `/api/items/{id}`, `/api/items/{id}/restore`, `/api/items/archive-expired` | CORS 프리플라이트 | 12.4 |

### Chat Lambda (`lambda/chat/handler.handler`)

AI 챗봇 자연어 처리를 담당하는 Lambda 함수.

| HTTP 메서드 | 경로 | 설명 | Requirements |
|-------------|------|------|-------------|
| POST | `/api/chat` | 채팅 메시지 처리 (의도 분석 및 액션 수행) | 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7 |
| OPTIONS | `/api/chat` | CORS 프리플라이트 | 12.4 |

### Image Analysis Lambda (`lambda/image/handler.handler`)

AI 이미지 분석 및 정보 추출을 담당하는 Lambda 함수.

| HTTP 메서드 | 경로 | 설명 | Requirements |
|-------------|------|------|-------------|
| POST | `/api/chat/image` | 이미지 분석 (기프티콘/식재료/정기결제 정보 추출) | 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9 |
| OPTIONS | `/api/chat/image` | CORS 프리플라이트 | 12.4 |

### Location Lambda (`lambda/location/handler.handler`)

위치 기반 매장 검색을 담당하는 Lambda 함수.

| HTTP 메서드 | 경로 | 설명 | Requirements |
|-------------|------|------|-------------|
| GET | `/api/locations/{brand}` | 브랜드 매장 위치 검색 (위도/경도/반경 쿼리 파라미터) | 9.2, 9.3, 9.4, 9.6, 9.8 |
| OPTIONS | `/api/locations/{brand}` | CORS 프리플라이트 | 12.4 |

## Lambda Proxy Integration 설정

모든 엔드포인트는 Lambda Proxy Integration으로 설정된다:

```yaml
# API Gateway 리소스별 Integration 설정 예시
/api/items:
  POST:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler
  GET:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler
  OPTIONS:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler

/api/items/{id}:
  GET:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler
  PUT:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler
  DELETE:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler
  OPTIONS:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler

/api/items/{id}/restore:
  PATCH:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler
  OPTIONS:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler

/api/items/archive-expired:
  POST:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler
  OPTIONS:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:items-handler

/api/chat:
  POST:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:chat-handler
  OPTIONS:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:chat-handler

/api/chat/image:
  POST:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:image-handler
  OPTIONS:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:image-handler

/api/locations/{brand}:
  GET:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:location-handler
  OPTIONS:
    integration: AWS_PROXY
    uri: arn:aws:lambda:{region}:{account}:function:location-handler
```

## Lambda 환경변수

| 변수명 | 적용 Lambda | 설명 |
|--------|-------------|------|
| `TABLE_NAME` | Items, Chat | DynamoDB 테이블명 |
| `BUCKET_NAME` | Items, Image | S3 이미지 버킷명 |
| `BEDROCK_MODEL_ID` | Chat, Image | Bedrock Claude 모델 ID |
| `KAKAO_API_KEY` | Location | Kakao Maps API 키 |
| `ALLOWED_ORIGIN` | 전체 | CORS 허용 도메인 (미설정 시 *) |

## 성능 요구사항 (Req 12.4)

- CRUD 작업 응답 시간: 1초 이내
- Lambda Cold Start 최소화를 위한 프로비저닝된 동시성 고려
- API Gateway 타임아웃: 29초 (기본값)
