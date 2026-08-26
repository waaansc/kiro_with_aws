import { useCallback, useState } from 'react';
import type {
  ChatMessage,
  ChatResponse,
  CreateItemRequest,
  CreateItemResponse,
  ImageAnalysisResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** 텍스트 메시지 타임아웃: 5초 (Requirement 12.2) */
const TEXT_TIMEOUT_MS = 5000;
/** 이미지 분석 타임아웃: 10초 (Requirement 12.3) */
const IMAGE_TIMEOUT_MS = 10000;

export interface UseChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageAnalysis?: ImageAnalysisResponse;
  items?: ChatResponse['items'];
}

export interface UseChatReturn {
  messages: UseChatMessage[];
  loading: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendImage: (file: File) => Promise<void>;
  confirmAction: (data: CreateItemRequest) => Promise<CreateItemResponse>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Fetch with AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * useChat - 챗봇 상태 관리 커스텀 Hook
 *
 * - 메시지 목록 관리
 * - sendMessage: POST /api/chat (텍스트, 5초 타임아웃)
 * - sendImage: POST /api/chat/image (이미지 분석, 10초 타임아웃)
 * - confirmAction: POST /api/items (분석 결과 등록)
 */
export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<UseChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const userMsg: UseChatMessage = {
        id: generateId(),
        role: 'user',
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        // Build conversation history from previous messages
        const conversationHistory: ChatMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetchWithTimeout(
          `${API_BASE_URL}/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              conversationHistory,
            }),
          },
          TEXT_TIMEOUT_MS,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage =
            errorData?.message ?? `서버 오류가 발생했습니다. (${response.status})`;
          const assistantMsg: UseChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: errorMessage,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          return;
        }

        const data: ChatResponse = await response.json();
        const assistantMsg: UseChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.message,
          items: data.items,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error) {
        const errorMessage =
          error instanceof DOMException && error.name === 'AbortError'
            ? '응답 시간이 초과되었습니다. 다시 시도해주세요.'
            : '네트워크 오류가 발생했습니다.';
        const assistantMsg: UseChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: errorMessage,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } finally {
        setLoading(false);
      }
    },
    [messages],
  );

  const sendImage = useCallback(async (file: File): Promise<void> => {
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg: UseChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '이미지 크기는 10MB 이하여야 합니다.',
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const errorMsg: UseChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'JPEG, PNG, WEBP 형식의 이미지만 지원합니다.',
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    // Add user message indicating image upload
    const userMsg: UseChatMessage = {
      id: generateId(),
      role: 'user',
      content: `📷 이미지 전송: ${file.name}`,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Read file as base64
      const base64 = await fileToBase64(file);
      const imageContentType = file.type as
        | 'image/jpeg'
        | 'image/png'
        | 'image/webp';

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/chat/image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            imageContentType,
          }),
        },
        IMAGE_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.message ?? `이미지 분석에 실패했습니다. (${response.status})`;
        const assistantMsg: UseChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: errorMessage,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const data: ImageAnalysisResponse = await response.json();

      if (!data.success) {
        // Requirement 8.8: 분석 실패 시 수동 입력 안내
        const assistantMsg: UseChatMessage = {
          id: generateId(),
          role: 'assistant',
          content:
            data.message || '이미지에서 정보를 추출하지 못했습니다. 수동으로 입력해주세요.',
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      // Requirement 8.6: 추출 정보 표시 + 등록 확인/수정/취소
      const assistantMsg: UseChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        imageAnalysis: data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMessage =
        error instanceof DOMException && error.name === 'AbortError'
          ? '이미지 분석 응답 시간이 초과되었습니다. 다시 시도해주세요.'
          : '네트워크 오류가 발생했습니다.';
      const assistantMsg: UseChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: errorMessage,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmAction = useCallback(
    async (data: CreateItemRequest): Promise<CreateItemResponse> => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage =
            errorData?.message ?? `아이템 등록에 실패했습니다. (${response.status})`;
          throw new Error(errorMessage);
        }

        const created: CreateItemResponse = await response.json();

        const confirmMsg: UseChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `"${created.name}" 아이템이 등록되었습니다.`,
        };
        setMessages((prev) => [...prev, confirmMsg]);

        return created;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : '아이템 등록에 실패했습니다.';
        const errorMsg: UseChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: errorMessage,
        };
        setMessages((prev) => [...prev, errorMsg]);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { messages, loading, sendMessage, sendImage, confirmAction };
}

/**
 * File을 base64 문자열로 변환 (data URL prefix 제거)
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:image/...;base64," prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}
