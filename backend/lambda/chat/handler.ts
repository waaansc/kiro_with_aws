import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../shared/response.js';
import { errorHandler } from '../shared/error-handler.js';
import { ValidationError } from '../shared/errors.js';
import { parseIntent } from './intent-parser.js';
import { createItemFromChat, searchItems, deleteItemByName } from './item-service.js';
import type { ChatRequest, ChatResponse, ChatMessage, ItemSummary } from '../shared/types.js';

/**
 * Chat Lambda 핸들러
 * POST /api/chat - 자연어 채팅 메시지 처리
 * AWS Bedrock Claude 모델을 호출하여 사용자 의도를 분석한다.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod } = event;

  return errorHandler(async () => {
    switch (httpMethod) {
      case 'POST':
        return await handleChat(event);
      case 'OPTIONS':
        return successResponse({});
      default:
        return errorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${httpMethod} not allowed`);
    }
  });
}

/**
 * 채팅 메시지 처리
 * - 요청 바디 파싱 (message, conversationHistory)
 * - 의도 분석
 * - 의도에 따라 적절한 액션 수행
 * - ChatResponse 반환
 */
async function handleChat(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // 요청 바디 파싱
  if (!event.body) {
    throw new ValidationError('요청 본문이 비어있습니다.', ['message 필드는 필수입니다.']);
  }

  const body = JSON.parse(event.body) as Partial<ChatRequest>;

  if (!body.message || body.message.trim().length === 0) {
    throw new ValidationError('메시지가 비어있습니다.', ['message 필드는 필수입니다.']);
  }

  const message = body.message.trim();
  const conversationHistory: ChatMessage[] = body.conversationHistory ?? [];

  // 의도 분석 (Req 7.1)
  const intent = await parseIntent(message, conversationHistory);

  // 의도에 따라 라우팅
  let response: ChatResponse;

  switch (intent.type) {
    case 'create':
      response = await handleCreateIntent(intent);
      break;
    case 'list':
      response = await handleListIntent(intent);
      break;
    case 'delete':
      response = await handleDeleteIntent(intent);
      break;
    case 'unknown':
    default:
      response = handleUnknownIntent(intent);
      break;
  }

  return successResponse(response);
}

/**
 * 등록 의도 처리 (Req 7.2, 7.3)
 * - 필수 정보가 모두 있으면 아이템 생성
 * - 누락된 정보가 있으면 후속 질문 반환
 */
async function handleCreateIntent(
  intent: Extract<Awaited<ReturnType<typeof parseIntent>>, { type: 'create' }>
): Promise<ChatResponse> {
  const { data, missingFields, followUpQuestion } = intent;

  // 필수 정보 누락 시 후속 질문 (Req 7.3)
  if (missingFields.length > 0) {
    const fieldNameMap: Record<string, string> = {
      name: '아이템 이름',
      category: '카테고리 (기프티콘/식재료/정기결제/기타)',
      expiryDate: '만료일',
    };

    const missingFieldNames = missingFields
      .map((f) => fieldNameMap[f] ?? f)
      .join(', ');

    return {
      message: followUpQuestion ??
        `아이템 등록을 위해 다음 정보가 필요합니다: ${missingFieldNames}`,
      action: { type: 'create', data: data },
    };
  }

  // 아이템 생성 수행 (Req 7.2)
  const result = await createItemFromChat({
    name: data.name!,
    category: data.category!,
    expiryDate: data.expiryDate!,
    brand: data.brand,
  });

  if (!result.success) {
    return {
      message: `아이템 등록에 실패했습니다: ${result.error}`,
    };
  }

  return {
    message: `"${result.item!.name}" 아이템을 등록했습니다! (만료일: ${result.item!.expiryDate}, D-${result.item!.dday >= 0 ? result.item!.dday : `+${Math.abs(result.item!.dday)}`})`,
    action: { type: 'create', data: result.item },
    items: [result.item!],
  };
}

/**
 * 조회 의도 처리 (Req 7.4, 7.5)
 * - 조건에 맞는 아이템 최대 10개 반환
 * - 결과가 0건이면 안내 메시지
 */
async function handleListIntent(
  intent: Extract<Awaited<ReturnType<typeof parseIntent>>, { type: 'list' }>
): Promise<ChatResponse> {
  const { data } = intent;

  const result = await searchItems({
    category: data.category,
    keyword: data.keyword,
  });

  // 결과 0건 (Req 7.5)
  if (result.count === 0) {
    const filterDesc = data.category
      ? `${data.category} 카테고리의 `
      : data.keyword
        ? `"${data.keyword}" 관련 `
        : '';
    return {
      message: `${filterDesc}등록된 아이템이 없습니다.`,
      action: { type: 'list' },
      items: [],
    };
  }

  // 결과 반환 (Req 7.4)
  const itemList = result.items
    .map((item: ItemSummary) => {
      const ddayStr = item.dday >= 0 ? `D-${item.dday}` : `D+${Math.abs(item.dday)}`;
      return `• ${item.name} (${ddayStr}, ${item.expiryDate})`;
    })
    .join('\n');

  return {
    message: `총 ${result.count}개의 아이템을 찾았습니다:\n${itemList}`,
    action: { type: 'list' },
    items: result.items,
  };
}

/**
 * 삭제 의도 처리 (Req 7.6)
 * - 대상 아이템 확인 후 삭제 수행
 */
async function handleDeleteIntent(
  intent: Extract<Awaited<ReturnType<typeof parseIntent>>, { type: 'delete' }>
): Promise<ChatResponse> {
  const { data } = intent;

  if (!data.itemName && !data.itemId) {
    return {
      message: '삭제할 아이템의 이름을 알려주세요.',
      action: { type: 'delete' },
    };
  }

  const targetName = data.itemName ?? data.itemId!;
  const result = await deleteItemByName(targetName);

  if (!result.success) {
    return {
      message: result.error ?? '아이템 삭제에 실패했습니다.',
      action: { type: 'delete' },
    };
  }

  return {
    message: `"${result.deletedItem!.name}" 아이템을 삭제했습니다.`,
    action: { type: 'delete', data: result.deletedItem },
  };
}

/**
 * 의도 불명 처리 (Req 7.7)
 * - 이해 불가 안내 + 명령 예시 제공
 */
function handleUnknownIntent(
  intent: Extract<Awaited<ReturnType<typeof parseIntent>>, { type: 'unknown' }>
): ChatResponse {
  return {
    message: intent.message,
  };
}
