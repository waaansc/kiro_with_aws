import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../shared/dynamodb-client.js';
import { successResponse } from '../shared/response.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';
import type { UpdateItemRequest, Category } from '../shared/types.js';

const VALID_CATEGORIES: Category[] = ['gifticon', 'food', 'subscription', 'other'];
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PUT /api/items/:id 핸들러
 * - URL 경로에서 아이템 ID 추출
 * - 요청 바디를 UpdateItemRequest로 파싱
 * - 필수 항목 null/빈값 거부
 * - 변경 필드 유효성 검증
 * - 만료일 과거 날짜 시 경고 포함하되 저장 허용
 * - DynamoDB UpdateExpression으로 부분 업데이트
 * - ConditionExpression으로 아이템 존재 여부 확인
 */
export async function updateItem(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const itemId = extractItemId(event.path);

  if (!itemId) {
    throw new NotFoundError('아이템 ID가 지정되지 않았습니다.');
  }

  // 요청 바디 파싱
  const body = event.body ? JSON.parse(event.body) : {};
  const request = body as UpdateItemRequest;

  // 유효성 검증
  const validation = validateUpdateItem(request);
  if (!validation.valid) {
    throw new ValidationError('유효성 검증 실패', validation.errors);
  }

  // 업데이트할 필드가 있는지 확인
  const updatableFields = buildUpdatableFields(request);
  if (Object.keys(updatableFields).length === 0) {
    throw new ValidationError('수정할 필드가 없습니다.', ['최소 하나의 필드를 포함해야 합니다.']);
  }

  // DynamoDB UpdateExpression 동적 생성
  const { updateExpression, expressionAttributeNames, expressionAttributeValues } =
    buildUpdateExpression(updatableFields);

  try {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: itemId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);
    const updatedItem = result.Attributes;

    // 만료일 과거 날짜 경고 확인
    const warning = checkExpiryDateWarning(request.expiryDate);

    const response: Record<string, unknown> = {
      ...updatedItem,
      message: '아이템이 성공적으로 수정되었습니다.',
    };

    if (warning) {
      response.warning = warning;
    }

    return successResponse(response);
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
 * 예: /api/items/abc-123 → abc-123
 */
function extractItemId(path: string): string | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 3 && segments[1] === 'items') {
    return segments[2];
  }
  return null;
}

/**
 * 수정 요청 유효성 검증
 * - 필수 항목(name, category, expiryDate)이 명시적으로 null/빈값이면 거부
 * - 제공된 필드만 개별 검증
 */
export function validateUpdateItem(data: UpdateItemRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 필수 항목이 명시적으로 null 또는 빈 문자열로 설정된 경우 거부
  if ('name' in data) {
    if (data.name === null || data.name === undefined) {
      errors.push('이름은 필수 항목이며 null로 설정할 수 없습니다.');
    } else if (typeof data.name === 'string' && data.name.trim().length === 0) {
      errors.push('이름은 필수 항목이며 빈 값으로 설정할 수 없습니다.');
    } else if (typeof data.name === 'string' && data.name.trim().length > 50) {
      errors.push('이름은 50자 이하여야 합니다.');
    }
  }

  if ('category' in data) {
    if (data.category === null || data.category === undefined) {
      errors.push('카테고리는 필수 항목이며 null로 설정할 수 없습니다.');
    } else if (!VALID_CATEGORIES.includes(data.category as Category)) {
      errors.push('유효하지 않은 카테고리입니다.');
    }
  }

  if ('expiryDate' in data) {
    if (data.expiryDate === null || data.expiryDate === undefined) {
      errors.push('만료일은 필수 항목이며 null로 설정할 수 없습니다.');
    } else if (typeof data.expiryDate === 'string' && data.expiryDate.trim().length === 0) {
      errors.push('만료일은 필수 항목이며 빈 값으로 설정할 수 없습니다.');
    } else if (typeof data.expiryDate === 'string' && !ISO_DATE_REGEX.test(data.expiryDate)) {
      errors.push('만료일은 YYYY-MM-DD 형식이어야 합니다.');
    } else if (typeof data.expiryDate === 'string' && ISO_DATE_REGEX.test(data.expiryDate)) {
      const date = new Date(data.expiryDate);
      if (isNaN(date.getTime())) {
        errors.push('유효하지 않은 날짜입니다.');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 업데이트 가능한 필드 추출 (undefined가 아닌 필드만)
 */
function buildUpdatableFields(request: UpdateItemRequest): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (request.name !== undefined && request.name !== null) {
    fields.name = (request.name as string).trim();
  }
  if (request.category !== undefined && request.category !== null) {
    fields.category = request.category;
  }
  if (request.subcategory !== undefined) {
    fields.subcategory = request.subcategory;
  }
  if (request.expiryDate !== undefined && request.expiryDate !== null) {
    fields.expiryDate = request.expiryDate;
  }
  if (request.brand !== undefined) {
    fields.brand = request.brand;
  }
  if (request.memo !== undefined) {
    fields.memo = request.memo;
  }

  return fields;
}

/**
 * DynamoDB UpdateExpression 동적 생성
 */
function buildUpdateExpression(fields: Record<string, unknown>): {
  updateExpression: string;
  expressionAttributeNames: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
} {
  const setExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(fields).forEach(([key, value]) => {
    const nameKey = `#${key}`;
    const valueKey = `:${key}`;
    setExpressions.push(`${nameKey} = ${valueKey}`);
    expressionAttributeNames[nameKey] = key;
    expressionAttributeValues[valueKey] = value;
  });

  return {
    updateExpression: `SET ${setExpressions.join(', ')}`,
    expressionAttributeNames,
    expressionAttributeValues,
  };
}

/**
 * 만료일이 과거인 경우 경고 메시지 반환
 */
function checkExpiryDateWarning(expiryDate: string | undefined): string | null {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const today = new Date();
  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (expiry.getTime() < today.getTime()) {
    return '만료일이 과거 날짜입니다. 저장은 허용되었습니다.';
  }

  return null;
}
