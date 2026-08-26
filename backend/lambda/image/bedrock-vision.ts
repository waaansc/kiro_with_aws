import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * AWS Bedrock GPT-5.6 Terra Vision API 호출
 * 이미지를 분석하여 유형 분류 및 데이터 추출을 수행한다.
 * Converse API를 사용하여 이미지를 전송한다.
 */

export interface BedrockVisionResult {
  imageType: 'gifticon' | 'food_label' | 'subscription' | 'unknown';
  extractedData: {
    name?: string;
    brand?: string;
    expiryDate?: string;
    category?: string;
    subcategory?: string;
    serviceName?: string;
    paymentDate?: string;
  };
  rawResponse: string;
}

const ANALYSIS_PROMPT = `당신은 이미지 분석 전문가입니다. 첨부된 이미지를 분석하여 다음 작업을 수행해주세요:

1. 이미지 유형을 분류해주세요:
   - "gifticon": 기프티콘, 쿠폰, 상품권 이미지
   - "food_label": 식재료, 식품 라벨, 유통기한이 있는 제품
   - "subscription": 정기결제, 구독 서비스 스크린샷
   - "unknown": 위 세 가지에 해당하지 않는 이미지

2. 이미지 유형에 따라 관련 정보를 추출해주세요:
   - 기프티콘: brand(브랜드명), name(상품명), expiryDate(만료일, YYYY-MM-DD 형식)
   - 식재료 라벨: name(제품명), expiryDate(소비기한/유통기한, YYYY-MM-DD 형식)
   - 정기결제: serviceName(서비스명), paymentDate(결제일, YYYY-MM-DD 형식), name(구독 이름)

3. 반드시 아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "imageType": "gifticon" | "food_label" | "subscription" | "unknown",
  "brand": "추출된 브랜드명 또는 null",
  "name": "추출된 상품명/제품명/서비스명 또는 null",
  "expiryDate": "YYYY-MM-DD 형식의 날짜 또는 null",
  "serviceName": "서비스명 또는 null",
  "paymentDate": "YYYY-MM-DD 형식의 결제일 또는 null"
}

추출할 수 없는 필드는 null로 설정해주세요.`;

let bedrockClient: BedrockRuntimeClient | null = null;

/**
 * Bedrock 클라이언트를 가져온다. (Lambda cold start 최적화를 위해 재사용)
 */
export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'ap-northeast-2',
    });
  }
  return bedrockClient;
}

/**
 * 테스트용 클라이언트 주입
 */
export function setBedrockClient(client: BedrockRuntimeClient): void {
  bedrockClient = client;
}

/**
 * 테스트용 클라이언트 초기화
 */
export function resetBedrockClient(): void {
  bedrockClient = null;
}

/**
 * Bedrock GPT-5.6 Terra Vision으로 이미지를 분석한다.
 * Converse API를 사용하여 이미지와 텍스트를 함께 전송.
 *
 * @param imageBase64 - Base64 인코딩된 이미지 데이터 (prefix 없음)
 * @param contentType - 이미지 MIME 타입
 * @returns BedrockVisionResult - 분류 결과 및 추출 데이터
 */
export async function analyzeImageWithBedrock(
  imageBase64: string,
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<BedrockVisionResult> {
  const client = getBedrockClient();

  // data:image/... prefix가 있으면 제거
  const rawBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  // Base64를 Uint8Array로 변환
  const imageBytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));

  // MIME 타입을 Converse API format에 맞게 매핑
  const formatMap: Record<string, 'jpeg' | 'png' | 'webp'> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const format = formatMap[contentType] ?? 'jpeg';

  const modelId = process.env.BEDROCK_MODEL_ID || 'us.openai.gpt-5.6-terra';

  const command = new ConverseCommand({
    modelId,
    messages: [
      {
        role: 'user',
        content: [
          {
            image: {
              format,
              source: {
                bytes: imageBytes,
              },
            },
          },
          {
            text: ANALYSIS_PROMPT,
          },
        ],
      },
    ],
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.3,
    },
  });

  const response = await client.send(command);

  // Converse API 응답에서 텍스트 추출
  const outputMessage = response.output?.message;
  let rawText = '';

  if (outputMessage?.content && outputMessage.content.length > 0) {
    const textBlock = outputMessage.content.find((block) => 'text' in block);
    if (textBlock && 'text' in textBlock) {
      rawText = textBlock.text as string;
    }
  }

  // JSON 파싱 시도
  const parsed = parseBedrockResponse(rawText);

  return {
    imageType: parsed.imageType,
    extractedData: {
      name: parsed.name || undefined,
      brand: parsed.brand || undefined,
      expiryDate: parsed.expiryDate || undefined,
      serviceName: parsed.serviceName || undefined,
      paymentDate: parsed.paymentDate || undefined,
    },
    rawResponse: rawText,
  };
}

/**
 * Bedrock 응답 텍스트에서 JSON을 추출하여 파싱한다.
 */
function parseBedrockResponse(text: string): {
  imageType: 'gifticon' | 'food_label' | 'subscription' | 'unknown';
  name: string | null;
  brand: string | null;
  expiryDate: string | null;
  serviceName: string | null;
  paymentDate: string | null;
} {
  const defaultResult = {
    imageType: 'unknown' as const,
    name: null,
    brand: null,
    expiryDate: null,
    serviceName: null,
    paymentDate: null,
  };

  try {
    // JSON 블록을 추출 (```json ... ``` 또는 { ... } 패턴)
    let jsonStr = text;
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1].trim();
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    const validTypes = ['gifticon', 'food_label', 'subscription', 'unknown'];
    const imageType = validTypes.includes(parsed.imageType) ? parsed.imageType : 'unknown';

    return {
      imageType,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      brand: typeof parsed.brand === 'string' ? parsed.brand : null,
      expiryDate: typeof parsed.expiryDate === 'string' ? parsed.expiryDate : null,
      serviceName: typeof parsed.serviceName === 'string' ? parsed.serviceName : null,
      paymentDate: typeof parsed.paymentDate === 'string' ? parsed.paymentDate : null,
    };
  } catch {
    return defaultResult;
  }
}
