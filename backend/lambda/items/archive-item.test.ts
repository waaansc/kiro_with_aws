import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

describe('archiveExpired', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('만료된 아이템을 일괄 아카이브한다', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 3);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 5);

    const mockSend = vi.fn()
      // First call: ScanCommand
      .mockResolvedValueOnce({
        Items: [
          { id: '1', name: '만료됨', category: 'food', expiryDate: pastDate.toISOString().split('T')[0], isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
          { id: '2', name: '유효함', category: 'food', expiryDate: futureDate.toISOString().split('T')[0], isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
        ],
      })
      // Second call: UpdateCommand for expired item
      .mockResolvedValueOnce({});

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { archiveExpired } = await import('./archive-item.js');

    const result = await archiveExpired();
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.archivedCount).toBe(1);
    expect(body.message).toContain('1개');

    // ScanCommand 1회 + UpdateCommand 1회
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('만료된 아이템이 없으면 0개 아카이브를 반환한다', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const mockSend = vi.fn().mockResolvedValueOnce({
      Items: [
        { id: '1', name: '유효함', category: 'food', expiryDate: futureDate.toISOString().split('T')[0], isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
      ],
    });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { archiveExpired } = await import('./archive-item.js');

    const result = await archiveExpired();
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.archivedCount).toBe(0);

    // ScanCommand만 1회
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('아이템이 없으면 빈 결과를 반환한다', async () => {
    const mockSend = vi.fn().mockResolvedValueOnce({ Items: [] });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { archiveExpired } = await import('./archive-item.js');

    const result = await archiveExpired();
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.archivedCount).toBe(0);
  });

  it('여러 만료 아이템을 모두 아카이브한다', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDate1 = new Date(today);
    pastDate1.setDate(pastDate1.getDate() - 1);
    const pastDate2 = new Date(today);
    pastDate2.setDate(pastDate2.getDate() - 7);

    const mockSend = vi.fn()
      .mockResolvedValueOnce({
        Items: [
          { id: '1', name: '만료1', category: 'food', expiryDate: pastDate1.toISOString().split('T')[0], isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
          { id: '2', name: '만료2', category: 'gifticon', expiryDate: pastDate2.toISOString().split('T')[0], isArchived: false, createdAt: '2025-01-01T00:00:00Z' },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { archiveExpired } = await import('./archive-item.js');

    const result = await archiveExpired();
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.archivedCount).toBe(2);

    // ScanCommand 1회 + UpdateCommand 2회
    expect(mockSend).toHaveBeenCalledTimes(3);
  });
});

describe('restoreItem', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('아카이브된 아이템을 복원한다', async () => {
    const mockSend = vi.fn().mockResolvedValueOnce({
      Attributes: {
        id: 'test-id-123',
        name: '스타벅스',
        category: 'gifticon',
        expiryDate: '2025-12-31',
        isArchived: false,
        createdAt: '2025-01-01T00:00:00Z',
      },
    });

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { restoreItem } = await import('./archive-item.js');

    const event = {
      path: '/api/items/test-id-123/restore',
    } as unknown as APIGatewayProxyEvent;

    const result = await restoreItem(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.message).toBe('아이템이 복원되었습니다.');
    expect(body.item.id).toBe('test-id-123');
    expect(body.item.isArchived).toBe(false);
  });

  it('존재하지 않는 아이템 복원 시 NotFoundError를 throw한다', async () => {
    const error = new Error('ConditionalCheckFailedException');
    error.name = 'ConditionalCheckFailedException';

    const mockSend = vi.fn().mockRejectedValueOnce(error);

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { restoreItem } = await import('./archive-item.js');

    const event = {
      path: '/api/items/non-existent/restore',
    } as unknown as APIGatewayProxyEvent;

    await expect(restoreItem(event)).rejects.toThrow('아이템을 찾을 수 없습니다');
  });

  it('아이템 ID가 없는 경로 시 NotFoundError를 throw한다', async () => {
    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: vi.fn() },
      TABLE_NAME: 'test-table',
    }));

    const { restoreItem } = await import('./archive-item.js');

    const event = {
      path: '/api/items/restore',
    } as unknown as APIGatewayProxyEvent;

    await expect(restoreItem(event)).rejects.toThrow('아이템 ID가 지정되지 않았습니다');
  });

  it('DynamoDB 오류가 발생하면 re-throw한다', async () => {
    const error = new Error('InternalServerError');
    error.name = 'InternalServerError';

    const mockSend = vi.fn().mockRejectedValueOnce(error);

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { restoreItem } = await import('./archive-item.js');

    const event = {
      path: '/api/items/test-id/restore',
    } as unknown as APIGatewayProxyEvent;

    await expect(restoreItem(event)).rejects.toThrow('InternalServerError');
  });
});
