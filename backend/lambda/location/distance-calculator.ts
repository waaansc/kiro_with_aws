import type { Store } from '../shared/types.js';

/**
 * Haversine formula를 사용한 거리 계산 유틸리티
 * - 두 지점 간의 대원 거리를 km 단위로 계산
 */

const EARTH_RADIUS_KM = 6371;

/**
 * 두 좌표 간 거리를 Haversine formula로 계산
 * @param lat1 - 시작점 위도
 * @param lng1 - 시작점 경도
 * @param lat2 - 끝점 위도
 * @param lng2 - 끝점 경도
 * @returns 거리 (km)
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * 거리를 "N.Nkm" 형식으로 포맷팅
 * @param distanceKm - km 단위 거리
 * @returns 소수점 1자리까지 표시된 거리 문자열 (예: "1.5km")
 */
export function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * 반경 내 매장만 필터링
 * @param stores - 매장 목록
 * @param centerLat - 중심점 위도
 * @param centerLng - 중심점 경도
 * @param radiusKm - 반경 (km)
 * @returns 반경 내 매장 목록 (distance 필드 갱신)
 */
export function filterByRadius(
  stores: Store[],
  centerLat: number,
  centerLng: number,
  radiusKm: number
): Store[] {
  return stores
    .map((store) => ({
      ...store,
      distance: haversineDistance(centerLat, centerLng, store.lat, store.lng),
    }))
    .filter((store) => store.distance <= radiusKm);
}

/**
 * 매장을 거리 가까운 순으로 정렬
 * @param stores - 매장 목록
 * @returns 거리순 정렬된 매장 목록
 */
export function sortByDistance(stores: Store[]): Store[] {
  return [...stores].sort((a, b) => a.distance - b.distance);
}
