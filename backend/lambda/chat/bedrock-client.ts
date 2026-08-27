import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

/**
 * AWS Bedrock GPT-5.6 Terra 클라이언트
 * - OpenAI Chat Completions 호환 형식 사용
 * - bedrock-runtime 엔드포인트의 /openai/v1/chat/completions 경로 활용
 * - 환경변수 BEDROCK_MODEL_ID: 기본값 us.openai.gpt-5.6-terra
 * - 환경변수 AWS_REGION: 기본값 ap-northeast-2 (서울)
 */

const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'us.openai.gpt-5.6-terra';
const AWS_REGION = process.env.AWS_REGION ?? 'ap-northeast-2';

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

export interface BedrockMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

/**
 * Bedrock GPT-5.6 Terra 모델 호출 (Chat Completions 형식)
 * @param systemPrompt - 시스템 프롬프트 (역할/지시 정의)
 * @param messages - 대화 히스토리
 * @returns GPT 응답 텍스트
 */
export async function invokeClaude(
  systemPrompt: string,
  messages: BedrockMessage[]
): Promise<string> {
  // OpenAI Chat Completions 형식으로 요청 구성
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  const requestBody = {
    model: BEDROCK_MODEL_ID,
    max_tokens: 1024,
    messages: chatMessages,
  };

  // Bedrock Runtime의 OpenAI 호환 엔드포인트 사용
  // POST https://bedrock-runtime.\{region\}.amazonaws.com/model/\{modelId\}/converse
  // 또는 Converse API를 통해 호출
  const { ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');

  const command = new ConverseCommand({
    modelId: BEDROCK_MODEL_ID,
    system: [{ text: systemPrompt }],
    messages: messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: [{ text: msg.content }],
    })),
    inferenceConfig: {
      maxTokens: 1024,
    },
  });

  const response = await bedrockClient.send(command);

  // Converse API 응답에서 텍스트 추출
  const outputMessage = response.output?.message;
  if (outputMessage?.content && outputMessage.content.length > 0) {
    const textBlock = outputMessage.content.find((block) => 'text' in block);
    if (textBlock && 'text' in textBlock) {
      return textBlock.text as string;
    }
  }

  return '';
}

export { bedrockClient, BEDROCK_MODEL_ID };
