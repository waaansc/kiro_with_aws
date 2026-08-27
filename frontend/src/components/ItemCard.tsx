import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemSummary } from '../types';
import { getUrgencyColor } from '../utils/dday';
import { MapModal } from './MapModal';

interface ItemCardProps {
  item: ItemSummary;
}

export function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate();
  const [isMapOpen, setIsMapOpen] = useState(false);
  const urgencyColor = getUrgencyColor(item.dday);
  const isExpired = item.dday < 0;
  const isGifticon = item.category === 'gifticon';
  const hasImage = Boolean(item.imageUrl);

  const ddayText = isExpired ? `D+${Math.abs(item.dday)}` : `D-${item.dday}`;

  const badgeClass: Record<string, string> = {
    red: 'bg-red-500 text-white',
    orange: 'bg-orange-400 text-white',
    green: 'bg-green-500 text-white',
    gray: 'bg-gray-300 text-gray-600',
  };

  const categoryLabel: Record<string, string> = {
    gifticon: '기프티콘',
    food: '식재료',
    subscription: '정기결제',
    other: '기타',
  };

  const handleCardClick = () => {
    navigate(`/items/${item.id}`);
  };

  // 이미지 없는 카드: 컴팩트 스타일
  if (!hasImage) {
    return (
      <>
        <div
          onClick={handleCardClick}
          className={`cursor-pointer border border-gray-100 rounded-lg px-5 py-5 transition-colors duration-200 hover:bg-gray-50 ${
            isExpired ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {item.name}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {item.expiryDate}
                {item.brand && ` · ${item.brand}`}
                {` · ${categoryLabel[item.category] ?? item.category}`}
              </p>
            </div>
            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass[urgencyColor]}`}>
              {ddayText}
            </span>
          </div>

          {isGifticon && item.brand && !isExpired && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMapOpen(true);
              }}
              className="w-full min-h-[44px] mt-3 px-3 py-2 text-sm font-medium text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              근처 매장 찾기
            </button>
          )}
        </div>

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

  // 이미지 있는 카드: 높이 통일을 위해 flex column + 하단 고정
  return (
    <>
      <div
        onClick={handleCardClick}
        className={`cursor-pointer flex flex-col h-full transition-transform duration-200 hover:translate-y-[-2px] ${
          isExpired ? 'opacity-50' : ''
        }`}
      >
        {/* 이미지 - 고정 비율 */}
        <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden shrink-0">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* 텍스트 - 유연하게 늘어남 */}
        <div className="pt-3 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 leading-tight truncate">
              {item.name}
            </h3>
            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass[urgencyColor]}`}>
              {ddayText}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {item.expiryDate}
            {item.brand && ` · ${item.brand}`}
          </p>
          <div className="flex gap-2 mt-2">
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-gray-200 text-gray-500">
              {categoryLabel[item.category] ?? item.category}
            </span>
          </div>

          {/* 하단 매장 버튼 - mt-auto로 바닥에 고정 */}
          {isGifticon && item.brand && !isExpired && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMapOpen(true);
              }}
              className="w-full min-h-[44px] mt-auto pt-3 px-3 py-2 text-sm font-medium text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              근처 매장 찾기
            </button>
          )}
        </div>
      </div>

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
