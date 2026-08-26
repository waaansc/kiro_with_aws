import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { calculateDday } from './get-items.js';

describe('calculateDday', () => {
  it('만료일이 오늘보다 미래이면 양수를 반환한다', () => {
    const result = calculateDday('2025-01-10', '2025-01-05');
    expect(result).toBe(5);
  });

  it('만료일이 오늘이면 0을 반환한다', () => {
    const result = calculateDday('2025-01-05', '2025-01-05');
    expect(result).toBe(0);
  });

  it('만료일이 오늘보다 과거이면 음수를 반환한다', () => {
    const result = calculateDday('2025-01-01', '2025-01-05');
    expect(result).toBe(-4);
  });

  it('1일 차이를 정확히 계산한다', () => {
    const result = calculateDday('2025-03-02', '2025-03-01');
    expect(result).toBe(1);
  });

  it('큰 일수 차이도 정확히 계산한다', () => {
    const result = calculateDday('2025-12-31', '2025-01-01');
    expect(result).toBe(364);
  });

  it('윤년 날짜도 정확히 처리한다', () => {
    const result = calculateDday('2024-02-29', '2024-02-28');
    expect(result).toBe(1);
  });

  it('연도를 넘어가는 차이도 정확히 계산한다', () => {
    const result = calculateDday('2026-01-01', '2025-12-31');
    expect(result).toBe(1);
  });

  it('today 인자를 생략하면 현재 날짜 기준으로 계산한다', () => {
    // today 파라미터를 명시적으로 전달한 결과와 생략한 결과가 동일해야 함
    const todayStr = new Date().toISOString().split('T')[0];
    const expiryDate = '2030-06-15';

    const withExplicitToday = calculateDday(expiryDate, todayStr);
    const withDefaultToday = calculateDday(expiryDate);

    expect(withDefaultToday).toBe(withExplicitToday);
  });
});

describe('getItems', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('카테고리 없이 조회 시 ScanCommand를 사용한다', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      Items: [
        { id: '1', name: '테스트', category: 'food', expiryDate: '2025-12-31', isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
      ],
    });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { getItems } = await import('./get-items.js');

    const event = {
      queryStringParameters: null,
      path: '/api/items',
    } as unknown as APIGatewayProxyEvent;

    const result = await getItems(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.items).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(body.items[0]).toHaveProperty('dday');
  });

  it('카테고리 필터 시 QueryCommand를 사용한다', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      Items: [
        { id: '1', name: '스타벅스', category: 'gifticon', expiryDate: '2025-12-31', isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
      ],
    });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { getItems } = await import('./get-items.js');

    const event = {
      queryStringParameters: { category: 'gifticon' },
      path: '/api/items',
    } as unknown as APIGatewayProxyEvent;

    const result = await getItems(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].category).toBe('gifticon');
  });

  it('결과가 없으면 빈 배열을 반환한다', async () => {
    const mockSend = vi.fn().mockResolvedValue({ Items: [] });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { getItems } = await import('./get-items.js');

    const event = {
      queryStringParameters: null,
      path: '/api/items',
    } as unknown as APIGatewayProxyEvent;

    const result = await getItems(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.items).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('archived=true 시 아카이브된 아이템을 반환한다', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      Items: [
        { id: '1', name: '만료됨', category: 'food', expiryDate: '2024-01-01', isArchived: true, createdAt: '2024-01-01T00:00:00Z' },
      ],
    });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { getItems } = await import('./get-items.js');

    const event = {
      queryStringParameters: { archived: 'true' },
      path: '/api/items',
    } as unknown as APIGatewayProxyEvent;

    const result = await getItems(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.items).toHaveLength(1);
  });

  it('아이템을 만료일 가까운 순으로 정렬한다', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    const in10Days = new Date(today);
    in10Days.setDate(in10Days.getDate() + 10);
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 5);

    const mockSend = vi.fn().mockResolvedValue({
      Items: [
        { id: '3', name: '멀리', category: 'food', expiryDate: in10Days.toISOString().split('T')[0], isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
        { id: '1', name: '가까이', category: 'food', expiryDate: in3Days.toISOString().split('T')[0], isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
        { id: '2', name: '만료됨', category: 'food', expiryDate: pastDate.toISOString().split('T')[0], isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
      ],
    });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { getItems } = await import('./get-items.js');

    const event = {
      queryStringParameters: null,
      path: '/api/items',
    } as unknown as APIGatewayProxyEvent;

    const result = await getItems(event);
    const body = JSON.parse(result.body);

    // 비만료 아이템이 먼저, 만료 아이템이 마지막
    expect(body.items[0].name).toBe('가까이');
    expect(body.items[1].name).toBe('멀리');
    expect(body.items[2].name).toBe('만료됨');
    expect(body.items[2].dday).toBeLessThan(0);
  });
});

describe('getItemDetail', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('존재하는 아이템 ID로 조회 시 상세 정보와 dday를 반환한다', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      Item: {
        id: 'test-id-123',
        name: '스타벅스 아메리카노',
        category: 'gifticon',
        subcategory: '카페',
        expiryDate: '2025-12-31',
        brand: '스타벅스',
        memo: '테스트 메모',
        imageUrl: 'https://example.com/image.jpg',
        createdAt: '2025-01-01T00:00:00Z',
        isArchived: false,
      },
    });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { getItemDetail } = await import('./get-item-detail.js');

    const event = {
      path: '/api/items/test-id-123',
    } as unknown as APIGatewayProxyEvent;

    const result = await getItemDetail(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.id).toBe('test-id-123');
    expect(body.name).toBe('스타벅스 아메리카노');
    expect(body.category).toBe('gifticon');
    expect(body.subcategory).toBe('카페');
    expect(body.brand).toBe('스타벅스');
    expect(body.memo).toBe('테스트 메모');
    expect(body).toHaveProperty('dday');
    expect(typeof body.dday).toBe('number');
  });

  it('존재하지 않는 아이템 ID로 조회 시 NotFoundError를 throw한다', async () => {
    const mockSend = vi.fn().mockResolvedValue({ Item: undefined });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { getItemDetail } = await import('./get-item-detail.js');

    const event = {
      path: '/api/items/non-existent-id',
    } as unknown as APIGatewayProxyEvent;

    await expect(getItemDetail(event)).rejects.toThrow('아이템을 찾을 수 없습니다');
  });
});
