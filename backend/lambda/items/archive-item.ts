import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../shared/dynamodb-client.js';
import { successResponse } from '../shared/response.js';
import { NotFoundError } from '../shared/errors.js';
import type { Item } from '../shared/types.js';

/**
 * POST /api/items/archive-expired 핸들러
 * 만료일이 현재 날짜 이전인 아이템을 일괄 아카이브 (isArchived=true)
 */
export async function archiveExpired(): Promise<APIGatewayProxyResult> {
  // isArchived=false인 모든 아이템 스캔
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'isArchived = :archived',
    ExpressionAttributeValues: {
      ':archived': false,
    },
  });

  const result = await docClient.send(scanCommand);
  const items = (result.Items ?? []) as Item[];

  // 만료일이 오늘 이전인 아이템 필터링
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredItems = items.filter((item) => {
    const expiryDate = new Date(item.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate < today;
  });

  // 각 만료 아이템을 아카이브 처리
  let archivedCount = 0;
  for (const item of expiredItems) {
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: item.id },
      UpdateExpression: 'SET isArchived = :archived',
      ExpressionAttributeValues: {
        ':archived': true,
      },
    });

    await docClient.send(updateCommand);
    archivedCount++;
  }

  return successResponse({
    message: `${archivedCount}개의 만료된 아이템이 아카이브되었습니다.`,
    archivedCount,
  });
}

/**
 * PATCH /api/items/:id/restore 핸들러
 * 아카이브된 아이템을 활성 목록으로 복원 (isArchived=false)
 */
export async function restoreItem(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const itemId = extractItemId(event.path);

  if (!itemId) {
    throw new NotFoundError('아이템 ID가 지정되지 않았습니다.');
  }

  const updateCommand = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: itemId },
    UpdateExpression: 'SET isArchived = :archived',
    ConditionExpression: 'attribute_exists(id)',
    ExpressionAttributeValues: {
      ':archived': false,
    },
    ReturnValues: 'ALL_NEW',
  });

  try {
    const result = await docClient.send(updateCommand);
    const restoredItem = result.Attributes as Item;

    return successResponse({
      message: '아이템이 복원되었습니다.',
      item: restoredItem,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      throw new NotFoundError(`아이템을 찾을 수 없습니다: ${itemId}`);
    }
    throw error;
  }
}

/**
 * URL 경로에서 아이템 ID 추출
 * 예: /api/items/abc-123/restore → abc-123
 */
function extractItemId(path: string): string | null {
  const segments = path.split('/').filter(Boolean);
  // /api/items/:id/restore → segments = ['api', 'items', ':id', 'restore']
  if (segments.length >= 4 && segments[1] === 'items' && segments[3] === 'restore') {
    return segments[2];
  }
  return null;
}
