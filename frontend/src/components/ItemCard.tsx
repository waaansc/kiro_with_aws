import { useState } from 'react';
import type { ItemSummary } from '../types';
import { getUrgencyColor } from '../utils/dday';
import { MapModal } from './MapModal';

interface ItemCardProps {
  item: ItemSummary;
}

/**
 * 아이템 카드 컴포넌트
 * - D-day 뱃지 색상 코딩 (red/orange/green/gray)
 * - 만료 아이템 회색 스타일 적용
 * - 최소 44px x 44px 탭 대상
 */
export function ItemCard({ item }: ItemCardProps) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const urgencyColor = getUrgencyColor(item.dday);
  const isExpired = item.dday < 0;
  const isGifticon = item.category === 'gifticon';

  const ddayText = isExpired ? `D+${Math.abs(item.dday)}` : `D-${item.dday}`;

  const badgeColorClass: Record<string, string> = {
    red: 'bg-red-500 text-white',
    orange: 'bg-orange-400 text-white',
    green: 'bg-green-500 text-white',
    gray: 'bg-gray-400 text-white',
  };

  const categoryLabel: Record<string, string> = {
    gifticon: '기프티콘',
    food: '식재료',
    subscription: '정기결제',
    other: '기타',
  };

  return (
    <>
      <div
        className={`p-4 rounded-lg border min-h-[44px] ${
          isExpired
            ? 'border-gray-200 bg-gray-50 opacity-60'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p
              className={`text-base font-medium truncate ${
                isExpired ? 'text-gray-400' : 'text-gray-900'
              }`}
            >
              {item.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs ${isExpired ? 'text-gray-400' : 'text-gray-500'}`}
              >
                {categoryLabel[item.category] ?? item.category}
              </span>
              {item.brand && (
                <span
                  className={`text-xs ${isExpired ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  · {item.brand}
                </span>
              )}
              <span
                className={`text-xs ${isExpired ? 'text-gray-400' : 'text-gray-500'}`}
              >
                · {item.expiryDate}
              </span>
            </div>
          </div>
          <span
            className={`ml-3 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap min-w-[44px] min-h-[44px] flex items-center justify-center ${badgeColorClass[urgencyColor]}`}
          >
            {ddayText}
          </span>
        </div>

        {/* 기프티콘 아이템: 근처 매장 찾기 버튼 */}
        {isGifticon && item.brand && !isExpired && (
          <button
            onClick={() => setIsMapOpen(true)}
            className="mt-2 w-full min-h-[44px] px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            근처 매장 찾기
          </button>
        )}
      </div>

      {/* MapModal */}
      {isGifticon && item.brand && (
        <MapModal
          brand={item.brand}
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
        />
      )}
    </>
  );
}
