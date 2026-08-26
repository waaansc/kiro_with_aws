import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { validateImage, calculateBase64Size } from './image-processor.js';
import { calculateConfidence, buildImageAnalysisResponse } from './data-extractor.js';
import type { BedrockVisionResult } from './bedrock-vision.js';
import { handler } from './handler.js';

// Bedrock Vision 모듈을 모킹
vi.mock('./bedrock-vision.js', () => ({
  analyzeImageWithBedrock: vi.fn(),
  getBedrockClient: vi.fn(),
  setBedrockClient: vi.fn(),
  resetBedrockClient: vi.fn(),
}));

import { analyzeImageWithBedrock } from './bedrock-vision.js';
const mockAnalyze = vi.mocked(analyzeImageWithBedrock);

// 유효한 작은 Base64 이미지 (약 100바이트 상당)
const VALID_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function createEvent(body: unknown): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/api/chat/image',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

// === image-processor.ts 테스트 ===
describe('image-processor', () => {
  describe('calculateBase64Size', () => {
    it('정상적인 base64 문자열의 바이트 크기를 계산한다', () => {
      // 4글자 base64 = 3바이트
      const size = calculateBase64Size('AAAA');
      expect(size).toBe(3);
    });

    it('패딩(=)이 있는 base64를 올바르게 계산한다', () => {
      // 'AA==' -> 1바이트
      const size = calculateBase64Size('AA==');
      expect(size).toBe(1);
    });

    it('data URL prefix를 제거하고 계산한다', () => {
      const size = calculateBase64Size(`data:image/png;base64,${VALID_BASE64}`);
      const sizeWithoutPrefix = calculateBase64Size(VALID_BASE64);
      expect(size).toBe(sizeWithoutPrefix);
    });
  });

  describe('validateImage', () => {
    it('유효한 이미지 데이터는 검증을 통과한다', () => {
      const result = validateImage(VALID_BASE64, 'image/jpeg');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('빈 base64 데이터는 에러를 반환한다', () => {
      const result = validateImage('', 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이미지 데이터가 필요합니다.');
    });

    it('null base64 데이터는 에러를 반환한다', () => {
      const result = validateImage(null, 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이미지 데이터가 필요합니다.');
    });

    it('contentType이 없으면 에러를 반환한다', () => {
      const result = validateImage(VALID_BASE64, null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이미지 형식(imageContentType)이 필요합니다.');
    });

    it('지원하지 않는 형식은 에러를 반환한다', () => {
      const result = validateImage(VALID_BASE64, 'image/gif');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('지원하지 않는 이미지 형식');
    });

    it('JPEG 형식은 허용된다', () => {
      const result = validateImage(VALID_BASE64, 'image/jpeg');
      expect(result.valid).toBe(true);
    });

    it('PNG 형식은 허용된다', () => {
      const result = validateImage(VALID_BASE64, 'image/png');
      expect(result.valid).toBe(true);
    });

    it('WEBP 형식은 허용된다', () => {
      const result = validateImage(VALID_BASE64, 'image/webp');
      expect(result.valid).toBe(true);
    });

    it('10MB 초과 이미지는 에러를 반환한다', () => {
      // 14MB 상당의 base64 생성 (10MB 원본 ~ 약 13.3MB base64)
      const largeBase64 = 'A'.repeat(14 * 1024 * 1024);
      const result = validateImage(largeBase64, 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('제한(10MB)을 초과');
    });

    it('여러 에러를 동시에 반환할 수 있다', () => {
      // 10MB 초과 + 지원하지 않는 형식
      const largeBase64 = 'A'.repeat(14 * 1024 * 1024);
      const result = validateImage(largeBase64, 'image/bmp');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// === data-extractor.ts 테스트 ===
describe('data-extractor', () => {
  describe('calculateConfidence', () => {
    it('unknown 유형은 0 신뢰도를 반환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'unknown',
        extractedData: {},
        rawResponse: '',
      };
      expect(calculateConfidence(result)).toBe(0);
    });

    it('기프티콘 3개 필드 모두 추출 시 1.0을 반환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'gifticon',
        extractedData: { brand: '스타벅스', name: '아메리카노', expiryDate: '2025-12-31' },
        rawResponse: '',
      };
      expect(calculateConfidence(result)).toBe(1.0);
    });

    it('기프티콘 2개 필드 추출 시 중간 신뢰도를 반환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'gifticon',
        extractedData: { brand: '스타벅스', name: '아메리카노' },
        rawResponse: '',
      };
      const confidence = calculateConfidence(result);
      expect(confidence).toBeGreaterThan(0.3);
      expect(confidence).toBeLessThan(1.0);
    });

    it('식재료 라벨 모든 필드 추출 시 1.0을 반환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'food_label',
        extractedData: { name: '우유', expiryDate: '2025-03-01' },
        rawResponse: '',
      };
      expect(calculateConfidence(result)).toBe(1.0);
    });

    it('정기결제 serviceName과 paymentDate 추출 시 1.0을 반환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'subscription',
        extractedData: { serviceName: '넷플릭스', paymentDate: '2025-02-15' },
        rawResponse: '',
      };
      expect(calculateConfidence(result)).toBe(1.0);
    });

    it('추출 필드 없는 유형 분류만 성공 시 0.3을 반환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'gifticon',
        extractedData: {},
        rawResponse: '',
      };
      expect(calculateConfidence(result)).toBe(0.3);
    });
  });

  describe('buildImageAnalysisResponse', () => {
    it('기프티콘 전체 추출 결과를 올바르게 변환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'gifticon',
        extractedData: {
          brand: '스타벅스',
          name: '아이스 아메리카노',
          expiryDate: '2025-06-30',
        },
        rawResponse: '',
      };

      const response = buildImageAnalysisResponse(result);
      expect(response.success).toBe(true);
      expect(response.imageType).toBe('gifticon');
      expect(response.extractedData.brand).toBe('스타벅스');
      expect(response.extractedData.name).toBe('아이스 아메리카노');
      expect(response.extractedData.expiryDate).toBe('2025-06-30');
      expect(response.extractedData.category).toBe('gifticon');
      expect(response.confidence).toBe(1.0);
    });

    it('식재료 라벨 결과를 올바르게 변환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'food_label',
        extractedData: { name: '서울우유 1L', expiryDate: '2025-03-15' },
        rawResponse: '',
      };

      const response = buildImageAnalysisResponse(result);
      expect(response.success).toBe(true);
      expect(response.imageType).toBe('food_label');
      expect(response.extractedData.category).toBe('food');
      expect(response.extractedData.name).toBe('서울우유 1L');
      expect(response.extractedData.expiryDate).toBe('2025-03-15');
    });

    it('정기결제 결과를 올바르게 변환한다 (serviceName → name, paymentDate → expiryDate)', () => {
      const result: BedrockVisionResult = {
        imageType: 'subscription',
        extractedData: { serviceName: '넷플릭스', paymentDate: '2025-02-28' },
        rawResponse: '',
      };

      const response = buildImageAnalysisResponse(result);
      expect(response.success).toBe(true);
      expect(response.imageType).toBe('subscription');
      expect(response.extractedData.category).toBe('subscription');
      expect(response.extractedData.name).toBe('넷플릭스');
      expect(response.extractedData.expiryDate).toBe('2025-02-28');
    });

    it('unknown 유형은 실패 응답을 반환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'unknown',
        extractedData: {},
        rawResponse: '',
      };

      const response = buildImageAnalysisResponse(result);
      expect(response.success).toBe(false);
      expect(response.imageType).toBe('unknown');
      expect(response.confidence).toBe(0);
      expect(response.message).toContain('추출할 수 없습니다');
    });

    it('유형은 분류되었지만 데이터 추출 실패 시 부분 실패 응답을 반환한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'gifticon',
        extractedData: {},
        rawResponse: '',
      };

      const response = buildImageAnalysisResponse(result);
      expect(response.success).toBe(false);
      expect(response.imageType).toBe('gifticon');
      expect(response.confidence).toBe(0.3);
      expect(response.message).toContain('수동으로 입력');
    });

    it('일부 필드 누락 시 누락 항목 안내 메시지를 포함한다', () => {
      const result: BedrockVisionResult = {
        imageType: 'gifticon',
        extractedData: { brand: '스타벅스', name: '아메리카노' },
        rawResponse: '',
      };

      const response = buildImageAnalysisResponse(result);
      expect(response.success).toBe(true);
      expect(response.message).toContain('만료일');
    });
  });
});

// === handler.ts 통합 테스트 ===
describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OPTIONS 요청은 200을 반환한다', async () => {
    const event = { ...createEvent(null), httpMethod: 'OPTIONS' };
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });

  it('지원하지 않는 HTTP 메소드는 405를 반환한다', async () => {
    const event = { ...createEvent(null), httpMethod: 'GET' };
    const result = await handler(event);
    expect(result.statusCode).toBe(405);
  });

  it('body가 없으면 400을 반환한다', async () => {
    const event = { ...createEvent(null), body: null };
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('유효하지 않은 JSON body는 400을 반환한다', async () => {
    const event = { ...createEvent(null), body: 'not-json' };
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it('이미지 데이터 없으면 400을 반환한다', async () => {
    const event = createEvent({ imageBase64: '', imageContentType: 'image/jpeg' });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.details).toContain('이미지 데이터가 필요합니다.');
  });

  it('지원하지 않는 이미지 형식은 400을 반환한다', async () => {
    const event = createEvent({ imageBase64: VALID_BASE64, imageContentType: 'image/gif' });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.details[0]).toContain('지원하지 않는 이미지 형식');
  });

  it('유효한 요청으로 이미지 분석 성공 시 200을 반환한다', async () => {
    mockAnalyze.mockResolvedValue({
      imageType: 'gifticon',
      extractedData: {
        brand: '스타벅스',
        name: '아이스 아메리카노',
        expiryDate: '2025-12-31',
      },
      rawResponse: '{}',
    });

    const event = createEvent({ imageBase64: VALID_BASE64, imageContentType: 'image/png' });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.imageType).toBe('gifticon');
    expect(body.extractedData.brand).toBe('스타벅스');
    expect(body.confidence).toBe(1.0);
  });

  it('Bedrock ThrottlingException 시 429를 반환한다', async () => {
    const throttleError = new Error('Too many requests');
    throttleError.name = 'ThrottlingException';
    mockAnalyze.mockRejectedValue(throttleError);

    const event = createEvent({ imageBase64: VALID_BASE64, imageContentType: 'image/jpeg' });
    const result = await handler(event);
    expect(result.statusCode).toBe(429);
  });

  it('Bedrock ModelTimeoutException 시 502를 반환한다', async () => {
    const timeoutError = new Error('Model timeout');
    timeoutError.name = 'ModelTimeoutException';
    mockAnalyze.mockRejectedValue(timeoutError);

    const event = createEvent({ imageBase64: VALID_BASE64, imageContentType: 'image/jpeg' });
    const result = await handler(event);
    expect(result.statusCode).toBe(502);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('AI_SERVICE_ERROR');
  });

  it('Bedrock ValidationException 시 400을 반환한다', async () => {
    const validationError = new Error('Invalid image');
    validationError.name = 'ValidationException';
    mockAnalyze.mockRejectedValue(validationError);

    const event = createEvent({ imageBase64: VALID_BASE64, imageContentType: 'image/jpeg' });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('AI_VALIDATION_ERROR');
  });

  it('예상치 못한 Bedrock 에러 시 500을 반환한다', async () => {
    mockAnalyze.mockRejectedValue(new Error('Unknown error'));

    const event = createEvent({ imageBase64: VALID_BASE64, imageContentType: 'image/jpeg' });
    const result = await handler(event);
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('ANALYSIS_FAILED');
  });

  it('이미지 분석 결과가 unknown이면 success=false 응답을 반환한다', async () => {
    mockAnalyze.mockResolvedValue({
      imageType: 'unknown',
      extractedData: {},
      rawResponse: '{}',
    });

    const event = createEvent({ imageBase64: VALID_BASE64, imageContentType: 'image/jpeg' });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.imageType).toBe('unknown');
    expect(body.confidence).toBe(0);
  });
});
