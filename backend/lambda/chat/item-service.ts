import { PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLE_NAME } from '../shared/dynamodb-client.js';
import type { Item, ItemSummary, Category } from '../shared/types.js';

/**
 * 채팅에서 사용하는 아이템 서비스
 * - 아이템 생성, 검색, 삭제 기능 제공
 */

/**
 * D-day 계산
 */
function calculateDday(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Item을 ItemSummary로 변환
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

export interface CreateItemFromChatParams {
  name: string;
  category: Category;
  expiryDate: string;
  brand?: string;
}

export interface CreateItemResult {
  success: boolean;
  item?: ItemSummary;
  error?: string;
}

/**
 * 채팅에서 아이템 생성
 * @param params - 아이템 생성에 필요한 정보
 * @returns 생성 결과
 */
export async function createItemFromChat(params: CreateItemFromChatParams): Promise<CreateItemResult> {
  const { name, category, expiryDate, brand } = params;

  // 기본 유효성 검증
  if (!name || name.trim().length === 0 || name.trim().length > 50) {
    return { success: false, error: '아이템 이름은 1~50자여야 합니다.' };
  }

  const validCategories: Category[] = ['gifticon', 'food', 'subscription', 'other'];
  if (!validCategories.includes(category)) {
    return { success: false, error: '유효하지 않은 카테고리입니다.' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(expiryDate)) {
    return { success: false, error: '만료일은 YYYY-MM-DD 형식이어야 합니다.' };
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const item: Item = {
    id,
    name: name.trim(),
    category,
    expiryDate,
    brand,
    createdAt,
    isArchived: false,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return {
    success: true,
    item: toItemSummary(item),
  };
}

export interface SearchItemsResult {
  items: ItemSummary[];
  count: number;
}

/**
 * 아이템 검색 (최대 10개)
 * @param query - 검색 조건 (카테고리, 키워드)
 * @returns 검색 결과
 */
export async function searchItems(query: {
  category?: Category;
  keyword?: string;
}): Promise<SearchItemsResult> {
  const { category, keyword } = query;

  // DynamoDB 스캔 (아카이브되지 않은 아이템)
  let filterExpression = 'isArchived = :archived';
  const expressionAttributeValues: Record<string, unknown> = {
    ':archived': false,
  };

  if (category) {
    filterExpression += ' AND category = :category';
    expressionAttributeValues[':category'] = category;
  }

  if (keyword) {
    filterExpression += ' AND contains(#itemName, :keyword)';
    expressionAttributeValues[':keyword'] = keyword;
  }

  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(keyword && {
      ExpressionAttributeNames: { '#itemName': 'name' },
    }),
  });

  const result = await docClient.send(command);
  const items = (result.Items ?? []) as Item[];

  // D-day 기준 정렬 후 최대 10개 반환
  const summaries = items
    .map(toItemSummary)
    .sort((a, b) => a.dday - b.dday)
    .slice(0, 10);

  return {
    items: summaries,
    count: summaries.length,
  };
}

export interface DeleteItemResult {
  success: boolean;
  deletedItem?: ItemSummary;
  error?: string;
}

/**
 * 아이템 이름으로 검색 후 삭제
 * @param name - 삭제 대상 아이템 이름
 * @returns 삭제 결과
 */
export async function deleteItemByName(name: string): Promise<DeleteItemResult> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: '삭제할 아이템 이름을 지정해주세요.' };
  }

  // 이름으로 아이템 검색
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'contains(#itemName, :name) AND isArchived = :archived',
    ExpressionAttributeNames: { '#itemName': 'name' },
    ExpressionAttributeValues: {
      ':name': name.trim(),
      ':archived': false,
    },
  });

  const result = await docClient.send(command);
  const items = (result.Items ?? []) as Item[];

  if (items.length === 0) {
    return { success: false, error: `"${name}" 아이템을 찾을 수 없습니다.` };
  }

  // 첫 번째 매칭 아이템 삭제
  const targetItem = items[0];

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id: targetItem.id },
      ConditionExpression: 'attribute_exists(id)',
    })
  );

  return {
    success: true,
    deletedItem: toItemSummary(targetItem),
  };
}
