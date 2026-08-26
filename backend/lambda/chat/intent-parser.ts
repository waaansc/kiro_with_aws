import { invokeClaude, type BedrockMessage } from './bedrock-client.js';
import type { Category, ChatMessage } from '../shared/types.js';

/**
 * 사용자 의도 분류 결과 타입
 */
export type IntentType = 'create' | 'list' | 'delete' | 'unknown';

export interface CreateIntent {
  type: 'create';
  data: {
    name?: string;
    category?: Category;
    expiryDate?: string;
    brand?: string;
  };
  missingFields: string[];
  followUpQuestion?: string;
}

export interface ListIntent {
  type: 'list';
  data: {
    category?: Category;
    keyword?: string;
  };
}

export interface DeleteIntent {
  type: 'delete';
  data: {
    itemName?: string;
    itemId?: string;
  };
}

export interface UnknownIntent {
  type: 'unknown';
  message: string;
}

export type ParsedIntent = CreateIntent | ListIntent | DeleteIntent | UnknownIntent;

/**
 * 의도 분석용 시스템 프롬프트
 */
const INTENT_SYSTEM_PROMPT = `당신은 만료일 관리 대시보드의 AI 어시스턴트입니다.
사용자 메시지를 분석하여 의도를 파악하고, JSON 형식으로 응답하세요.

의도 분류:
- "create": 아이템 등록 (예: "스타벅스 기프티콘 등록해줘", "우유 냉장고에 넣었어 유통기한 12월 25일")
- "list": 아이템 조회 (예: "기프티콘 목록 보여줘", "이번 주 만료되는 거 뭐 있어?")
- "delete": 아이템 삭제 (예: "스타벅스 쿠폰 삭제해줘", "다 사용했어 지워줘")
- "unknown": 위 어디에도 해당하지 않는 경우

반드시 아래 JSON 형식으로만 응답하세요:

등록 의도:
{
  "type": "create",
  "data": {
    "name": "추출된 아이템명 또는 null",
    "category": "gifticon|food|subscription|other 또는 null",
    "expiryDate": "YYYY-MM-DD 형식 또는 null",
    "brand": "브랜드명 또는 null"
  },
  "missingFields": ["누락된 필수 필드명"],
  "followUpQuestion": "누락된 정보를 묻는 질문 (필수 정보가 모두 있으면 null)"
}

조회 의도:
{
  "type": "list",
  "data": {
    "category": "gifticon|food|subscription|other 또는 null",
    "keyword": "검색 키워드 또는 null"
  }
}

삭제 의도:
{
  "type": "delete",
  "data": {
    "itemName": "삭제 대상 아이템명 또는 null",
    "itemId": "아이템 ID 또는 null"
  }
}

알 수 없음:
{
  "type": "unknown",
  "message": "이해하지 못했음을 안내하는 메시지 + 가능한 명령 예시"
}

오늘 날짜 정보: ${new Date().toISOString().split('T')[0]}
"다음 주 금요일", "내일", "이번 달 말" 등 상대적 날짜는 오늘 기준으로 계산하여 YYYY-MM-DD로 변환하세요.`;

/**
 * 사용자 메시지의 의도를 분석한다
 * @param message - 사용자 메시지
 * @param conversationHistory - 이전 대화 히스토리
 * @returns 분석된 의도 결과
 */
export async function parseIntent(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<ParsedIntent> {
  // 대화 히스토리를 Bedrock 메시지 형식으로 변환
  const messages: BedrockMessage[] = [];

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory.slice(-10)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // 현재 사용자 메시지 추가
  messages.push({
    role: 'user',
    content: message,
  });

  const response = await invokeClaude(INTENT_SYSTEM_PROMPT, messages);

  // JSON 응답 파싱
  try {
    const parsed = extractJson(response);
    return validateAndNormalize(parsed);
  } catch {
    // 파싱 실패 시 unknown 반환
    return {
      type: 'unknown',
      message: '죄송합니다, 요청을 이해하지 못했습니다. 다음과 같은 명령을 시도해보세요:\n- "스타벅스 기프티콘 등록해줘, 만료일 2025-03-15"\n- "이번 주 만료되는 아이템 보여줘"\n- "스타벅스 쿠폰 삭제해줘"',
    };
  }
}

/**
 * 응답에서 JSON 부분 추출
 */
function extractJson(response: string): unknown {
  // JSON 블록이 코드 블록으로 감싸져 있을 수 있음
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  // 중괄호로 시작하는 JSON 직접 추출
  const braceMatch = response.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    return JSON.parse(braceMatch[0]);
  }

  throw new Error('No JSON found in response');
}

/**
 * 파싱된 결과 유효성 검증 및 정규화
 */
function validateAndNormalize(parsed: unknown): ParsedIntent {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid parsed result');
  }

  const obj = parsed as Record<string, unknown>;
  const type = obj.type as string;

  switch (type) {
    case 'create': {
      const data = (obj.data ?? {}) as Record<string, unknown>;
      const missingFields: string[] = [];

      if (!data.name) missingFields.push('name');
      if (!data.category) missingFields.push('category');
      if (!data.expiryDate) missingFields.push('expiryDate');

      return {
        type: 'create',
        data: {
          name: data.name as string | undefined,
          category: data.category as Category | undefined,
          expiryDate: data.expiryDate as string | undefined,
          brand: data.brand as string | undefined,
        },
        missingFields,
        followUpQuestion: (obj.followUpQuestion as string) ?? undefined,
      };
    }

    case 'list': {
      const data = (obj.data ?? {}) as Record<string, unknown>;
      return {
        type: 'list',
        data: {
          category: data.category as Category | undefined,
          keyword: data.keyword as string | undefined,
        },
      };
    }

    case 'delete': {
      const data = (obj.data ?? {}) as Record<string, unknown>;
      return {
        type: 'delete',
        data: {
          itemName: data.itemName as string | undefined,
          itemId: data.itemId as string | undefined,
        },
      };
    }

    default:
      return {
        type: 'unknown',
        message: (obj.message as string) ??
          '죄송합니다, 요청을 이해하지 못했습니다. 다음과 같은 명령을 시도해보세요:\n- "스타벅스 기프티콘 등록해줘, 만료일 2025-03-15"\n- "이번 주 만료되는 아이템 보여줘"\n- "스타벅스 쿠폰 삭제해줘"',
      };
  }
}
