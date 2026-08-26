import { useEffect, useState } from 'react';
import { useArchive } from '../hooks/useArchive';
import type { ItemSummary } from '../types';

const categoryLabel: Record<string, string> = {
  gifticon: '기프티콘',
  food: '식재료',
  subscription: '정기결제',
  other: '기타',
};

export default function ArchivePage() {
  const { items, loading, error, fetchArchivedItems, restoreItem, deleteItem } =
    useArchive();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async (id: string) => {
    await restoreItem(id);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (confirmDeleteId) {
      await deleteItem(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteId(null);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">아카이브</h1>

      {loading && (
        <div className="flex justify-center py-8">
          <span className="text-gray-500 text-sm">로딩 중...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-base">
            아카이브된 아이템이 없습니다.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item: ItemSummary) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium truncate text-gray-700">
                  {item.name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">
                    {categoryLabel[item.category] ?? item.category}
                  </span>
                  {item.brand && (
                    <span className="text-xs text-gray-500">
                      · {item.brand}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    · {item.expiryDate}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <button
                  type="button"
                  onClick={() => handleRestore(item.id)}
                  className="min-w-[44px] min-h-[44px] px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  복원
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(item.id)}
                  className="min-w-[44px] min-h-[44px] px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full shadow-xl">
            <p className="text-base font-medium text-gray-900 mb-4">
              정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="min-w-[44px] min-h-[44px] px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="min-w-[44px] min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
