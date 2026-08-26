import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock bedrock-client
vi.mock('./bedrock-client.js', () => ({
  invokeClaude: vi.fn(),
}));

// Mock DynamoDB client
vi.mock('../shared/dynamodb-client.js', () => ({
  docClient: {
    send: vi.fn(),
  },
  TABLE_NAME: 'test-table',
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

import { handler } from './handler.js';
import { invokeClaude } from './bedrock-client.js';
import { docClient } from '../shared/dynamodb-client.js';

const mockInvokeClaude = vi.mocked(invokeClaude);
const mockDocClientSend = vi.mocked(docClient.send);

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/api/chat',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
    ...overrides,
  };
}

describe('Chat Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/chat - request validation', () => {
    it('should return 400 when body is empty', async () => {
      const event = createEvent({ body: null });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when message is empty', async () => {
      const event = createEvent({ body: JSON.stringify({ message: '' }) });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when message is whitespace only', async () => {
      const event = createEvent({ body: JSON.stringify({ message: '   ' }) });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 405 for unsupported HTTP methods', async () => {
      const event = createEvent({ httpMethod: 'DELETE' });

      const result = await handler(event);
      expect(result.statusCode).toBe(405);
    });

    it('should return 200 for OPTIONS (CORS preflight)', async () => {
      const event = createEvent({ httpMethod: 'OPTIONS' });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('POST /api/chat - create intent (Req 7.2)', () => {
    it('should create item when all required fields are extracted', async () => {
      mockInvokeClaude.mockResolvedValue(JSON.stringify({
        type: 'create',
        data: {
          name: '스타벅스 아메리카노',
          category: 'gifticon',
          expiryDate: '2025-03-15',
          brand: '스타벅스',
        },
        missingFields: [],
        followUpQuestion: null,
      }));

      mockDocClientSend.mockResolvedValue({} as never);

      const event = createEvent({
        body: JSON.stringify({ message: '스타벅스 아메리카노 기프티콘 등록해줘 만료일 2025-03-15' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.message).toContain('스타벅스 아메리카노');
      expect(body.message).toContain('등록했습니다');
      expect(body.action.type).toBe('create');
      expect(body.items).toHaveLength(1);
      expect(body.items[0].name).toBe('스타벅스 아메리카노');
    });

    it('should ask follow-up question when required fields are missing (Req 7.3)', async () => {
      mockInvokeClaude.mockResolvedValue(JSON.stringify({
        type: 'create',
        data: {
          name: '우유',
          category: null,
          expiryDate: null,
          brand: null,
        },
        missingFields: ['category', 'expiryDate'],
        followUpQuestion: '우유의 카테고리와 만료일을 알려주세요.',
      }));

      const event = createEvent({
        body: JSON.stringify({ message: '우유 등록해줘' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.message).toContain('카테고리');
      expect(body.message).toContain('만료일');
      expect(body.action.type).toBe('create');
    });
  });

  describe('POST /api/chat - list intent (Req 7.4, 7.5)', () => {
    it('should return items when search finds results (Req 7.4)', async () => {
      mockInvokeClaude.mockResolvedValue(JSON.stringify({
        type: 'list',
        data: { category: 'gifticon', keyword: null },
      }));

      mockDocClientSend.mockResolvedValue({
        Items: [
          {
            id: 'item-1',
            name: '스타벅스 쿠폰',
            category: 'gifticon',
            expiryDate: '2025-06-01',
            isArchived: false,
            createdAt: '2025-01-01T00:00:00Z',
          },
          {
            id: 'item-2',
            name: '투썸 기프티콘',
            category: 'gifticon',
            expiryDate: '2025-07-15',
            isArchived: false,
            createdAt: '2025-01-02T00:00:00Z',
          },
        ],
      } as never);

      const event = createEvent({
        body: JSON.stringify({ message: '기프티콘 목록 보여줘' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.items).toHaveLength(2);
      expect(body.action.type).toBe('list');
      expect(body.message).toContain('2개');
    });

    it('should return empty message when no items found (Req 7.5)', async () => {
      mockInvokeClaude.mockResolvedValue(JSON.stringify({
        type: 'list',
        data: { category: 'food', keyword: null },
      }));

      mockDocClientSend.mockResolvedValue({ Items: [] } as never);

      const event = createEvent({
        body: JSON.stringify({ message: '식재료 목록 보여줘' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.items).toHaveLength(0);
      expect(body.message).toContain('없습니다');
    });
  });

  describe('POST /api/chat - delete intent (Req 7.6)', () => {
    it('should delete item when found by name', async () => {
      mockInvokeClaude.mockResolvedValue(JSON.stringify({
        type: 'delete',
        data: { itemName: '스타벅스 쿠폰', itemId: null },
      }));

      // First call: scan to find item
      mockDocClientSend.mockResolvedValueOnce({
        Items: [{
          id: 'item-1',
          name: '스타벅스 쿠폰',
          category: 'gifticon',
          expiryDate: '2025-06-01',
          isArchived: false,
          createdAt: '2025-01-01T00:00:00Z',
        }],
      } as never);

      // Second call: delete item
      mockDocClientSend.mockResolvedValueOnce({} as never);

      const event = createEvent({
        body: JSON.stringify({ message: '스타벅스 쿠폰 삭제해줘' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.message).toContain('삭제했습니다');
      expect(body.action.type).toBe('delete');
    });

    it('should return error when item not found for deletion', async () => {
      mockInvokeClaude.mockResolvedValue(JSON.stringify({
        type: 'delete',
        data: { itemName: '존재하지않는아이템', itemId: null },
      }));

      mockDocClientSend.mockResolvedValue({ Items: [] } as never);

      const event = createEvent({
        body: JSON.stringify({ message: '존재하지않는아이템 삭제해줘' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.message).toContain('찾을 수 없습니다');
    });
  });

  describe('POST /api/chat - unknown intent (Req 7.7)', () => {
    it('should provide example commands when intent is unknown', async () => {
      mockInvokeClaude.mockResolvedValue(JSON.stringify({
        type: 'unknown',
        message: '죄송합니다, 요청을 이해하지 못했습니다. 다음과 같은 명령을 시도해보세요:\n- "스타벅스 기프티콘 등록해줘, 만료일 2025-03-15"\n- "이번 주 만료되는 아이템 보여줘"\n- "스타벅스 쿠폰 삭제해줘"',
      }));

      const event = createEvent({
        body: JSON.stringify({ message: '오늘 날씨 어때?' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.message).toContain('이해하지 못했습니다');
      expect(body.message).toContain('등록');
    });
  });

  describe('POST /api/chat - conversation history', () => {
    it('should pass conversation history to intent parser', async () => {
      mockInvokeClaude.mockResolvedValue(JSON.stringify({
        type: 'create',
        data: {
          name: '우유',
          category: 'food',
          expiryDate: '2025-02-28',
          brand: null,
        },
        missingFields: [],
        followUpQuestion: null,
      }));

      mockDocClientSend.mockResolvedValue({} as never);

      const event = createEvent({
        body: JSON.stringify({
          message: '식재료, 만료일 2월 28일',
          conversationHistory: [
            { role: 'user', content: '우유 등록해줘' },
            { role: 'assistant', content: '카테고리와 만료일을 알려주세요.' },
          ],
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);

      // invokeClaude should be called with conversation history
      expect(mockInvokeClaude).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: '우유 등록해줘' }),
          expect.objectContaining({ role: 'assistant', content: '카테고리와 만료일을 알려주세요.' }),
          expect.objectContaining({ role: 'user', content: '식재료, 만료일 2월 28일' }),
        ])
      );
    });
  });

  describe('POST /api/chat - error handling', () => {
    it('should handle Bedrock API errors gracefully', async () => {
      mockInvokeClaude.mockRejectedValue(new Error('Bedrock API timeout'));

      const event = createEvent({
        body: JSON.stringify({ message: '기프티콘 보여줘' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.error).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed JSON body', async () => {
      const event = createEvent({ body: 'not a json' });

      const result = await handler(event);
      expect(result.statusCode).toBe(500);
    });
  });
});
