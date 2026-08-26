import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * AWS Bedrock Claude 클라이언트
 * - 환경변수 BEDROCK_MODEL_ID로 모델 ID 설정 (기본: anthropic.claude-3-sonnet-20240229-v1:0)
 * - 환경변수 AWS_REGION으로 리전 설정
 */

const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-sonnet-20240229-v1:0';
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BedrockResponse {
  content: Array<{ type: string; text: string }>;
  stop_reason: string;
}

/**
 * Bedrock Claude 모델 호출
 * @param systemPrompt - 시스템 프롬프트 (역할/지시 정의)
 * @param messages - 대화 히스토리
 * @returns Claude 응답 텍스트
 */
export async function invokeClaude(
  systemPrompt: string,
  messages: BedrockMessage[]
): Promise<string> {
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body)) as BedrockResponse;

  if (responseBody.content && responseBody.content.length > 0) {
    return responseBody.content[0].text;
  }

  return '';
}

export { bedrockClient, BEDROCK_MODEL_ID };
