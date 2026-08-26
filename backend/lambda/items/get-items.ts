import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../shared/dynamodb-client.js';
import { successResponse } from '../shared/response.js';
import type { Item, ItemSummary, Category, GetItemsResponse } from '../shared/types.js';

/**
 * D-day 계산: 만료일과 오늘 날짜의 차이를 일수로 반환
 * - 양수: 남은 일수
 * - 0: 오늘 만료
 * - 음수: 만료 후 경과 일수
 */
export function calculateDday(expiryDate: string, today?: string): number {
  const expiry = new Date(expiryDate);
  const now = today ? new Date(today) : new Date();
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Item을 ItemSummary로 변환 (D-day 계산 포함)
 */
function toItemSummary(item: Item): ItemSummary {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    expiryDate: item.expiryDate,
    dday: calculateDday(item.expiryDate),
    brand: item.brand,
    imageUrl: item.imageUrl,
  };
}

/**
 * 아이템 목록을 만료일 가까운 순으로 정렬
 * - 비만료 아이템(dday >= 0)이 만료 아이템(dday < 0)보다 앞
 * - 각 그룹 내에서 dday 오름차순
 */
function sortByExpiry(items: ItemSummary[]): ItemSummary[] {
  return [...items].sort((a, b) => {
    if (a.dday >= 0 && b.dday < 0) return -1;
    if (a.dday < 0 && b.dday >= 0) return 1;
    return a.dday - b.dday;
  });
}

/**
 * GET /api/items 핸들러
 * - Query params: category (optional), archived (optional, default "false")
 * - 카테고리 필터 시 GSI(category-expiryDate-index) 사용
 * - 결과 없을 시 빈 배열 반환
 */
export async function getItems(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const queryParams = event.queryStringParameters ?? {};
  const category = queryParams.category as Category | undefined;
  const archived = queryParams.archived === 'true';

  let items: Item[];

  if (category) {
    // GSI를 활용한 카테고리별 조회
    items = await queryByCategory(category, archived);
  } else {
    // 전체 아이템 스캔 (isArchived 필터 적용)
    items = await scanByArchiveStatus(archived);
  }

  const summaries = items.map(toItemSummary);
  const sorted = sortByExpiry(summaries);

  const response: GetItemsResponse = {
    items: sorted,
    count: sorted.length,
  };

  return successResponse(response);
}

/**
 * GSI(category-expiryDate-index)를 활용한 카테고리별 조회
 */
async function queryByCategory(category: Category, archived: boolean): Promise<Item[]> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'category-expiryDate-index',
    KeyConditionExpression: 'category = :category',
    FilterExpression: 'isArchived = :archived',
    ExpressionAttributeValues: {
      ':category': category,
      ':archived': archived,
    },
  });

  const result = await docClient.send(command);
  return (result.Items ?? []) as Item[];
}

/**
 * 아카이브 상태 기준 전체 스캔
 */
async function scanByArchiveStatus(archived: boolean): Promise<Item[]> {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'isArchived = :archived',
    ExpressionAttributeValues: {
      ':archived': archived,
    },
  });

  const result = await docClient.send(command);
  return (result.Items ?? []) as Item[];
}
