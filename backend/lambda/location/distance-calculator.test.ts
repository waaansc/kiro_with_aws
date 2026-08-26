import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  formatDistance,
  filterByRadius,
  sortByDistance,
} from './distance-calculator.js';
import type { Store } from '../shared/types.js';

describe('haversineDistance', () => {
  it('동일한 좌표의 거리는 0이다', () => {
    const distance = haversineDistance(37.5665, 126.978, 37.5665, 126.978);
    expect(distance).toBe(0);
  });

  it('서울역 → 강남역 거리를 올바르게 계산한다 (약 9~11km)', () => {
    // 서울역: 37.5547, 126.9707
    // 강남역: 37.4979, 127.0276
    const distance = haversineDistance(37.5547, 126.9707, 37.4979, 127.0276);
    expect(distance).toBeGreaterThan(7);
    expect(distance).toBeLessThan(12);
  });

  it('서울 → 부산 거리를 올바르게 계산한다 (약 325km)', () => {
    // 서울: 37.5665, 126.978
    // 부산: 35.1796, 129.0756
    const distance = haversineDistance(37.5665, 126.978, 35.1796, 129.0756);
    expect(distance).toBeGreaterThan(300);
    expect(distance).toBeLessThan(350);
  });

  it('매우 가까운 두 점의 거리는 1km 미만이다', () => {
    // 약 500m 차이
    const distance = haversineDistance(37.5665, 126.978, 37.5710, 126.978);
    expect(distance).toBeLessThan(1);
    expect(distance).toBeGreaterThan(0);
  });

  it('거리는 항상 0 이상이다', () => {
    const distance = haversineDistance(0, 0, 90, 180);
    expect(distance).toBeGreaterThanOrEqual(0);
  });

  it('A→B와 B→A의 거리는 동일하다 (대칭성)', () => {
    const ab = haversineDistance(37.5665, 126.978, 35.1796, 129.0756);
    const ba = haversineDistance(35.1796, 129.0756, 37.5665, 126.978);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe('formatDistance', () => {
  it('소수점 1자리로 포맷팅한다', () => {
    expect(formatDistance(1.234)).toBe('1.2km');
  });

  it('정수 거리도 소수점 1자리로 표시한다', () => {
    expect(formatDistance(5)).toBe('5.0km');
  });

  it('0.1km 미만 거리를 올바르게 포맷팅한다', () => {
    expect(formatDistance(0.05)).toBe('0.1km');
  });

  it('0km를 포맷팅한다', () => {
    expect(formatDistance(0)).toBe('0.0km');
  });

  it('큰 거리를 포맷팅한다', () => {
    expect(formatDistance(123.456)).toBe('123.5km');
  });
});

describe('filterByRadius', () => {
  const centerLat = 37.5665;
  const centerLng = 126.978;

  const stores: Store[] = [
    { name: '근처 매장', address: '서울', lat: 37.567, lng: 126.979, distance: 0 },
    { name: '먼 매장', address: '부산', lat: 35.1796, lng: 129.0756, distance: 0 },
    { name: '중간 매장', address: '수원', lat: 37.2636, lng: 127.0286, distance: 0 },
  ];

  it('반경 내 매장만 반환한다', () => {
    const result = filterByRadius(stores, centerLat, centerLng, 5);
    // 근처 매장만 5km 이내
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('근처 매장');
  });

  it('반경을 크게 설정하면 더 많은 매장이 반환된다', () => {
    const result = filterByRadius(stores, centerLat, centerLng, 50);
    // 근처 매장 + 수원 매장 (약 35km)
    expect(result.length).toBe(2);
  });

  it('반경을 매우 크게 설정하면 모든 매장이 반환된다', () => {
    const result = filterByRadius(stores, centerLat, centerLng, 500);
    expect(result.length).toBe(3);
  });

  it('빈 매장 목록을 처리한다', () => {
    const result = filterByRadius([], centerLat, centerLng, 5);
    expect(result).toEqual([]);
  });

  it('필터링된 매장의 distance 필드가 갱신된다', () => {
    const result = filterByRadius(stores, centerLat, centerLng, 500);
    result.forEach((store) => {
      expect(store.distance).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('sortByDistance', () => {
  it('거리 가까운 순으로 정렬한다', () => {
    const stores: Store[] = [
      { name: 'C', address: '주소3', lat: 0, lng: 0, distance: 5.0 },
      { name: 'A', address: '주소1', lat: 0, lng: 0, distance: 1.2 },
      { name: 'B', address: '주소2', lat: 0, lng: 0, distance: 3.4 },
    ];

    const sorted = sortByDistance(stores);
    expect(sorted[0].name).toBe('A');
    expect(sorted[1].name).toBe('B');
    expect(sorted[2].name).toBe('C');
  });

  it('원본 배열을 변경하지 않는다', () => {
    const stores: Store[] = [
      { name: 'B', address: '주소2', lat: 0, lng: 0, distance: 3.0 },
      { name: 'A', address: '주소1', lat: 0, lng: 0, distance: 1.0 },
    ];

    const sorted = sortByDistance(stores);
    expect(stores[0].name).toBe('B'); // 원본 변경 없음
    expect(sorted[0].name).toBe('A');
  });

  it('빈 배열을 처리한다', () => {
    expect(sortByDistance([])).toEqual([]);
  });

  it('단일 매장을 처리한다', () => {
    const stores: Store[] = [
      { name: 'A', address: '주소', lat: 0, lng: 0, distance: 2.0 },
    ];
    const sorted = sortByDistance(stores);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].name).toBe('A');
  });

  it('동일 거리의 매장 순서가 유지된다', () => {
    const stores: Store[] = [
      { name: 'First', address: '주소1', lat: 0, lng: 0, distance: 2.0 },
      { name: 'Second', address: '주소2', lat: 0, lng: 0, distance: 2.0 },
    ];
    const sorted = sortByDistance(stores);
    expect(sorted).toHaveLength(2);
  });
});
