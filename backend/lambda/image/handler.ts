import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../shared/response.js';
import { errorHandler } from '../shared/error-handler.js';
import { ValidationError } from '../shared/errors.js';
import type { ImageAnalysisRequest } from '../shared/types.js';
import { validateImage } from './image-processor.js';
import { analyzeImageWithBedrock } from './bedrock-vision.js';
import { buildImageAnalysisResponse } from './data-extractor.js';

/**
 * Image Analysis Lambda 핸들러
 * POST /api/chat/image - 이미지 분석 및 정보 추출
 * AWS Bedrock Claude Vision API를 호출하여 이미지를 분석한다.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod } = event;

  switch (httpMethod) {
    case 'POST':
      return errorHandler(() => analyzeImage(event));
    case 'OPTIONS':
      return successResponse({});
    default:
      return errorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${httpMethod} not allowed`);
  }
}

/**
 * 이미지 분석 처리
 * 1. 요청 body 파싱
 * 2. 이미지 형식/크기 검증
 * 3. Bedrock Vision API 호출
 * 4. 결과 변환 및 반환
 */
async function analyzeImage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // 1. 요청 body 파싱
  if (!event.body) {
    throw new ValidationError('요청 본문이 필요합니다.');
  }

  let body: ImageAnalysisRequest;
  try {
    body = JSON.parse(event.body);
  } catch {
    throw new ValidationError('유효하지 않은 JSON 형식입니다.');
  }

  const { imageBase64, imageContentType } = body;

  // 2. 이미지 형식/크기 검증
  const validation = validateImage(imageBase64, imageContentType);
  if (!validation.valid) {
    throw new ValidationError('이미지 검증 실패', validation.errors);
  }

  // 3. Bedrock Vision API 호출
  try {
    const bedrockResult = await analyzeImageWithBedrock(imageBase64, imageContentType);

    // 4. 결과 변환 및 반환
    const response = buildImageAnalysisResponse(bedrockResult);
    return successResponse(response);
  } catch (error: unknown) {
    // Bedrock 에러 처리
    if (error instanceof Error) {
      if (error.name === 'ThrottlingException') {
        throw error; // errorHandler에서 429로 처리
      }
      if (error.name === 'ModelTimeoutException' || error.name === 'ServiceUnavailableException') {
        return errorResponse(
          502,
          'AI_SERVICE_ERROR',
          'AI 서비스가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.'
        );
      }
      if (error.name === 'ValidationException') {
        return errorResponse(
          400,
          'AI_VALIDATION_ERROR',
          '이미지를 분석할 수 없습니다. 다른 이미지를 사용해주세요.'
        );
      }
    }

    console.error('Bedrock Vision API error:', error);
    return errorResponse(
      500,
      'ANALYSIS_FAILED',
      '이미지 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    );
  }
}
