import type { Store } from '../types';

interface StoreListProps {
  stores: Store[];
}

/**
 * StoreList 컴포넌트
 * - 매장 목록을 거리순으로 표시
 * - 각 매장: 이름, 주소, 거리 (N.Nkm), 전화번호 (있으면)
 * - 최소 44px 탭 대상
 */
export function StoreList({ stores }: StoreListProps) {
  if (stores.length === 0) {
    return null;
  }

  // 거리순 정렬
  const sortedStores = [...stores].sort((a, b) => a.distance - b.distance);

  return (
    <ul className="divide-y divide-gray-200">
      {sortedStores.map((store, index) => (
        <li
          key={`${store.name}-${store.lat}-${store.lng}-${index}`}
          className="py-3 px-1 min-h-[44px] flex items-start justify-between gap-2"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {store.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {store.address}
            </p>
            {store.phone && (
              <a
                href={`tel:${store.phone}`}
                className="text-xs text-blue-600 mt-0.5 inline-block min-h-[44px] min-w-[44px] flex items-center"
              >
                {store.phone}
              </a>
            )}
          </div>
          <span className="text-xs text-gray-600 font-medium whitespace-nowrap pt-0.5">
            {formatDistance(store.distance)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 거리를 "N.Nkm" 형식으로 포맷
 */
function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1)}km`;
}
