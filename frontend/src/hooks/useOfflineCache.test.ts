import { describe, it, expect, beforeEach } from 'vitest';
import { useOfflineCache } from './useOfflineCache';
import type { ItemSummary } from '../types';

const STORAGE_KEY = 'expiry-dashboard-items';

const mockItems: ItemSummary[] = [
  {
    id: '1',
    name: '스타벅스 아메리카노',
    category: 'gifticon',
    expiryDate: '2025-02-15',
    dday: 30,
    brand: '스타벅스',
  },
  {
    id: '2',
    name: '우유',
    category: 'food',
    expiryDate: '2025-01-20',
    dday: 5,
  },
];

describe('useOfflineCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setCachedItems stores data correctly in localStorage', () => {
    const { setCachedItems } = useOfflineCache();
    setCachedItems(mockItems);

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.data).toEqual(mockItems);
    expect(parsed.timestamp).toBeDefined();
  });

  it('getCachedItems retrieves stored data correctly', () => {
    const { setCachedItems, getCachedItems } = useOfflineCache();
    setCachedItems(mockItems);

    const result = getCachedItems();
    expect(result).toEqual(mockItems);
  });

  it('getCacheTimestamp returns valid ISO 8601 timestamp', () => {
    const { setCachedItems, getCacheTimestamp } = useOfflineCache();
    setCachedItems(mockItems);

    const timestamp = getCacheTimestamp();
    expect(timestamp).not.toBeNull();
    // Validate ISO 8601 format
    const date = new Date(timestamp!);
    expect(date.toISOString()).toBe(timestamp);
  });

  it('clearCache removes data from localStorage', () => {
    const { setCachedItems, getCachedItems, clearCache } = useOfflineCache();
    setCachedItems(mockItems);
    expect(getCachedItems()).toEqual(mockItems);

    clearCache();
    expect(getCachedItems()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('getCachedItems returns null when no cache exists', () => {
    const { getCachedItems } = useOfflineCache();
    const result = getCachedItems();
    expect(result).toBeNull();
  });

  it('getCacheTimestamp returns null when no cache exists', () => {
    const { getCacheTimestamp } = useOfflineCache();
    const result = getCacheTimestamp();
    expect(result).toBeNull();
  });

  it('getCachedItems returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json');
    const { getCachedItems } = useOfflineCache();
    const result = getCachedItems();
    expect(result).toBeNull();
  });

  it('getCacheTimestamp returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json');
    const { getCacheTimestamp } = useOfflineCache();
    const result = getCacheTimestamp();
    expect(result).toBeNull();
  });
});
