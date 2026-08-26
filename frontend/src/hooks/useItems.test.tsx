import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ItemsProvider, itemsReducer, type ItemsState } from './ItemsContext';
import { useItems } from './useItems';

// === Reducer Tests ===

describe('itemsReducer', () => {
  const initialState: ItemsState = {
    items: [],
    loading: false,
    error: null,
    isOffline: false,
  };

  it('SET_ITEMS replaces items and clears error', () => {
    const items = [
      { id: '1', name: 'Test', category: 'food' as const, expiryDate: '2025-01-01', dday: 5 },
    ];
    const state = itemsReducer(
      { ...initialState, error: 'old error' },
      { type: 'SET_ITEMS', payload: items },
    );
    expect(state.items).toEqual(items);
    expect(state.error).toBeNull();
  });

  it('SET_LOADING updates loading state', () => {
    const state = itemsReducer(initialState, { type: 'SET_LOADING', payload: true });
    expect(state.loading).toBe(true);
  });

  it('SET_ERROR updates error state', () => {
    const state = itemsReducer(initialState, { type: 'SET_ERROR', payload: 'err' });
    expect(state.error).toBe('err');
  });

  it('ADD_ITEM appends an item', () => {
    const item = { id: '1', name: 'A', category: 'food' as const, expiryDate: '2025-01-01', dday: 5 };
    const state = itemsReducer(initialState, { type: 'ADD_ITEM', payload: item });
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual(item);
  });

  it('UPDATE_ITEM replaces the matching item', () => {
    const existing = { id: '1', name: 'Old', category: 'food' as const, expiryDate: '2025-01-01', dday: 5 };
    const updated = { id: '1', name: 'New', category: 'food' as const, expiryDate: '2025-02-01', dday: 30 };
    const state = itemsReducer(
      { ...initialState, items: [existing] },
      { type: 'UPDATE_ITEM', payload: { id: '1', item: updated } },
    );
    expect(state.items[0].name).toBe('New');
  });

  it('REMOVE_ITEM filters out the item', () => {
    const items = [
      { id: '1', name: 'A', category: 'food' as const, expiryDate: '2025-01-01', dday: 5 },
      { id: '2', name: 'B', category: 'food' as const, expiryDate: '2025-01-02', dday: 6 },
    ];
    const state = itemsReducer(
      { ...initialState, items },
      { type: 'REMOVE_ITEM', payload: '1' },
    );
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('2');
  });

  it('SET_OFFLINE updates offline state', () => {
    const state = itemsReducer(initialState, { type: 'SET_OFFLINE', payload: true });
    expect(state.isOffline).toBe(true);
  });
});

// === useItems Hook Tests ===

function wrapper({ children }: { children: ReactNode }) {
  return <ItemsProvider>{children}</ItemsProvider>;
}

describe('useItems hook', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchItems sets items on successful response', async () => {
    const mockItems = [
      { id: '1', name: 'Milk', category: 'food', expiryDate: '2025-02-01', dday: 10 },
    ];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ items: mockItems, count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useItems(), { wrapper });

    await act(async () => {
      await result.current.fetchItems();
    });

    expect(result.current.items).toEqual(mockItems);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isOffline).toBe(false);
  });

  it('fetchItems with category appends query parameter', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [], count: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useItems(), { wrapper });

    await act(async () => {
      await result.current.fetchItems('gifticon');
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('category=gifticon'),
    );
  });

  it('fetchItems sets error on API error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: '서버 오류' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useItems(), { wrapper });

    await act(async () => {
      await result.current.fetchItems();
    });

    expect(result.current.error).toBe('서버 오류');
    expect(result.current.loading).toBe(false);
  });

  it('fetchItems sets offline on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useItems(), { wrapper });

    await act(async () => {
      await result.current.fetchItems();
    });

    expect(result.current.isOffline).toBe(true);
    expect(result.current.error).toBe('Failed to fetch');
    expect(result.current.loading).toBe(false);
  });

  it('createItem adds item to state on success', async () => {
    const created = {
      id: 'new-id',
      name: 'Coffee',
      category: 'gifticon' as const,
      expiryDate: '2025-12-31',
      brand: 'Starbucks',
      createdAt: '2025-01-01T00:00:00Z',
      isArchived: false,
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(created), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useItems(), { wrapper });

    let response: unknown;
    await act(async () => {
      response = await result.current.createItem({
        name: 'Coffee',
        category: 'gifticon',
        expiryDate: '2025-12-31',
        brand: 'Starbucks',
      });
    });

    expect(response).toEqual(created);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('new-id');
  });

  it('deleteItem removes item from state on success', async () => {
    // First, set up state with an item
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: '1', name: 'A', category: 'food', expiryDate: '2025-01-01', dday: 5 }],
          count: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderHook(() => useItems(), { wrapper });

    await act(async () => {
      await result.current.fetchItems();
    });

    expect(result.current.items).toHaveLength(1);

    // Now delete the item
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: '삭제 완료' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await act(async () => {
      await result.current.deleteItem('1');
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('deleteItem sets error on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: '아이템을 찾을 수 없습니다' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useItems(), { wrapper });

    await act(async () => {
      await expect(result.current.deleteItem('nonexistent')).rejects.toThrow();
    });

    expect(result.current.error).toBe('아이템을 찾을 수 없습니다');
  });

  it('updateItem updates the item in state on success', async () => {
    // Set up state with an item
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: '1', name: 'Old', category: 'food', expiryDate: '2025-01-01', dday: 5 }],
          count: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderHook(() => useItems(), { wrapper });

    await act(async () => {
      await result.current.fetchItems();
    });

    // Update
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: '1', name: 'Updated', category: 'food', expiryDate: '2025-06-01' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await act(async () => {
      await result.current.updateItem('1', { name: 'Updated' });
    });

    expect(result.current.items[0].name).toBe('Updated');
  });
});
