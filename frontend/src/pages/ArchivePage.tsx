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
    <div className="px-5 pt-12 pb-20 max-w-lg mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">아카이브</h1>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">
            아카이브된 아이템이 없습니다.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-0">
          {items.map((item: ItemSummary) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-4 border-b border-gray-100"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {item.name}
                </p>
                <p className="text-xs mt-0.5">
                  {categoryLabel[item.category] ?? item.category}
                  {item.brand && ` · ${item.brand}`}
                  {` · `}<span className="text-red-500">{item.expiryDate}</span>
                  {item.brand && ` · ${item.brand}`}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  type="button"
                  onClick={() => handleRestore(item.id)}
                  className="min-w-[44px] min-h-[44px] px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  복원
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(item.id)}
                  className="min-w-[44px] min-h-[44px] px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 mx-5 max-w-sm w-full">
            <p className="text-base font-semibold text-gray-900 mb-1">
              정말 삭제하시겠습니까?
            </p>
            <p className="text-sm text-gray-400 mb-6">
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="flex-1 min-h-[44px] text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 min-h-[44px] text-sm font-medium text-white bg-gray-900 rounded-lg hover:opacity-80"
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
