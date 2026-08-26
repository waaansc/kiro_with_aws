import type { Category } from '../types';

interface CategoryFilterProps {
  activeCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
}

interface FilterOption {
  label: string;
  value: Category | null;
}

const filterOptions: FilterOption[] = [
  { label: '전체', value: null },
  { label: '기프티콘', value: 'gifticon' },
  { label: '식재료', value: 'food' },
  { label: '정기결제', value: 'subscription' },
  { label: '기타', value: 'other' },
];

/**
 * 카테고리 필터 바 컴포넌트
 * - 전체, 기프티콘, 식재료, 정기결제, 기타 버튼
 * - 활성 필터 하이라이트
 * - 최소 44px x 44px 탭 대상
 */
export function CategoryFilter({
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="카테고리 필터">
      {filterOptions.map((option) => {
        const isActive = activeCategory === option.value;
        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onCategoryChange(option.value)}
            className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
