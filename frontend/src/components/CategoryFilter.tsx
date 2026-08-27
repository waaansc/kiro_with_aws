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

export function CategoryFilter({
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-2" role="group" aria-label="카테고리 필터">
      {filterOptions.map((option) => {
        const isActive = activeCategory === option.value;
        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onCategoryChange(option.value)}
            className={`min-w-[44px] min-h-[44px] py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
              isActive
                ? 'text-gray-900 font-semibold border-gray-900'
                : 'text-gray-400 font-normal border-transparent hover:text-gray-600'
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
