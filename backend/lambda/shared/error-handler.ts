import type { APIGatewayProxyResult } from 'aws-lambda';
import { ValidationError, NotFoundError } from './errors.js';
import { errorResponse } from './response.js';

/**
 * 공통 에러 핸들러 미들웨어
 * - ValidationError → 400
 * - NotFoundError → 404
 * - ThrottlingException → 429
 * - 기타 에러 → 500 (로깅 포함)
 */
export async function errorHandler(
  handler: () => Promise<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> {
  try {
    return await handler();
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        error.message,
        error.details
      );
    }

    if (error instanceof NotFoundError) {
      return errorResponse(404, 'NOT_FOUND', error.message);
    }

    if (
      error instanceof Error &&
      error.name === 'ThrottlingException'
    ) {
      return errorResponse(
        429,
        'RATE_LIMITED',
        '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
      );
    }

    // 예상치 못한 에러 - 로깅 후 500 반환
    console.error('Unhandled error:', error);
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      '서버 오류가 발생했습니다.'
    );
  }
}
