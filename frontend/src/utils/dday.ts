import type { Category, ItemSummary, UrgencyColor } from '../types';

/**
 * D-day 계산 순수 함수
 * Returns positive number for days remaining, 0 on expiry day, negative for expired.
 *
 * @param expiryDate - ISO 8601 날짜 문자열 (YYYY-MM-DD)
 * @param today - ISO 8601 날짜 문자열 (YYYY-MM-DD)
 * @returns 만료일까지 남은 일수 (양수: 남은 일수, 0: 당일, 음수: 만료 후 경과 일수)
 */
export function calculateDday(expiryDate: string, today: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date(today);
  // 시간 제거, 날짜만 비교
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 긴급도 색상 결정 순수 함수
 * dday < 0 → 'gray', 0~3 → 'red', 4~7 → 'orange', >= 8 → 'green'
 *
 * @param dday - D-day 값
 * @returns 긴급도 색상
 */
export function getUrgencyColor(dday: number): UrgencyColor {
  if (dday < 0) return 'gray';
  if (dday <= 3) return 'red';
  if (dday <= 7) return 'orange';
  return 'green';
}

/**
 * 정렬 순수 함수: 만료된 아이템은 하단, 나머지는 만료일 가까운 순
 *
 * @param items - 아이템 목록
 * @returns 정렬된 새 배열
 */
export function sortItemsByExpiry(items: ItemSummary[]): ItemSummary[] {
  return [...items].sort((a, b) => {
    // 만료된 아이템(dday < 0)은 하단으로
    if (a.dday < 0 && b.dday >= 0) return 1;
    if (a.dday >= 0 && b.dday < 0) return -1;
    // 같은 그룹 내에서는 dday 오름차순 (만료일 가까운 순)
    return a.dday - b.dday;
  });
}

/**
 * 카테고리 필터 순수 함수
 * category가 null이면 전체 반환, 지정되면 해당 카테고리만 반환
 *
 * @param items - 아이템 목록
 * @param category - 필터할 카테고리 (null이면 전체)
 * @returns 필터된 새 배열
 */
export function filterByCategory(
  items: ItemSummary[],
  category: Category | null,
): ItemSummary[] {
  if (!category) return items;
  return items.filter((item) => item.category === category);
}
