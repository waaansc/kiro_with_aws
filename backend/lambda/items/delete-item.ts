import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../shared/dynamodb-client.js';
import { successResponse } from '../shared/response.js';
import { NotFoundError } from '../shared/errors.js';

/**
 * DELETE /api/items/:id 핸들러
 * - ConditionExpression으로 아이템 존재 여부 확인 후 삭제
 * - 존재하지 않는 아이템 삭제 시 NotFoundError throw
 * - 시스템 오류 시 데이터 보존 보장 (삭제 실패 시 re-throw)
 */
export async function deleteItem(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const itemId = extractItemId(event.path);

  if (!itemId) {
    throw new NotFoundError('아이템 ID가 지정되지 않았습니다.');
  }

  const command = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id: itemId },
    ConditionExpression: 'attribute_exists(id)',
  });

  try {
    await docClient.send(command);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      throw new NotFoundError('해당 아이템을 찾을 수 없습니다.');
    }
    // 시스템 오류 시 re-throw → errorHandler가 500 반환, 데이터는 보존됨
    throw error;
  }

  return successResponse({ message: '아이템이 삭제되었습니다.' });
}

/**
 * URL 경로에서 아이템 ID 추출
 * 예: /api/items/abc-123 → abc-123
 */
function extractItemId(path: string): string | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 3 && segments[1] === 'items') {
    return segments[2];
  }
  return null;
}
