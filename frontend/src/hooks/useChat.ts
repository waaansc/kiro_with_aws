import { useCallback, useRef, useState } from 'react';
import type {
  ChatMessage,
  ChatResponse,
  CreateItemRequest,
  CreateItemResponse,
  ImageAnalysisResponse,
} from '../types';
import { useChatSessions } from './useChatSessions';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const TEXT_TIMEOUT_MS = 30000;
const IMAGE_TIMEOUT_MS = 60000;

export interface UseChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageAnalysis?: ImageAnalysisResponse;
  imageBase64?: string;
  imageContentType?: string;
  items?: ChatResponse['items'];
}

export interface UseChatReturn {
  messages: UseChatMessage[];
  loading: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendImage: (file: File) => Promise<void>;
  confirmAction: (data: CreateItemRequest) => Promise<CreateItemResponse>;
  sessions: { id: string; createdAt: string; messageCount: number }[];
  activeSessionId: string | null;
  createNewSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function useChat(): UseChatReturn {
  const {
    sessions,
    activeSession,
    createSession,
    switchSession,
    deleteSession,
    getActiveMessages,
    updateActiveMessages,
  } = useChatSessions();

  const [messages, setMessages] = useState<UseChatMessage[]>(() => getActiveMessages());
  const [loading, setLoading] = useState(false);
  const lastSessionIdRef = useRef<string | null>(activeSession?.id ?? null);

  // 세션 전환 감지 (useEffect 대신 렌더 시 비교)
  if (activeSession?.id && activeSession.id !== lastSessionIdRef.current) {
    lastSessionIdRef.current = activeSession.id;
    setMessages(getActiveMessages());
  }

  // 메시지를 세션에 저장하는 헬퍼 (state 변경 없이 storage만 업데이트)
  const persistMessages = useCallback((msgs: UseChatMessage[]) => {
    updateActiveMessages(msgs);
  }, [updateActiveMessages]);

  const addMessage = useCallback((msg: UseChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      persistMessages(next);
      return next;
    });
  }, [persistMessages]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const userMsg: UseChatMessage = { id: generateId(), role: 'user', content: text };
      const currentMessages = [...messages, userMsg];
      setMessages(currentMessages);
      persistMessages(currentMessages);
      setLoading(true);

      try {
        const conversationHistory: ChatMessage[] = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetchWithTimeout(
          `${API_BASE_URL}/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, conversationHistory }),
          },
          TEXT_TIMEOUT_MS,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          addMessage({ id: generateId(), role: 'assistant', content: errorData?.message ?? `서버 오류가 발생했습니다.` });
          return;
        }

        const data: ChatResponse = await response.json();
        addMessage({ id: generateId(), role: 'assistant', content: data.message, items: data.items });
      } catch (error) {
        const errorMessage =
          error instanceof DOMException && error.name === 'AbortError'
            ? '응답 시간이 초과되었습니다. 다시 시도해주세요.'
            : '네트워크 오류가 발생했습니다.';
        addMessage({ id: generateId(), role: 'assistant', content: errorMessage });
      } finally {
        setLoading(false);
      }
    },
    [messages, persistMessages, addMessage],
  );

  const sendImage = useCallback(async (file: File): Promise<void> => {
    if (file.size > 10 * 1024 * 1024) {
      addMessage({ id: generateId(), role: 'assistant', content: '이미지 크기는 10MB 이하여야 합니다.' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addMessage({ id: generateId(), role: 'assistant', content: 'JPEG, PNG, WEBP 형식만 지원합니다.' });
      return;
    }

    const userMsg: UseChatMessage = { id: generateId(), role: 'user', content: `📷 이미지: ${file.name}` };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    persistMessages(currentMessages);
    setLoading(true);

    try {
      const base64 = await fileToBase64(file);
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/chat/image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, imageContentType: file.type }),
        },
        IMAGE_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        addMessage({ id: generateId(), role: 'assistant', content: errorData?.message ?? '이미지 분석에 실패했습니다.' });
        return;
      }

      const data: ImageAnalysisResponse = await response.json();
      if (!data.success) {
        addMessage({ id: generateId(), role: 'assistant', content: data.message || '정보를 추출하지 못했습니다.' });
        return;
      }
      addMessage({ id: generateId(), role: 'assistant', content: data.message, imageAnalysis: data, imageBase64: base64, imageContentType: file.type });
    } catch (error) {
      const msg = error instanceof DOMException && error.name === 'AbortError'
        ? '이미지 분석 시간 초과.' : '네트워크 오류.';
      addMessage({ id: generateId(), role: 'assistant', content: msg });
    } finally {
      setLoading(false);
    }
  }, [messages, persistMessages, addMessage]);

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
          throw new Error(errorData?.message ?? '등록 실패');
        }
        const created: CreateItemResponse = await response.json();
        addMessage({ id: generateId(), role: 'assistant', content: `"${created.name}" 등록 완료.` });
        return created;
      } catch (error) {
        const msg = error instanceof Error ? error.message : '등록 실패';
        addMessage({ id: generateId(), role: 'assistant', content: msg });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [addMessage],
  );

  const createNewSession = useCallback(() => {
    createSession();
    setMessages([]);
    lastSessionIdRef.current = null; // 다음 렌더에서 동기화
  }, [createSession]);

  return {
    messages,
    loading,
    sendMessage,
    sendImage,
    confirmAction,
    sessions: sessions.map((s) => ({ id: s.id, createdAt: s.createdAt, messageCount: s.messages.length })),
    activeSessionId: activeSession?.id ?? null,
    createNewSession,
    switchSession,
    deleteSession,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}
