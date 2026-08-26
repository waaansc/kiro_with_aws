import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../shared/dynamodb-client.js';
import { successResponse } from '../shared/response.js';
import { NotFoundError } from '../shared/errors.js';
import { calculateDday } from './get-items.js';
import type { Item, GetItemDetailResponse } from '../shared/types.js';

/**
 * GET /api/items/:id 핸들러
 * - 아이템 ID로 전체 필드 반환
 * - D-day 계산 포함
 * - 존재하지 않는 ID 시 NotFoundError throw
 */
export async function getItemDetail(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const itemId = extractItemId(event.path);

  if (!itemId) {
    throw new NotFoundError('아이템 ID가 지정되지 않았습니다.');
  }

  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: itemId },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    throw new NotFoundError(`아이템을 찾을 수 없습니다: ${itemId}`);
  }

  const item = result.Item as Item;
  const dday = calculateDday(item.expiryDate);

  const response: GetItemDetailResponse = {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    expiryDate: item.expiryDate,
    brand: item.brand,
    memo: item.memo,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    isArchived: item.isArchived,
    dday,
  };

  return successResponse(response);
}

/**
 * URL 경로에서 아이템 ID 추출
 * 예: /api/items/abc-123 → abc-123
 */
function extractItemId(path: string): string | null {
  const segments = path.split('/').filter(Boolean);
  // /api/items/:id → segments = ['api', 'items', ':id']
  if (segments.length >= 3 && segments[1] === 'items') {
    return segments[2];
  }
  return null;
}
