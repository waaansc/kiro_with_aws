import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../shared/response.js';
import { errorHandler } from '../shared/error-handler.js';
import { createItem } from './create-item.js';
import { getItems } from './get-items.js';
import { getItemDetail } from './get-item-detail.js';
import { deleteItem } from './delete-item.js';
import { updateItem } from './update-item.js';
import { archiveExpired, restoreItem } from './archive-item.js';

/**
 * Items CRUD Lambda 핸들러
 * POST /api/items - 아이템 생성
 * POST /api/items/archive-expired - 만료 아이템 일괄 아카이브
 * GET /api/items - 아이템 목록 조회
 * GET /api/items/:id - 아이템 상세 조회
 * PUT /api/items/:id - 아이템 수정
 * DELETE /api/items/:id - 아이템 삭제
 * PATCH /api/items/:id/restore - 아이템 복원
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod } = event;

  return errorHandler(async () => {
    switch (httpMethod) {
      case 'POST':
        return handlePost(event);
      case 'GET':
        return handleGet(event);
      case 'PUT':
        return updateItem(event);
      case 'DELETE':
        return deleteItem(event);
      case 'PATCH':
        return handlePatch(event);
      case 'OPTIONS':
        return successResponse({});
      default:
        return errorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${httpMethod} not allowed`);
    }
  });
}

/**
 * POST 요청 라우팅
 * - /api/items/archive-expired → 만료 아이템 일괄 아카이브
 * - /api/items → 아이템 생성
 */
function handlePost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.path.endsWith('/archive-expired')) {
    return archiveExpired();
  }
  return createItem(event);
}

/**
 * GET 요청 라우팅
 * - /api/items → 목록 조회
 * - /api/items/:id → 상세 조회
 */
function handleGet(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (hasItemId(event.path)) {
    return getItemDetail(event);
  }
  return getItems(event);
}

/**
 * PATCH 요청 라우팅
 * - /api/items/:id/restore → 아이템 복원
 */
function handlePatch(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.path.endsWith('/restore')) {
    return restoreItem(event);
  }
  return Promise.resolve(errorResponse(400, 'BAD_REQUEST', '지원하지 않는 PATCH 경로입니다.'));
}

/**
 * 경로에 아이템 ID가 포함되어 있는지 확인
 * /api/items → false
 * /api/items/ → false
 * /api/items/some-id → true
 */
function hasItemId(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  // segments: ['api', 'items'] or ['api', 'items', 'id']
  return segments.length >= 3 && segments[1] === 'items' && segments[2] !== '';
}
