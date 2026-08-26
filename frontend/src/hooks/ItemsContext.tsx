import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import type { ItemSummary } from '../types';

// === State ===

export interface ItemsState {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
}

const initialState: ItemsState = {
  items: [],
  loading: false,
  error: null,
  isOffline: false,
};

// === Actions ===

export type ItemsAction =
  | { type: 'SET_ITEMS'; payload: ItemSummary[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_ITEM'; payload: ItemSummary }
  | { type: 'UPDATE_ITEM'; payload: { id: string; item: ItemSummary } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'SET_OFFLINE'; payload: boolean };

// === Reducer ===

export function itemsReducer(state: ItemsState, action: ItemsAction): ItemsState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? action.payload.item : item,
        ),
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case 'SET_OFFLINE':
      return { ...state, isOffline: action.payload };
    default:
      return state;
  }
}

// === Context ===

interface ItemsContextValue {
  state: ItemsState;
  dispatch: React.Dispatch<ItemsAction>;
}

const ItemsContext = createContext<ItemsContextValue | null>(null);

// === Provider ===

interface ItemsProviderProps {
  children: ReactNode;
}

export function ItemsProvider({ children }: ItemsProviderProps) {
  const [state, dispatch] = useReducer(itemsReducer, initialState);

  return (
    <ItemsContext.Provider value={{ state, dispatch }}>
      {children}
    </ItemsContext.Provider>
  );
}

// === Hook to access context ===

export function useItemsContext(): ItemsContextValue {
  const context = useContext(ItemsContext);
  if (!context) {
    throw new Error('useItemsContext must be used within an ItemsProvider');
  }
  return context;
}
