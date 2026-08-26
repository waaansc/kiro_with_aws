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
      <div className="p-4 max-w-md mx-auto text-center py-12 text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-4 max-w-md mx-auto text-center py-12">
        <p className="text-red-600">{error ?? '아이템을 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 min-h-[44px] bg-gray-200 text-gray-700 rounded-lg text-sm"
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
    gray: 'bg-gray-400 text-white',
  };

  return (
    <div className="max-w-md mx-auto pb-8">
      {/* 헤더 - 뒤로가기 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <button
          onClick={() => navigate('/')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 rounded-full hover:bg-gray-100"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 ml-2">상세 정보</h1>
      </div>

      {/* 이미지 영역 */}
      {item.imageUrl ? (
        <div className="w-full aspect-[4/3] bg-gray-100 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400 mt-2">등록된 이미지 없음</p>
          </div>
        </div>
      )}

      {/* 메인 정보 카드 */}
      <div className="p-5">
        {/* 이름 + D-day 뱃지 */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">
            {item.name}
          </h2>
          <span className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-bold ${badgeColor[urgencyColor]}`}>
            {ddayText}
          </span>
        </div>

        {/* 카테고리 + 브랜드 태그 */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
            {categoryLabel[item.category] ?? item.category}
          </span>
          {item.subcategory && (
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              {item.subcategory}
            </span>
          )}
          {item.brand && (
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
              {item.brand}
            </span>
          )}
        </div>

        {/* 상세 정보 리스트 */}
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">만료일</span>
            <span className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
              {item.expiryDate}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">등록일</span>
            <span className="text-sm text-gray-900">
              {new Date(item.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>

          {item.brand && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">브랜드</span>
              <span className="text-sm text-gray-900">{item.brand}</span>
            </div>
          )}

          {item.memo && (
            <div className="py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500 block mb-1">메모</span>
              <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                {item.memo}
              </p>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate(`/items/${item.id}/edit`)}
            className="flex-1 min-h-[44px] bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            수정
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 min-h-[44px] border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full shadow-xl">
            <p className="text-base font-medium text-gray-900 mb-2">
              정말 삭제하시겠습니까?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="min-w-[44px] min-h-[44px] px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="min-w-[44px] min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg"
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
