/**
 * CORS 설정 모듈
 * API Gateway Lambda Proxy Integration에서 사용하는 공통 CORS 헤더를 정의한다.
 *
 * 환경변수 ALLOWED_ORIGIN이 설정된 경우 해당 도메인만 허용하고,
 * 설정되지 않은 경우 모든 도메인(*)을 허용한다.
 *
 * Requirements: 12.4
 */

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

/**
 * CORS 응답 헤더
 * - Access-Control-Allow-Origin: 프론트엔드 도메인 (기본값: *)
 * - Access-Control-Allow-Headers: 허용되는 요청 헤더
 * - Access-Control-Allow-Methods: 허용되는 HTTP 메서드
 * - Content-Type: 응답 본문 형식
 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * OPTIONS 프리플라이트 요청에 대한 CORS 응답을 생성한다.
 * 모든 Lambda 핸들러에서 OPTIONS 메서드 처리에 사용된다.
 */
export function preflightResponse() {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: '',
  };
}
