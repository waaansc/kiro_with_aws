import { useCallback, useReducer } from 'react';
import type { ItemSummary } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface ArchiveState {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
}

type ArchiveAction =
  | { type: 'SET_ITEMS'; payload: ItemSummary[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REMOVE_ITEM'; payload: string };

function archiveReducer(state: ArchiveState, action: ArchiveAction): ArchiveState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((item) => item.id !== action.payload) };
    default:
      return state;
  }
}

export interface UseArchiveReturn {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
  fetchArchivedItems: () => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export function useArchive(): UseArchiveReturn {
  const [state, dispatch] = useReducer(archiveReducer, {
    items: [],
    loading: false,
    error: null,
  });

  const fetchArchivedItems = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`${API_BASE_URL}/items?archived=true`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.message ?? `서버 오류가 발생했습니다. (${response.status})`;
        dispatch({ type: 'SET_ERROR', payload: message });
        return;
      }

      const data = await response.json();
      // Sort by expiry date descending (most recent first)
      const sorted = [...(data.items as ItemSummary[])].sort((a, b) =>
        b.expiryDate.localeCompare(a.expiryDate),
      );
      dispatch({ type: 'SET_ITEMS', payload: sorted });
    } catch (error) {
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
  }, []);

  const restoreItem = useCallback(async (id: string): Promise<void> => {
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`${API_BASE_URL}/items/${id}/restore`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.message ?? `복원에 실패했습니다. (${response.status})`;
        dispatch({ type: 'SET_ERROR', payload: message });
        return;
      }

      dispatch({ type: 'REMOVE_ITEM', payload: id });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload:
          error instanceof Error
            ? error.message
            : '네트워크 오류가 발생했습니다.',
      });
    }
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`${API_BASE_URL}/items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.message ?? `삭제에 실패했습니다. (${response.status})`;
        dispatch({ type: 'SET_ERROR', payload: message });
        return;
      }

      dispatch({ type: 'REMOVE_ITEM', payload: id });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload:
          error instanceof Error
            ? error.message
            : '네트워크 오류가 발생했습니다.',
      });
    }
  }, []);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    fetchArchivedItems,
    restoreItem,
    deleteItem,
  };
}
