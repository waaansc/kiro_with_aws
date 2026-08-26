import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLE_NAME } from '../shared/dynamodb-client.js';
import { successResponse } from '../shared/response.js';
import { ValidationError } from '../shared/errors.js';
import { validateCreateItem } from './validator.js';
import { uploadImage } from './s3-upload.js';
import type { CreateItemRequest, CreateItemResponse } from '../shared/types.js';

/**
 * 아이템 생성 핸들러 (POST /api/items)
 * - 요청 바디 파싱 및 유효성 검증
 * - UUID v4 생성, createdAt 타임스탬프 설정
 * - 이미지가 포함된 경우 S3 업로드 (실패 시에도 아이템 생성 허용)
 * - DynamoDB PutItem 실행
 * - 201 Created 응답 반환
 */
export async function createItem(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // 요청 바디 파싱
  const body = event.body ? JSON.parse(event.body) : {};
  const request = body as Partial<CreateItemRequest>;

  // 유효성 검증
  const validation = validateCreateItem(request);
  if (!validation.valid) {
    throw new ValidationError('유효성 검증 실패', validation.errors);
  }

  // UUID 및 타임스탬프 생성
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  // 이미지 업로드 (선택적)
  let imageUrl: string | undefined;
  if (request.imageBase64 && request.imageContentType) {
    const uploadResult = await uploadImage(id, request.imageBase64, request.imageContentType);
    if (uploadResult.success) {
      imageUrl = uploadResult.imageUrl;
    } else {
      // 이미지 업로드 실패 시 로깅만 하고 아이템 생성은 계속 진행
      console.warn('Image upload failed:', uploadResult.error);
    }
  }

  // DynamoDB에 아이템 저장
  const item = {
    id,
    name: request.name!.trim(),
    category: request.category!,
    subcategory: request.subcategory,
    expiryDate: request.expiryDate!,
    brand: request.brand,
    memo: request.memo,
    imageUrl,
    createdAt,
    isArchived: false,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  // 응답 구성
  const response: CreateItemResponse = {
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
  };

  return successResponse(response, 201);
}
