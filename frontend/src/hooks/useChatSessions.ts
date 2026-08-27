import { useState, useCallback, useEffect } from 'react';
import type { UseChatMessage } from './useChat';

const STORAGE_KEY = 'expiry-dashboard-chat-sessions';
const MAX_MESSAGES_PER_SESSION = 20;
const MAX_SESSION_AGE_DAYS = 7;

export interface ChatSession {
  id: string;
  createdAt: string;
  messages: UseChatMessage[];
}

interface StoredSessions {
  activeSessionId: string | null;
  sessions: ChatSession[];
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadFromStorage(): StoredSessions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeSessionId: null, sessions: [] };
    const data: StoredSessions = JSON.parse(raw);

    // 7일 이상 된 세션 자동 삭제
    const cutoff = Date.now() - MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000;
    data.sessions = data.sessions.filter(
      (s) => new Date(s.createdAt).getTime() > cutoff,
    );

    return data;
  } catch {
    return { activeSessionId: null, sessions: [] };
  }
}

function saveToStorage(data: StoredSessions): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export interface UseChatSessionsReturn {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  createSession: () => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  getActiveMessages: () => UseChatMessage[];
  updateActiveMessages: (messages: UseChatMessage[]) => void;
}

export function useChatSessions(): UseChatSessionsReturn {
  const [data, setData] = useState<StoredSessions>(loadFromStorage);

  // 초기 로드: 활성 세션이 없으면 새로 생성
  useEffect(() => {
    if (!data.activeSessionId || !data.sessions.find((s) => s.id === data.activeSessionId)) {
      const id = generateSessionId();
      const newSession: ChatSession = {
        id,
        createdAt: new Date().toISOString(),
        messages: [],
      };
      const updated = {
        activeSessionId: id,
        sessions: [newSession, ...data.sessions],
      };
      setData(updated);
      saveToStorage(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSession = data.sessions.find((s) => s.id === data.activeSessionId) ?? null;

  const createSession = useCallback((): string => {
    const id = generateSessionId();
    const newSession: ChatSession = {
      id,
      createdAt: new Date().toISOString(),
      messages: [],
    };
    const updated: StoredSessions = {
      activeSessionId: id,
      sessions: [newSession, ...data.sessions],
    };
    setData(updated);
    saveToStorage(updated);
    return id;
  }, [data]);

  const switchSession = useCallback((sessionId: string) => {
    setData((prev) => {
      const updated = { ...prev, activeSessionId: sessionId };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setData((prev) => {
      const sessions = prev.sessions.filter((s) => s.id !== sessionId);
      let activeSessionId = prev.activeSessionId;

      // 삭제한 게 현재 활성 세션이면 새 세션 생성
      if (activeSessionId === sessionId) {
        if (sessions.length > 0) {
          activeSessionId = sessions[0].id;
        } else {
          const id = generateSessionId();
          sessions.unshift({
            id,
            createdAt: new Date().toISOString(),
            messages: [],
          });
          activeSessionId = id;
        }
      }

      const updated = { activeSessionId, sessions };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const getActiveMessages = useCallback((): UseChatMessage[] => {
    return activeSession?.messages ?? [];
  }, [activeSession]);

  const updateActiveMessages = useCallback((messages: UseChatMessage[]) => {
    // 세션당 최대 메시지 수 제한
    const trimmed = messages.slice(-MAX_MESSAGES_PER_SESSION);

    setData((prev) => {
      const sessions = prev.sessions.map((s) =>
        s.id === prev.activeSessionId ? { ...s, messages: trimmed } : s,
      );
      const updated = { ...prev, sessions };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  return {
    sessions: data.sessions,
    activeSession,
    createSession,
    switchSession,
    deleteSession,
    getActiveMessages,
    updateActiveMessages,
  };
}
