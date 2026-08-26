import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

describe('deleteItem', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('존재하는 아이템 삭제 시 200과 삭제 완료 메시지를 반환한다', async () => {
    const mockSend = vi.fn().mockResolvedValue({});

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { deleteItem } = await import('./delete-item.js');

    const event = {
      path: '/api/items/test-id-123',
    } as unknown as APIGatewayProxyEvent;

    const result = await deleteItem(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.message).toBe('아이템이 삭제되었습니다.');
  });

  it('존재하지 않는 아이템 삭제 시 NotFoundError를 throw한다', async () => {
    const conditionalCheckError = new Error('The conditional request failed');
    conditionalCheckError.name = 'ConditionalCheckFailedException';

    const mockSend = vi.fn().mockRejectedValue(conditionalCheckError);

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { deleteItem } = await import('./delete-item.js');

    const event = {
      path: '/api/items/non-existent-id',
    } as unknown as APIGatewayProxyEvent;

    await expect(deleteItem(event)).rejects.toThrow('해당 아이템을 찾을 수 없습니다.');
    try {
      await deleteItem(event);
    } catch (error: unknown) {
      expect((error as Error).name).toBe('NotFoundError');
    }
  });

  it('아이템 ID가 없는 경로에서 NotFoundError를 throw한다', async () => {
    const mockSend = vi.fn();

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { deleteItem } = await import('./delete-item.js');

    const event = {
      path: '/api/items',
    } as unknown as APIGatewayProxyEvent;

    await expect(deleteItem(event)).rejects.toThrow('아이템 ID가 지정되지 않았습니다.');
    try {
      await deleteItem(event);
    } catch (error: unknown) {
      expect((error as Error).name).toBe('NotFoundError');
    }
  });

  it('시스템 오류 발생 시 에러를 re-throw하여 데이터를 보존한다', async () => {
    const systemError = new Error('Service Unavailable');
    systemError.name = 'InternalServerError';

    const mockSend = vi.fn().mockRejectedValue(systemError);

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { deleteItem } = await import('./delete-item.js');

    const event = {
      path: '/api/items/test-id-123',
    } as unknown as APIGatewayProxyEvent;

    await expect(deleteItem(event)).rejects.toThrow('Service Unavailable');
  });

  it('DeleteCommand에 올바른 ConditionExpression을 전달한다', async () => {
    const mockSend = vi.fn().mockResolvedValue({});

    vi.doMock('../shared/dynamodb-client.js', () => ({
      docClient: { send: mockSend },
      TABLE_NAME: 'test-table',
    }));

    const { deleteItem } = await import('./delete-item.js');

    const event = {
      path: '/api/items/item-456',
    } as unknown as APIGatewayProxyEvent;

    await deleteItem(event);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input).toEqual({
      TableName: 'test-table',
      Key: { id: 'item-456' },
      ConditionExpression: 'attribute_exists(id)',
    });
  });
});
