import type { ValidationResult } from '../shared/types.js';

/**
 * 이미지 분석 요청 검증
 * - 크기: Base64 디코딩 후 10MB 이하
 * - 형식: JPEG, PNG, WEBP만 허용
 */

const SUPPORTED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type SupportedContentType = (typeof SUPPORTED_CONTENT_TYPES)[number];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Base64 문자열의 원본 바이트 크기를 계산한다.
 * Base64는 원본의 약 4/3 크기이므로, padding을 고려하여 계산한다.
 */
export function calculateBase64Size(base64: string): number {
  // data:image/... prefix가 있으면 제거
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const padding = (raw.match(/=+$/) || [''])[0].length;
  return Math.floor((raw.length * 3) / 4) - padding;
}

/**
 * 이미지 유효성 검증
 * - base64: Base64 인코딩된 이미지 데이터
 * - contentType: MIME 타입
 * 
 * Returns: ValidationResult with specific error messages
 */
export function validateImage(base64: string | undefined | null, contentType: string | undefined | null): ValidationResult {
  const errors: string[] = [];

  // base64 데이터 존재 여부 확인
  if (!base64 || base64.trim().length === 0) {
    errors.push('이미지 데이터가 필요합니다.');
    return { valid: false, errors };
  }

  // contentType 확인
  if (!contentType) {
    errors.push('이미지 형식(imageContentType)이 필요합니다.');
  } else if (!SUPPORTED_CONTENT_TYPES.includes(contentType as SupportedContentType)) {
    errors.push(`지원하지 않는 이미지 형식입니다. 지원 형식: JPEG, PNG, WEBP`);
  }

  // 크기 확인
  const sizeBytes = calculateBase64Size(base64);
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    errors.push(`이미지 크기가 ${sizeMB}MB로 제한(10MB)을 초과합니다.`);
  }

  return { valid: errors.length === 0, errors };
}
