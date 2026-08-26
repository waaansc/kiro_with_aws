# Constraints (기술 제약사항)

## 프로젝트 범위
- 하루(1일) 안에 완성 가능한 초경량 MVP
- 1인 개발, 바이브 코딩 프로젝트

## 기술 스택
- **프론트엔드**: React + TypeScript, Vite 빌드
- **UI 프레임워크**: Tailwind CSS (빠른 스타일링)
- **백엔드**: Node.js + Express (또는 Next.js API Routes)
- **데이터베이스**: DynamoDB (서버리스, AWS 통합 용이)
- **AI 챗봇**: AWS Bedrock (Claude 모델) - 이미지 분석 및 자동 등록
- **지도/위치**: Kakao Maps API 또는 Google Maps API (사용처 위치 기반 검색)

## 제약 조건
- 별도 인증/로그인 없이 로컬 또는 단일 사용자 기준으로 동작
- AWS Bedrock API 호출 비용 최소화 (이미지 분석은 필요 시에만 호출)
- 외부 의존성 최소화 (핵심 기능에 집중)
- 모바일 반응형 UI 지원 (일상에서 빠르게 확인 가능해야 함)
- 브라우저 Geolocation API로 사용자 위치 획득 (별도 GPS 모듈 불필요)

## 배포 (AWS)
- **프론트엔드**: S3 + CloudFront (정적 호스팅)
- **백엔드 API**: Lambda + API Gateway (서버리스)
- **데이터베이스**: DynamoDB (서버리스, 관리 불필요)
- **이미지 저장**: S3 버킷
- **인프라 관리**: AWS CDK 또는 SAM (선택)
- 환경변수로 AWS 자격증명 및 Maps API 키 관리

## 시간 제약에 따른 우선순위
1. 핵심: 아이템 CRUD + D-day 대시보드
2. 핵심: AWS Bedrock 이미지 분석 → 자동 등록
3. 부가: 위치 기반 사용처 검색
4. 선택: 알림(브라우저 Notification) 기능
