import { useState, useCallback } from 'react';
import type { Store } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

// 위치를 가져올 수 없을 때 기본 좌표 (서울 강남)
const DEFAULT_POSITION = { lat: 37.4979, lng: 127.0276 };

export type LocationError =
  | 'permission_denied'
  | 'timeout'
  | 'position_unavailable'
  | 'api_failure'
  | null;

export interface UseLocationReturn {
  currentPosition: { lat: number; lng: number } | null;
  stores: Store[];
  loading: boolean;
  error: LocationError;
  searchStores: (brand: string) => Promise<void>;
  retryLocation: () => void;
}

/**
 * useLocation 커스텀 Hook
 * - Geolocation API로 현재 위치 획득 (5초 타임아웃)
 * - 위치 실패 시 기본 좌표(서울 강남)로 폴백
 * - GET /api/locations/:brand API 호출하여 매장 검색
 */
export function useLocation(): UseLocationReturn {
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LocationError>(null);
  const [lastBrand, setLastBrand] = useState<string | null>(null);

  const getCurrentPosition = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        // Geolocation 미지원 → 기본 좌표 사용
        resolve(DEFAULT_POSITION);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // 위치 실패 (권한 거부, 타임아웃 등) → 기본 좌표로 폴백
          console.warn('위치를 가져올 수 없어 기본 좌표(서울 강남)를 사용합니다.');
          resolve(DEFAULT_POSITION);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000,
        },
      );
    });
  }, []);

  const searchStores = useCallback(
    async (brand: string): Promise<void> => {
      setLoading(true);
      setError(null);
      setStores([]);
      setLastBrand(brand);

      try {
        // Step 1: 현재 위치 획득 (실패 시 기본 좌표)
        const position = await getCurrentPosition();
        setCurrentPosition(position);

        // Step 2: 매장 검색 API 호출
        const params = new URLSearchParams({
          lat: position.lat.toString(),
          lng: position.lng.toString(),
        });

        const response = await fetch(
          `${API_BASE_URL}/locations/${encodeURIComponent(brand)}?${params.toString()}`,
        );

        if (!response.ok) {
          setError('api_failure');
          return;
        }

        const data = await response.json();
        setStores(data.stores ?? []);
      } catch (err) {
        setError('api_failure');
      } finally {
        setLoading(false);
      }
    },
    [getCurrentPosition],
  );

  const retryLocation = useCallback(() => {
    if (lastBrand) {
      searchStores(lastBrand);
    }
  }, [lastBrand, searchStores]);

  return {
    currentPosition,
    stores,
    loading,
    error,
    searchStores,
    retryLocation,
  };
}
