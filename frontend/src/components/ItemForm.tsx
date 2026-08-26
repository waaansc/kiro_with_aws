import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import type { Category, CreateItemRequest, UpdateItemRequest } from '../types';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'gifticon', label: '기프티콘' },
  { value: 'food', label: '식재료' },
  { value: 'subscription', label: '정기결제' },
  { value: 'other', label: '기타' },
];

const SUBCATEGORY_OPTIONS: Record<Category, string[]> = {
  gifticon: ['카페', '편의점', '외식', '기타'],
  food: ['냉장', '냉동', '상온'],
  subscription: ['구독 서비스', '보험', '멤버십'],
  other: [],
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ItemFormData {
  name: string;
  category: Category;
  subcategory: string;
  expiryDate: string;
  brand: string;
  memo: string;
  imageBase64?: string;
  imageContentType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ItemFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<ItemFormData>;
  onSubmit: (data: CreateItemRequest | UpdateItemRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormErrors {
  name?: string;
  category?: string;
  expiryDate?: string;
  image?: string;
}

export default function ItemForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: ItemFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [category, setCategory] = useState<Category>(
    initialData?.category ?? 'gifticon',
  );
  const [subcategory, setSubcategory] = useState(
    initialData?.subcategory ?? '',
  );
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate ?? '');
  const [brand, setBrand] = useState(initialData?.brand ?? '');
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | undefined>(
    initialData?.imageBase64,
  );
  const [imageContentType, setImageContentType] = useState<
    'image/jpeg' | 'image/png' | 'image/webp' | undefined
  >(initialData?.imageContentType);
  const [errors, setErrors] = useState<FormErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validate(): FormErrors {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = '이름은 필수 항목입니다.';
    } else if (name.trim().length > 50) {
      newErrors.name = '이름은 50자 이하여야 합니다.';
    }

    if (!category) {
      newErrors.category = '카테고리는 필수 항목입니다.';
    }

    if (!expiryDate) {
      newErrors.expiryDate = '만료일은 필수 항목입니다.';
    }

    return newErrors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const data: CreateItemRequest | UpdateItemRequest = {
      name: name.trim(),
      category,
      subcategory: subcategory || undefined,
      expiryDate,
      brand: brand || undefined,
      memo: memo || undefined,
      imageBase64,
      imageContentType,
    };

    await onSubmit(data);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: 'JPEG, PNG, WEBP 형식의 이미지만 첨부할 수 있습니다.',
      }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        image: '이미지 크기는 5MB 이하여야 합니다.',
      }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrors((prev) => ({ ...prev, image: undefined }));

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:<type>;base64,<data>"
      const base64Data = result.split(',')[1];
      setImageBase64(base64Data);
      setImageContentType(
        file.type as 'image/jpeg' | 'image/png' | 'image/webp',
      );
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageBase64(undefined);
    setImageContentType(undefined);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleCategoryChange(e: ChangeEvent<HTMLSelectElement>) {
    const newCategory = e.target.value as Category;
    setCategory(newCategory);
    setSubcategory('');
  }

  const subcategoryOptions = SUBCATEGORY_OPTIONS[category];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4" noValidate>
      {/* 이름 */}
      <div>
        <label
          htmlFor="item-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="아이템 이름을 입력하세요"
          className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* 카테고리 */}
      <div>
        <label
          htmlFor="item-category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          카테고리 <span className="text-red-500">*</span>
        </label>
        <select
          id="item-category"
          value={category}
          onChange={handleCategoryChange}
          className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-invalid={!!errors.category}
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p id="category-error" className="mt-1 text-sm text-red-600">
            {errors.category}
          </p>
        )}
      </div>

      {/* 서브카테고리 */}
      {subcategoryOptions.length > 0 && (
        <div>
          <label
            htmlFor="item-subcategory"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            서브카테고리
          </label>
          <select
            id="item-subcategory"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택 안 함</option>
            {subcategoryOptions.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 만료일 */}
      <div>
        <label
          htmlFor="item-expiry"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          만료일 <span className="text-red-500">*</span>
        </label>
        <input
          id="item-expiry"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-invalid={!!errors.expiryDate}
          aria-describedby={errors.expiryDate ? 'expiry-error' : undefined}
        />
        {errors.expiryDate && (
          <p id="expiry-error" className="mt-1 text-sm text-red-600">
            {errors.expiryDate}
          </p>
        )}
      </div>

      {/* 브랜드 */}
      <div>
        <label
          htmlFor="item-brand"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          브랜드
        </label>
        <input
          id="item-brand"
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="브랜드명 (선택)"
          className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 메모 */}
      <div>
        <label
          htmlFor="item-memo"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          메모
        </label>
        <textarea
          id="item-memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (선택)"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* 이미지 */}
      <div>
        <label
          htmlFor="item-image"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          이미지
        </label>
        <input
          id="item-image"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          className="w-full min-h-[44px] px-3 py-2 text-[14px] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 file:cursor-pointer"
          aria-describedby={errors.image ? 'image-error' : 'image-hint'}
        />
        <p id="image-hint" className="mt-1 text-xs text-gray-500">
          JPEG, PNG, WEBP (최대 5MB)
        </p>
        {errors.image && (
          <p id="image-error" className="mt-1 text-sm text-red-600">
            {errors.image}
          </p>
        )}
        {imagePreview && (
          <div className="mt-2 relative inline-block">
            <img
              src={imagePreview}
              alt="미리보기"
              className="w-24 h-24 object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              aria-label="이미지 제거"
            >
              X
            </button>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 min-h-[44px] bg-blue-600 text-white rounded-lg text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? '처리 중...'
            : mode === 'create'
              ? '등록하기'
              : '수정하기'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] bg-gray-200 text-gray-700 rounded-lg text-[14px] font-medium"
        >
          취소
        </button>
      </div>
    </form>
  );
}
