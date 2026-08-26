import { useEffect, useRef, useState } from 'react';
import type { Store } from '../types';

interface KakaoMapProps {
  center: { lat: number; lng: number };
  stores: Store[];
}

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number },
        ) => unknown;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { map: unknown; position: unknown; title?: string }) => unknown;
      };
    };
  }
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY ?? '';

/**
 * KakaoMap 컴포넌트
 * - Kakao Maps JS SDK를 동적으로 로드 (script tag)
 * - 지도 렌더링 + 매장 마커 표시
 * - 사용자 현재 위치 중심
 * - SDK 로드 실패 시 graceful fallback
 */
export function KakaoMap({ center, stores }: KakaoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState(false);

  // Kakao Maps SDK 동적 로드
  useEffect(() => {
    if (window.kakao?.maps) {
      setSdkLoaded(true);
      return;
    }

    if (!KAKAO_MAP_KEY) {
      setSdkError(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src*="dapi.kakao.com"]',
    );
    if (existingScript) {
      // SDK 스크립트가 이미 로드 중
      existingScript.addEventListener('load', () => {
        if (window.kakao?.maps) {
          window.kakao.maps.load(() => setSdkLoaded(true));
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false`;
    script.async = true;

    script.onload = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setSdkLoaded(true));
      } else {
        setSdkError(true);
      }
    };

    script.onerror = () => {
      setSdkError(true);
    };

    document.head.appendChild(script);
  }, []);

  // 지도 생성 및 마커 배치
  useEffect(() => {
    if (!sdkLoaded || !mapContainerRef.current || !window.kakao?.maps) {
      return;
    }

    const { maps } = window.kakao;
    const centerLatLng = new maps.LatLng(center.lat, center.lng);

    const map = new maps.Map(mapContainerRef.current, {
      center: centerLatLng,
      level: 5,
    });

    // 현재 위치 마커
    new maps.Marker({
      map,
      position: centerLatLng,
      title: '현재 위치',
    });

    // 매장 마커
    for (const store of stores) {
      const storePosition = new maps.LatLng(store.lat, store.lng);
      new maps.Marker({
        map,
        position: storePosition,
        title: store.name,
      });
    }
  }, [sdkLoaded, center, stores]);

  if (sdkError) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-sm text-gray-500">
          지도를 표시할 수 없습니다.
        </p>
      </div>
    );
  }

  if (!sdkLoaded) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-sm text-gray-500">지도 로딩 중...</p>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-48 rounded-lg"
      aria-label="매장 위치 지도"
    />
  );
}
