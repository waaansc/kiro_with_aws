import type { ItemSummary } from '../types';

const STORAGE_KEY = 'expiry-dashboard-items';

interface CacheEntry {
  data: ItemSummary[];
  timestamp: string;
}

export interface UseOfflineCacheReturn {
  getCachedItems: () => ItemSummary[] | null;
  setCachedItems: (items: ItemSummary[]) => void;
  getCacheTimestamp: () => string | null;
  clearCache: () => void;
}

/**
 * localStorage 기반 오프라인 캐시 관리 Hook
 * - 아이템 데이터를 localStorage에 저장/조회/갱신
 * - API 실패 시 캐시 폴백 처리를 위한 인터페이스 제공
 */
export function useOfflineCache(): UseOfflineCacheReturn {
  const getCachedItems = (): ItemSummary[] | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      return entry.data;
    } catch {
      return null;
    }
  };

  const setCachedItems = (items: ItemSummary[]): void => {
    const entry: CacheEntry = {
      data: items,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  };

  const getCacheTimestamp = (): string | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      return entry.timestamp;
    } catch {
      return null;
    }
  };

  const clearCache = (): void => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    getCachedItems,
    setCachedItems,
    getCacheTimestamp,
    clearCache,
  };
}
