import { useEffect, useState } from 'react';
import { useItems } from '../hooks/useItems';
import { useNavigate, useParams } from 'react-router-dom';
import { getUrgencyColor } from '../utils/dday';
import type { Category } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface ItemDetail {
  id: string;
  name: string;
  category: Category;
  subcategory?: string;
  expiryDate: string;
  brand?: string;
  memo?: string;
  imageUrl?: string;
  createdAt: string;
  isArchived: boolean;
  dday: number;
}

const categoryLabel: Record<string, string> = {
  gifticon: '기프티콘',
  food: '식재료',
  subscription: '정기결제',
  other: '기타',
};

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteItem: deleteItemFromState } = useItems();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/items/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('아이템을 불러올 수 없습니다.');
        return res.json();
      })
      .then((data) => setItem(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteItemFromState(id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="px-5 pt-12 max-w-lg mx-auto text-center py-20">
        <p className="text-gray-500 text-sm">{error ?? '아이템을 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-5 py-3 min-h-[44px] text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const urgencyColor = getUrgencyColor(item.dday);
  const isExpired = item.dday < 0;
  const ddayText = isExpired ? `D+${Math.abs(item.dday)}` : `D-${item.dday}`;

  const badgeColor: Record<string, string> = {
    red: 'bg-red-500 text-white',
    orange: 'bg-orange-400 text-white',
    green: 'bg-green-500 text-white',
    gray: 'bg-gray-300 text-gray-600',
  };

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* 헤더 */}
      <div className="flex items-center px-5 pt-6 pb-4">
        <button
          onClick={() => navigate('/')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-3 hover:opacity-60 transition-opacity"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-900" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* 이미지 영역 */}
      <div className="px-5">
        {item.imageUrl ? (
          <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-gray-50 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="px-5 pt-6">
        {/* 이름 + D-day */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {item.name}
          </h1>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${badgeColor[urgencyColor]}`}>
            {ddayText}
          </span>
        </div>

        {/* 태그 */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600">
            {categoryLabel[item.category] ?? item.category}
          </span>
          {item.subcategory && (
            <span className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600">
              {item.subcategory}
            </span>
          )}
          {item.brand && (
            <span className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600">
              {item.brand}
            </span>
          )}
        </div>

        {/* 상세 정보 */}
        <div className="mt-8 space-y-0">
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-sm text-gray-400">만료일</span>
            <span className={`text-sm font-medium ${isExpired ? 'text-red-500' : 'text-gray-900'}`}>
              {item.expiryDate}
            </span>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-sm text-gray-400">등록일</span>
            <span className="text-sm text-gray-900">
              {new Date(item.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>

          {item.brand && (
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <span className="text-sm text-gray-400">브랜드</span>
              <span className="text-sm text-gray-900">{item.brand}</span>
            </div>
          )}

          {item.memo && (
            <div className="py-4 border-b border-gray-100">
              <span className="text-sm text-gray-400 block mb-2">메모</span>
              <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                {item.memo}
              </p>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => navigate(`/items/${item.id}/edit`)}
            className="flex-1 min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
          >
            수정
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 min-h-[44px] border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
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
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 min-h-[44px] text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
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
