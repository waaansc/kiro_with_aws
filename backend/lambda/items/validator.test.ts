import { describe, it, expect } from 'vitest';
import { validateCreateItem } from './validator.js';

describe('validateCreateItem', () => {
  const validRequest = {
    name: '스타벅스 아메리카노',
    category: 'gifticon' as const,
    expiryDate: '2025-12-31',
  };

  it('유효한 요청은 검증을 통과한다', () => {
    const result = validateCreateItem(validRequest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // === 이름 검증 ===
  describe('이름 검증', () => {
    it('이름이 없으면 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, name: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이름은 필수 항목입니다.');
    });

    it('이름이 빈 문자열이면 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이름은 필수 항목입니다.');
    });

    it('이름이 공백만 있으면 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, name: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이름은 필수 항목입니다.');
    });

    it('이름이 1자이면 검증을 통과한다', () => {
      const result = validateCreateItem({ ...validRequest, name: 'A' });
      expect(result.valid).toBe(true);
    });

    it('이름이 50자이면 검증을 통과한다', () => {
      const result = validateCreateItem({ ...validRequest, name: 'A'.repeat(50) });
      expect(result.valid).toBe(true);
    });

    it('이름이 51자이면 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, name: 'A'.repeat(51) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이름은 50자 이하여야 합니다.');
    });

    it('이름 양쪽 공백을 trim한 후 길이를 검증한다', () => {
      const result = validateCreateItem({ ...validRequest, name: '  A  ' });
      expect(result.valid).toBe(true);
    });
  });

  // === 카테고리 검증 ===
  describe('카테고리 검증', () => {
    it('카테고리가 없으면 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, category: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('카테고리는 필수 항목입니다.');
    });

    it.each(['gifticon', 'food', 'subscription', 'other'] as const)(
      '유효한 카테고리 "%s"는 검증을 통과한다',
      (category) => {
        const result = validateCreateItem({ ...validRequest, category });
        expect(result.valid).toBe(true);
      }
    );

    it('유효하지 않은 카테고리는 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, category: 'invalid' as any });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('유효하지 않은 카테고리입니다.');
    });
  });

  // === 만료일 검증 ===
  describe('만료일 검증', () => {
    it('만료일이 없으면 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, expiryDate: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('만료일은 필수 항목입니다.');
    });

    it('만료일이 유효한 YYYY-MM-DD 형식이면 검증을 통과한다', () => {
      const result = validateCreateItem({ ...validRequest, expiryDate: '2025-06-15' });
      expect(result.valid).toBe(true);
    });

    it('만료일이 잘못된 형식이면 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, expiryDate: '15/06/2025' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('만료일은 YYYY-MM-DD 형식이어야 합니다.');
    });

    it('만료일이 유효하지 않은 날짜이면 오류를 반환한다', () => {
      const result = validateCreateItem({ ...validRequest, expiryDate: '2025-13-45' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('유효하지 않은 날짜입니다.');
    });
  });

  // === 복합 오류 ===
  describe('복합 오류', () => {
    it('모든 필수 항목이 누락되면 모든 오류를 반환한다', () => {
      const result = validateCreateItem({});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('이름은 필수 항목입니다.');
      expect(result.errors).toContain('카테고리는 필수 항목입니다.');
      expect(result.errors).toContain('만료일은 필수 항목입니다.');
    });

    it('선택 항목만 제공하면 필수 항목 오류를 반환한다', () => {
      const result = validateCreateItem({ brand: 'SomeValue', memo: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
