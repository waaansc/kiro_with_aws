import { useCallback } from 'react';
import type {
  Category,
  CreateItemRequest,
  CreateItemResponse,
  GetItemsResponse,
  ItemSummary,
  UpdateItemRequest,
} from '../types';
import { useItemsContext } from './ItemsContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface UseItemsReturn {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  fetchItems: (category?: Category) => Promise<void>;
  createItem: (data: CreateItemRequest) => Promise<CreateItemResponse>;
  updateItem: (id: string, data: UpdateItemRequest) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  archiveExpired: () => Promise<void>;
}

export function useItems(): UseItemsReturn {
  const { state, dispatch } = useItemsContext();

  const fetchItems = useCallback(
    async (category?: Category): Promise<void> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const params = new URLSearchParams();
        if (category) {
          params.set('category', category);
        }
        const query = params.toString();
        const url = `${API_BASE_URL}/items${query ? `?${query}` : ''}`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const message =
            errorData?.message ?? `서버 오류가 발생했습니다. (${response.status})`;
          dispatch({ type: 'SET_ERROR', payload: message });
          return;
        }

        const data: GetItemsResponse = await response.json();
        dispatch({ type: 'SET_ITEMS', payload: data.items });
        dispatch({ type: 'SET_OFFLINE', payload: false });
      } catch (error) {
        // Network error - mark as offline
        dispatch({ type: 'SET_OFFLINE', payload: true });
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error
              ? error.message
              : '네트워크 오류가 발생했습니다.',
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch],
  );

  const createItem = useCallback(
    async (data: CreateItemRequest): Promise<CreateItemResponse> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const response = await fetch(`${API_BASE_URL}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const message =
            errorData?.message ?? `아이템 생성에 실패했습니다. (${response.status})`;
          dispatch({ type: 'SET_ERROR', payload: message });
          throw new Error(message);
        }

        const created: CreateItemResponse = await response.json();

        // Add to local state as ItemSummary
        const summary: ItemSummary = {
          id: created.id,
          name: created.name,
          category: created.category,
          expiryDate: created.expiryDate,
          dday: calculateDdayFromToday(created.expiryDate),
          brand: created.brand,
          imageUrl: created.imageUrl,
        };
        dispatch({ type: 'ADD_ITEM', payload: summary });
        dispatch({ type: 'SET_OFFLINE', payload: false });

        return created;
      } catch (error) {
        if (error instanceof TypeError) {
          // Network error (fetch throws TypeError on network failure)
          dispatch({ type: 'SET_OFFLINE', payload: true });
          dispatch({
            type: 'SET_ERROR',
            payload: '네트워크 오류가 발생했습니다.',
          });
        }
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch],
  );

  const updateItem = useCallback(
    async (id: string, data: UpdateItemRequest): Promise<void> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const response = await fetch(`${API_BASE_URL}/items/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const message =
            errorData?.message ?? `아이템 수정에 실패했습니다. (${response.status})`;
          dispatch({ type: 'SET_ERROR', payload: message });
          throw new Error(message);
        }

        const updated = await response.json();

        // Update local state
        const summary: ItemSummary = {
          id: updated.id,
          name: updated.name,
          category: updated.category,
          expiryDate: updated.expiryDate,
          dday: calculateDdayFromToday(updated.expiryDate),
          brand: updated.brand,
          imageUrl: updated.imageUrl,
        };
        dispatch({ type: 'UPDATE_ITEM', payload: { id, item: summary } });
        dispatch({ type: 'SET_OFFLINE', payload: false });
      } catch (error) {
        if (error instanceof TypeError) {
          dispatch({ type: 'SET_OFFLINE', payload: true });
          dispatch({
            type: 'SET_ERROR',
            payload: '네트워크 오류가 발생했습니다.',
          });
        }
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch],
  );

  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const response = await fetch(`${API_BASE_URL}/items/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const message =
            errorData?.message ?? `아이템 삭제에 실패했습니다. (${response.status})`;
          dispatch({ type: 'SET_ERROR', payload: message });
          throw new Error(message);
        }

        dispatch({ type: 'REMOVE_ITEM', payload: id });
        dispatch({ type: 'SET_OFFLINE', payload: false });
      } catch (error) {
        if (error instanceof TypeError) {
          dispatch({ type: 'SET_OFFLINE', payload: true });
          dispatch({
            type: 'SET_ERROR',
            payload: '네트워크 오류가 발생했습니다.',
          });
        }
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch],
  );

  const archiveExpired = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`${API_BASE_URL}/items/archive-expired`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.message ?? `아카이브 처리에 실패했습니다. (${response.status})`;
        dispatch({ type: 'SET_ERROR', payload: message });
        throw new Error(message);
      }

      // 아카이브 후 목록 다시 조회
      const refetchResponse = await fetch(`${API_BASE_URL}/items`);
      if (refetchResponse.ok) {
        const data = await refetchResponse.json();
        dispatch({ type: 'SET_ITEMS', payload: data.items });
      }
      dispatch({ type: 'SET_OFFLINE', payload: false });
    } catch (error) {
      if (error instanceof TypeError) {
        dispatch({ type: 'SET_OFFLINE', payload: true });
        dispatch({
          type: 'SET_ERROR',
          payload: '네트워크 오류가 발생했습니다.',
        });
      }
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, state.items]);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    isOffline: state.isOffline,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    archiveExpired,
  };
}

/**
 * Simple D-day calculation from today for local state updates.
 */
function calculateDdayFromToday(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
