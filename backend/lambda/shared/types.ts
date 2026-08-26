/**
 * 공통 타입 정의
 */

// === 공통 타입 ===

export type Category = 'gifticon' | 'food' | 'subscription' | 'other';

export interface Item {
  id: string;
  name: string;
  category: Category;
  subcategory?: string;
  expiryDate: string;
  brand?: string;
  memo?: string;
  imageUrl?: string;
  createdAt: string;
  isArchived: boolean;
}

export interface ItemSummary {
  id: string;
  name: string;
  category: Category;
  expiryDate: string;
  dday: number; // 양수: 남은 일수, 음수: 만료 후 경과 일수
  brand?: string;
  imageUrl?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// === Items CRUD API ===

// POST /api/items - 아이템 생성
export interface CreateItemRequest {
  name: string; // 1~50자
  category: Category;
  subcategory?: string;
  expiryDate: string; // ISO 8601 (YYYY-MM-DD)
  brand?: string;
  memo?: string;
  imageBase64?: string; // Base64 인코딩된 이미지 (5MB 이하)
  imageContentType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CreateItemResponse {
  id: string;
  name: string;
  category: Category;
  subcategory?: string;
  expiryDate: string;
  brand?: string;
  memo?: string;
  imageUrl?: string;
  createdAt: string;
  isArchived: boolean;
}

// GET /api/items?category={category}&archived={boolean}
export interface GetItemsResponse {
  items: ItemSummary[];
  count: number;
}

// GET /api/items/:id
export interface GetItemDetailResponse extends CreateItemResponse {
  dday: number;
}

// PUT /api/items/:id
export interface UpdateItemRequest {
  name?: string;
  category?: Category;
  subcategory?: string;
  expiryDate?: string;
  brand?: string;
  memo?: string;
  imageBase64?: string;
  imageContentType?: string;
}

// DELETE /api/items/:id
export interface DeleteItemResponse {
  message: string;
}

// === Chat API ===

// POST /api/chat
export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  action?: {
    type: 'create' | 'list' | 'delete' | 'confirm_delete';
    data?: unknown;
  };
  items?: ItemSummary[]; // 조회 결과
}

// === Image Analysis API ===

// POST /api/chat/image
export interface ImageAnalysisRequest {
  imageBase64: string;
  imageContentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ImageAnalysisResponse {
  success: boolean;
  imageType: 'gifticon' | 'food_label' | 'subscription' | 'unknown';
  extractedData: {
    name?: string;
    brand?: string;
    expiryDate?: string;
    category?: Category;
    subcategory?: string;
  };
  confidence: number; // 0.0 ~ 1.0
  message: string;
}

// === Location API ===

// GET /api/locations/:brand?lat={lat}&lng={lng}&radius={radius}
export interface LocationSearchRequest {
  brand: string;
  lat: number;
  lng: number;
  radius?: number; // km, 기본값 5
}

export interface LocationSearchResponse {
  stores: Store[];
  count: number;
}

export interface Store {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number; // km
  phone?: string;
}
