import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUpdateItem } from './update-item.js';

// Mock DynamoDB client
vi.mock('../shared/dynamodb-client.js', () => ({
  docClient: {
    send: vi.fn(),
  },
  TABLE_NAME: 'test-table',
}));

describe('validateUpdateItem', () => {
  // === 이름 검증 ===
  describe('이름 검증', () => {
    it('이름이 유효한 값이면 검증을 통과한다', () => {
      const result = validateUpdateItem({ name: '스타벅스 아메리카노' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('이름이 null이면 오류를 반환한다', () => {
      const result = validateUpdateItem({ name: null as unknown as string });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이름은 필수 항목이며 null로 설정할 수 없습니다.');
    });

    it('이름이 빈 문자열이면 오류를 반환한다', () => {
      const result = validateUpdateItem({ name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이름은 필수 항목이며 빈 값으로 설정할 수 없습니다.');
    });

    it('이름이 공백만 있으면 오류를 반환한다', () => {
      const result = validateUpdateItem({ name: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이름은 필수 항목이며 빈 값으로 설정할 수 없습니다.');
    });

    it('이름이 50자이면 검증을 통과한다', () => {
      const result = validateUpdateItem({ name: 'A'.repeat(50) });
      expect(result.valid).toBe(true);
    });

    it('이름이 51자이면 오류를 반환한다', () => {
      const result = validateUpdateItem({ name: 'A'.repeat(51) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('이름은 50자 이하여야 합니다.');
    });
  });

  // === 카테고리 검증 ===
  describe('카테고리 검증', () => {
    it('유효한 카테고리는 검증을 통과한다', () => {
      const result = validateUpdateItem({ category: 'gifticon' });
      expect(result.valid).toBe(true);
    });

    it.each(['gifticon', 'food', 'subscription', 'other'] as const)(
      '유효한 카테고리 "%s"는 검증을 통과한다',
      (category) => {
        const result = validateUpdateItem({ category });
        expect(result.valid).toBe(true);
      }
    );

    it('카테고리가 null이면 오류를 반환한다', () => {
      const result = validateUpdateItem({ category: null as unknown as undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('카테고리는 필수 항목이며 null로 설정할 수 없습니다.');
    });

    it('유효하지 않은 카테고리는 오류를 반환한다', () => {
      const result = validateUpdateItem({ category: 'invalid' as any });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('유효하지 않은 카테고리입니다.');
    });
  });

  // === 만료일 검증 ===
  describe('만료일 검증', () => {
    it('유효한 만료일이면 검증을 통과한다', () => {
      const result = validateUpdateItem({ expiryDate: '2025-12-31' });
      expect(result.valid).toBe(true);
    });

    it('만료일이 null이면 오류를 반환한다', () => {
      const result = validateUpdateItem({ expiryDate: null as unknown as string });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('만료일은 필수 항목이며 null로 설정할 수 없습니다.');
    });

    it('만료일이 빈 문자열이면 오류를 반환한다', () => {
      const result = validateUpdateItem({ expiryDate: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('만료일은 필수 항목이며 빈 값으로 설정할 수 없습니다.');
    });

    it('만료일이 잘못된 형식이면 오류를 반환한다', () => {
      const result = validateUpdateItem({ expiryDate: '15/06/2025' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('만료일은 YYYY-MM-DD 형식이어야 합니다.');
    });

    it('만료일이 유효하지 않은 날짜이면 오류를 반환한다', () => {
      const result = validateUpdateItem({ expiryDate: '2025-13-45' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('유효하지 않은 날짜입니다.');
    });

    it('과거 만료일도 검증은 통과한다 (경고만 제공)', () => {
      const result = validateUpdateItem({ expiryDate: '2020-01-01' });
      expect(result.valid).toBe(true);
    });
  });

  // === 필드 미포함 시 검증 불필요 ===
  describe('필드 미포함 시 검증 불필요', () => {
    it('아무 필드도 포함하지 않으면 검증은 통과한다', () => {
      const result = validateUpdateItem({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('선택적 필드만 포함하면 검증을 통과한다', () => {
      const result = validateUpdateItem({ brand: 'NewBrand', memo: 'New memo' });
      expect(result.valid).toBe(true);
    });
  });

  // === 복합 검증 ===
  describe('복합 검증', () => {
    it('여러 필수 필드가 null이면 모든 오류를 반환한다', () => {
      const result = validateUpdateItem({
        name: null as unknown as string,
        category: null as unknown as undefined,
        expiryDate: null as unknown as string,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('유효한 필드와 유효하지 않은 필드가 혼합되면 해당 오류만 반환한다', () => {
      const result = validateUpdateItem({
        name: '유효한 이름',
        category: 'invalid' as any,
        expiryDate: '2025-12-31',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toContain('유효하지 않은 카테고리입니다.');
    });
  });
});

describe('updateItem handler', () => {
  let docClientMock: { send: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { docClient } = await import('../shared/dynamodb-client.js');
    docClientMock = docClient as unknown as { send: ReturnType<typeof vi.fn> };
  });

  it('아이템이 성공적으로 수정되면 업데이트된 아이템과 메시지를 반환한다', async () => {
    const { updateItem } = await import('./update-item.js');

    const updatedAttributes = {
      id: 'test-id',
      name: '수정된 이름',
      category: 'food',
      expiryDate: '2025-12-31',
      createdAt: '2025-01-01T00:00:00.000Z',
      isArchived: false,
    };

    docClientMock.send.mockResolvedValueOnce({ Attributes: updatedAttributes });

    const event = {
      path: '/api/items/test-id',
      httpMethod: 'PUT',
      body: JSON.stringify({ name: '수정된 이름' }),
      queryStringParameters: null,
      pathParameters: null,
      headers: {},
    } as any;

    const result = await updateItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.message).toBe('아이템이 성공적으로 수정되었습니다.');
    expect(body.name).toBe('수정된 이름');
  });

  it('존재하지 않는 아이템 수정 시 NotFoundError를 throw한다', async () => {
    const { updateItem } = await import('./update-item.js');

    const conditionalError = new Error('The conditional request failed');
    conditionalError.name = 'ConditionalCheckFailedException';
    docClientMock.send.mockRejectedValueOnce(conditionalError);

    const event = {
      path: '/api/items/non-existent-id',
      httpMethod: 'PUT',
      body: JSON.stringify({ name: '수정된 이름' }),
      queryStringParameters: null,
      pathParameters: null,
      headers: {},
    } as any;

    await expect(updateItem(event)).rejects.toThrow('아이템을 찾을 수 없습니다: non-existent-id');
  });

  it('과거 만료일로 수정하면 warning을 포함하여 반환한다', async () => {
    const { updateItem } = await import('./update-item.js');

    const updatedAttributes = {
      id: 'test-id',
      name: '기프티콘',
      category: 'gifticon',
      expiryDate: '2020-01-01',
      createdAt: '2025-01-01T00:00:00.000Z',
      isArchived: false,
    };

    docClientMock.send.mockResolvedValueOnce({ Attributes: updatedAttributes });

    const event = {
      path: '/api/items/test-id',
      httpMethod: 'PUT',
      body: JSON.stringify({ expiryDate: '2020-01-01' }),
      queryStringParameters: null,
      pathParameters: null,
      headers: {},
    } as any;

    const result = await updateItem(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.warning).toBe('만료일이 과거 날짜입니다. 저장은 허용되었습니다.');
  });

  it('아이템 ID가 없으면 NotFoundError를 throw한다', async () => {
    const { updateItem } = await import('./update-item.js');

    const event = {
      path: '/api/items',
      httpMethod: 'PUT',
      body: JSON.stringify({ name: '수정된 이름' }),
      queryStringParameters: null,
      pathParameters: null,
      headers: {},
    } as any;

    await expect(updateItem(event)).rejects.toThrow('아이템 ID가 지정되지 않았습니다.');
  });

  it('수정할 필드가 없으면 ValidationError를 throw한다', async () => {
    const { updateItem } = await import('./update-item.js');

    const event = {
      path: '/api/items/test-id',
      httpMethod: 'PUT',
      body: JSON.stringify({}),
      queryStringParameters: null,
      pathParameters: null,
      headers: {},
    } as any;

    await expect(updateItem(event)).rejects.toThrow('수정할 필드가 없습니다.');
  });

  it('필수 항목이 빈 값이면 ValidationError를 throw한다', async () => {
    const { updateItem } = await import('./update-item.js');

    const event = {
      path: '/api/items/test-id',
      httpMethod: 'PUT',
      body: JSON.stringify({ name: '' }),
      queryStringParameters: null,
      pathParameters: null,
      headers: {},
    } as any;

    await expect(updateItem(event)).rejects.toThrow('유효성 검증 실패');
  });
});
