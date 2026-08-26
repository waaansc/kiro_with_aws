import type { ImageAnalysisResponse, Category } from '../shared/types.js';
import type { BedrockVisionResult } from './bedrock-vision.js';

/**
 * Bedrock Vision 분석 결과를 ImageAnalysisResponse 형식으로 변환한다.
 * - 이미지 유형에 따라 적절한 카테고리 매핑
 * - 추출된 필드 수에 기반한 신뢰도 점수 계산
 * - 부분 추출 및 완전 실패 처리
 */

/**
 * 이미지 유형에서 카테고리로 매핑
 */
function mapImageTypeToCategory(imageType: string): Category | undefined {
  switch (imageType) {
    case 'gifticon':
      return 'gifticon';
    case 'food_label':
      return 'food';
    case 'subscription':
      return 'subscription';
    default:
      return undefined;
  }
}

/**
 * 이미지 유형별 서브카테고리 결정
 */
function determineSubcategory(imageType: string): string | undefined {
  switch (imageType) {
    case 'gifticon':
      return '기타';  // 기본 서브카테고리, 세부 분류는 사용자가 수정 가능
    case 'food_label':
      return '상온';  // 기본 서브카테고리
    case 'subscription':
      return '구독 서비스';
    default:
      return undefined;
  }
}

/**
 * 추출된 필드 수를 기반으로 신뢰도 점수를 계산한다.
 * - 기프티콘: brand, name, expiryDate (3개 필드)
 * - 식재료: name, expiryDate (2개 필드)
 * - 정기결제: serviceName/name, paymentDate (2개 필드)
 * - unknown: 0점
 */
export function calculateConfidence(result: BedrockVisionResult): number {
  if (result.imageType === 'unknown') {
    return 0;
  }

  const { extractedData } = result;
  let extractedCount = 0;
  let totalFields = 0;

  switch (result.imageType) {
    case 'gifticon':
      totalFields = 3;
      if (extractedData.brand) extractedCount++;
      if (extractedData.name) extractedCount++;
      if (extractedData.expiryDate) extractedCount++;
      break;
    case 'food_label':
      totalFields = 2;
      if (extractedData.name) extractedCount++;
      if (extractedData.expiryDate) extractedCount++;
      break;
    case 'subscription':
      totalFields = 2;
      if (extractedData.serviceName || extractedData.name) extractedCount++;
      if (extractedData.paymentDate) extractedCount++;
      break;
  }

  if (totalFields === 0) return 0;

  // 기본 점수: 추출 비율 (0.0 ~ 1.0)
  // 최소 0.3 (유형 분류 성공 자체가 가치 있음)
  const ratio = extractedCount / totalFields;
  return Math.round((0.3 + ratio * 0.7) * 100) / 100;
}

/**
 * Bedrock Vision 분석 결과를 ImageAnalysisResponse로 변환한다.
 */
export function buildImageAnalysisResponse(result: BedrockVisionResult): ImageAnalysisResponse {
  const confidence = calculateConfidence(result);
  const category = mapImageTypeToCategory(result.imageType);
  const subcategory = determineSubcategory(result.imageType);

  // 정기결제의 경우 serviceName을 name으로 사용
  const name = result.extractedData.name || result.extractedData.serviceName || undefined;

  // 정기결제의 경우 paymentDate를 expiryDate로 사용
  const expiryDate = result.extractedData.expiryDate || result.extractedData.paymentDate || undefined;

  const extractedData: ImageAnalysisResponse['extractedData'] = {
    name,
    brand: result.extractedData.brand,
    expiryDate,
    category,
    subcategory,
  };

  // 완전 실패 케이스 (unknown 또는 아무 데이터도 추출 못함)
  if (result.imageType === 'unknown') {
    return {
      success: false,
      imageType: 'unknown',
      extractedData: {},
      confidence: 0,
      message: '이미지에서 관련 정보를 추출할 수 없습니다. 수동으로 입력해주세요.',
    };
  }

  // 부분 추출 케이스 (일부 필드만 추출됨)
  const hasAnyData = name || result.extractedData.brand || expiryDate;
  if (!hasAnyData) {
    return {
      success: false,
      imageType: result.imageType,
      extractedData: { category, subcategory },
      confidence: 0.3,
      message: '이미지 유형은 분류되었지만 세부 정보를 추출할 수 없습니다. 누락된 항목을 수동으로 입력해주세요.',
    };
  }

  // 성공 (전체 또는 부분 추출)
  const missingFields: string[] = [];
  if (!name) missingFields.push('이름');
  if (!expiryDate) missingFields.push('만료일');

  let message: string;
  if (missingFields.length > 0) {
    message = `이미지 분석이 완료되었습니다. 다음 항목을 수동으로 입력해주세요: ${missingFields.join(', ')}`;
  } else {
    message = '이미지 분석이 완료되었습니다. 추출된 정보를 확인해주세요.';
  }

  return {
    success: true,
    imageType: result.imageType,
    extractedData,
    confidence,
    message,
  };
}
