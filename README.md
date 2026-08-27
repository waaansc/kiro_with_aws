# 📦 만료일 알림 대시보드

기프티콘, 식재료, 정기결제 등 유효기간이 있는 아이템을 관리하고, AI 챗봇으로 손쉽게 등록/조회할 수 있는 서버리스 웹 애플리케이션입니다.

![Demo](./demo.gif)

---

## ✨ 주요 기능

### 📋 대시보드
- D-day 색상 뱃지로 만료일 긴급도 한눈에 파악
- 카테고리별 필터링 (기프티콘 / 식재료 / 정기결제 / 기타)
- 만료된 아이템 자동 아카이브

### 🤖 AI 챗봇
- 자연어로 아이템 등록 ("스타벅스 기프티콘 등록해줘 만료일 12월 31일")
- 아이템 조회 ("기프티콘 목록 보여줘")
- 아이템 삭제 ("스타벅스 쿠폰 삭제해줘")
- 대화 세션 관리 (새 대화 / 이전 대화 전환 / 삭제)

### 📷 이미지 분석
- 기프티콘 사진 업로드 → AI가 브랜드, 상품명, 만료일 자동 추출
- 추출된 정보로 바로 등록 / 수정 후 등록 선택 가능

### 📍 근처 매장 찾기
- 기프티콘 브랜드 기반 주변 매장 검색
- Kakao Maps 지도 + 거리순 매장 목록

### 🔄 오프라인 지원
- localStorage 캐시로 오프라인에서도 목록 확인 가능
- 네트워크 복구 시 자동 갱신

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | React 19, TypeScript, Tailwind CSS v4, Vite |
| **백엔드** | AWS Lambda (Node.js 22), API Gateway |
| **AI** | AWS Bedrock (GPT-5.6 Terra) |
| **데이터베이스** | DynamoDB |
| **스토리지** | S3 (이미지) |
| **CDN** | CloudFront |
| **지도** | Kakao Maps SDK + REST API |
| **IaC** | AWS CDK (TypeScript) |

---

## 🏗 아키텍처

```
사용자 → CloudFront (프론트엔드)
     → API Gateway → Lambda (Items / Chat / Image / Location)
                       ├── DynamoDB (데이터)
                       ├── S3 (이미지)
                       ├── Bedrock GPT-5.6 Terra (AI)
                       └── Kakao Maps API (매장 검색)
```

전체 서버리스 구성으로, 서버 관리 없이 자동 스케일링됩니다.

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 22+
- AWS CLI (자격 증명 설정 완료)
- AWS CDK CLI (`npm install -g aws-cdk`)
- Kakao Developers 앱 (JavaScript 키 + REST API 키)

### 로컬 실행

```bash
# 백엔드 (mock 서버)
cd backend && npm install && npm run dev

# 프론트엔드
cd frontend && npm install && npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### AWS 배포

```bash
# 1. 환경변수 설정
cp infra/.env.example infra/.env
cp frontend/.env.production.example frontend/.env.production

# 2. 빌드
cd frontend && npm run build
cd ../backend && npm run build

# 3. CDK 부트스트랩 (최초 1회)
cd ../infra && npm install && npm run bootstrap

# 4. 배포
npm run deploy
```

### 배포 후 수동 설정

1. **Kakao Developers** — JavaScript SDK 도메인에 CloudFront URL 등록

---

## 🧹 리소스 정리

```bash
cd infra && npm run destroy
```

모든 AWS 리소스가 삭제됩니다.

---

## 📄 라이선스

MIT
