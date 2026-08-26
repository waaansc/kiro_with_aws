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

  // 초기 로딩: 아이템 조회 + 만료 아이템 아카이브
  useEffect(() => {
    const init = async () => {
      await fetchItems();
      try {
        await archiveExpired();
      } catch {
        // 아카이브 실패는 무시 (오프라인 등)
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 아이템 로드 성공 시 캐시 갱신
  useEffect(() => {
    if (items.length > 0 && !isOffline) {
      setCachedItems(items);
    }
  }, [items, isOffline, setCachedItems]);

  // 오프라인 시 캐시 폴백
  const displayItems = isOffline && items.length === 0
    ? getCachedItems() ?? []
    : items;

  // 카테고리 필터 → 정렬 적용
  const filteredItems = filterByCategory(displayItems, activeCategory);
  const sortedItems = sortItemsByExpiry(filteredItems);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">대시보드</h1>

      <OfflineIndicator isOffline={isOffline} />

      <div className="mt-3 mb-4">
        <CategoryFilter
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <span className="text-gray-500 text-sm">로딩 중...</span>
        </div>
      )}

      {error && !isOffline && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && sortedItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-base">
            등록된 아이템이 없습니다. 아이템을 등록해주세요.
          </p>
        </div>
      )}

      {sortedItems.length > 0 && (
        <div className="flex flex-col gap-3">
          {sortedItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <AddItemButton />
    </div>
  );
}
