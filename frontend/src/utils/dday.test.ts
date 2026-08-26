import { describe, it, expect } from 'vitest';
import { calculateDday, getUrgencyColor, sortItemsByExpiry, filterByCategory } from './dday';
import type { ItemSummary } from '../types';

describe('calculateDday', () => {
  it('returns positive number for future expiry date', () => {
    expect(calculateDday('2025-01-10', '2025-01-05')).toBe(5);
  });

  it('returns 0 on expiry day', () => {
    expect(calculateDday('2025-01-05', '2025-01-05')).toBe(0);
  });

  it('returns negative number for past expiry date', () => {
    expect(calculateDday('2025-01-01', '2025-01-05')).toBe(-4);
  });

  it('returns 1 for tomorrow', () => {
    expect(calculateDday('2025-03-02', '2025-03-01')).toBe(1);
  });

  it('returns -1 for yesterday', () => {
    expect(calculateDday('2025-02-28', '2025-03-01')).toBe(-1);
  });
});

describe('getUrgencyColor', () => {
  it('returns gray for negative dday (expired)', () => {
    expect(getUrgencyColor(-1)).toBe('gray');
    expect(getUrgencyColor(-100)).toBe('gray');
  });

  it('returns red for dday 0 to 3', () => {
    expect(getUrgencyColor(0)).toBe('red');
    expect(getUrgencyColor(1)).toBe('red');
    expect(getUrgencyColor(2)).toBe('red');
    expect(getUrgencyColor(3)).toBe('red');
  });

  it('returns orange for dday 4 to 7', () => {
    expect(getUrgencyColor(4)).toBe('orange');
    expect(getUrgencyColor(5)).toBe('orange');
    expect(getUrgencyColor(6)).toBe('orange');
    expect(getUrgencyColor(7)).toBe('orange');
  });

  it('returns green for dday 8 or more', () => {
    expect(getUrgencyColor(8)).toBe('green');
    expect(getUrgencyColor(30)).toBe('green');
    expect(getUrgencyColor(365)).toBe('green');
  });
});

describe('sortItemsByExpiry', () => {
  const makeItem = (dday: number, id?: string): ItemSummary => ({
    id: id ?? `item-${dday}`,
    name: `Item ${dday}`,
    category: 'gifticon',
    expiryDate: '2025-01-01',
    dday,
  });

  it('places non-expired items before expired items', () => {
    const items = [makeItem(-5), makeItem(3), makeItem(-1), makeItem(10)];
    const sorted = sortItemsByExpiry(items);
    // Non-expired first
    expect(sorted[0].dday).toBe(3);
    expect(sorted[1].dday).toBe(10);
    // Expired last
    expect(sorted[2].dday).toBe(-5);
    expect(sorted[3].dday).toBe(-1);
  });

  it('sorts non-expired items by dday ascending (closest expiry first)', () => {
    const items = [makeItem(10), makeItem(1), makeItem(5)];
    const sorted = sortItemsByExpiry(items);
    expect(sorted.map((i) => i.dday)).toEqual([1, 5, 10]);
  });

  it('sorts expired items by dday ascending (most recently expired first)', () => {
    const items = [makeItem(-10), makeItem(-1), makeItem(-5)];
    const sorted = sortItemsByExpiry(items);
    expect(sorted.map((i) => i.dday)).toEqual([-10, -5, -1]);
  });

  it('does not mutate original array', () => {
    const items = [makeItem(5), makeItem(1)];
    const original = [...items];
    sortItemsByExpiry(items);
    expect(items).toEqual(original);
  });

  it('handles empty array', () => {
    expect(sortItemsByExpiry([])).toEqual([]);
  });
});

describe('filterByCategory', () => {
  const items: ItemSummary[] = [
    { id: '1', name: 'Gift', category: 'gifticon', expiryDate: '2025-01-01', dday: 5 },
    { id: '2', name: 'Food', category: 'food', expiryDate: '2025-01-02', dday: 3 },
    { id: '3', name: 'Sub', category: 'subscription', expiryDate: '2025-01-03', dday: 10 },
    { id: '4', name: 'Gift2', category: 'gifticon', expiryDate: '2025-01-04', dday: 1 },
    { id: '5', name: 'Other', category: 'other', expiryDate: '2025-01-05', dday: 7 },
  ];

  it('returns all items when category is null', () => {
    const result = filterByCategory(items, null);
    expect(result).toEqual(items);
  });

  it('filters items by specified category', () => {
    const result = filterByCategory(items, 'gifticon');
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.category === 'gifticon')).toBe(true);
  });

  it('returns empty array when no items match category', () => {
    const foodOnly: ItemSummary[] = [
      { id: '1', name: 'Food', category: 'food', expiryDate: '2025-01-01', dday: 5 },
    ];
    const result = filterByCategory(foodOnly, 'subscription');
    expect(result).toEqual([]);
  });

  it('does not lose matching items', () => {
    const result = filterByCategory(items, 'food');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});
