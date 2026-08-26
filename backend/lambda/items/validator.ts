import type { CreateItemRequest, ValidationResult, Category } from '../shared/types.js';

const VALID_CATEGORIES: Category[] = ['gifticon', 'food', 'subscription', 'other'];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 아이템 생성 요청 유효성 검증
 * - 이름: 필수, trim 후 1~50자
 * - 카테고리: 필수, 유효한 4개 값 중 하나
 * - 만료일: 필수, YYYY-MM-DD 형식의 유효한 날짜
 */
export function validateCreateItem(data: Partial<CreateItemRequest>): ValidationResult {
  const errors: string[] = [];

  // 이름 검증
  if (!data.name || data.name.trim().length === 0) {
    errors.push('이름은 필수 항목입니다.');
  } else if (data.name.trim().length > 50) {
    errors.push('이름은 50자 이하여야 합니다.');
  }

  // 카테고리 검증
  if (!data.category) {
    errors.push('카테고리는 필수 항목입니다.');
  } else if (!VALID_CATEGORIES.includes(data.category as Category)) {
    errors.push('유효하지 않은 카테고리입니다.');
  }

  // 만료일 검증
  if (!data.expiryDate) {
    errors.push('만료일은 필수 항목입니다.');
  } else if (!ISO_DATE_REGEX.test(data.expiryDate)) {
    errors.push('만료일은 YYYY-MM-DD 형식이어야 합니다.');
  } else {
    const date = new Date(data.expiryDate);
    if (isNaN(date.getTime())) {
      errors.push('유효하지 않은 날짜입니다.');
    }
  }

  return { valid: errors.length === 0, errors };
}
