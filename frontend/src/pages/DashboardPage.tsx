import { useEffect, useState } from 'react';
import type { Category } from '../types';
import { useItems } from '../hooks/useItems';
import { useOfflineCache } from '../hooks/useOfflineCache';
import { sortItemsByExpiry, filterByCategory } from '../utils/dday';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { CategoryFilter } from '../components/CategoryFilter';
import { ItemCard } from '../components/ItemCard';
import { AddItemButton } from '../components/AddItemButton';

export default function DashboardPage() {
  const { items, loading, error, isOffline, fetchItems, archiveExpired } =
    useItems();
  const { getCachedItems, setCachedItems } = useOfflineCache();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  useEffect(() => {
    const init = async () => {
      await fetchItems();
      try {
        await archiveExpired();
      } catch {
        // 아카이브 실패는 무시
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (items.length > 0 && !isOffline) {
      setCachedItems(items);
    }
  }, [items, isOffline, setCachedItems]);

  const displayItems = isOffline && items.length === 0
    ? getCachedItems() ?? []
    : items;

  const filteredItems = filterByCategory(displayItems, activeCategory);
  const sortedItems = sortItemsByExpiry(filteredItems);

  // 이미지 유무에 따라 분리
  const itemsWithImage = sortedItems.filter((i) => Boolean(i.imageUrl));
  const itemsWithoutImage = sortedItems.filter((i) => !i.imageUrl);

  return (
    <div className="px-5 pt-12 pb-20 max-w-lg mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">대시보드</h1>

      <OfflineIndicator isOffline={isOffline} />

      <div className="mb-8">
        <CategoryFilter
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && !isOffline && (
        <div className="text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {!loading && sortedItems.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">
            등록된 아이템이 없습니다.
          </p>
        </div>
      )}

      {sortedItems.length > 0 && (
        <div className="space-y-6">
          {/* 이미지 없는 아이템: 컴팩트 리스트 (풀 너비) */}
          {itemsWithoutImage.length > 0 && (
            <div className="flex flex-col gap-3">
              {itemsWithoutImage.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* 이미지 있는 아이템: 카드 그리드 (2열) */}
          {itemsWithImage.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
              {itemsWithImage.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      <AddItemButton />
    </div>
  );
}
