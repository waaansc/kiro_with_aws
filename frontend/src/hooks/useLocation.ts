import { useState, useCallback } from 'react';
import type { Store } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

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
 * - Geolocation API로 현재 위치 획득 (10초 타임아웃)
 * - GET /api/locations/:brand API 호출하여 매장 검색
 * - 에러 처리: 위치 권한 거부, 타임아웃, API 실패
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
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('position_unavailable'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          resolve(coords);
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              reject(new Error('permission_denied'));
              break;
            case err.TIMEOUT:
              reject(new Error('timeout'));
              break;
            default:
              reject(new Error('position_unavailable'));
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
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
        // Step 1: 현재 위치 획득
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
        if (err instanceof Error) {
          const errorType = err.message as LocationError;
          if (
            errorType === 'permission_denied' ||
            errorType === 'timeout' ||
            errorType === 'position_unavailable'
          ) {
            setError(errorType);
          } else {
            setError('api_failure');
          }
        } else {
          setError('api_failure');
        }
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
