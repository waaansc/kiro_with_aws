import { useEffect } from 'react';
import { useLocation } from '../hooks/useLocation';
import { KakaoMap } from './KakaoMap';
import { StoreList } from './StoreList';

interface MapModalProps {
  brand: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MapModal 컴포넌트
 * - 모달 오버레이 + 닫기 버튼
 * - 열릴 때: getCurrentPosition → searchStores(brand)
 * - KakaoMap + StoreList 표시
 * - 로딩 스피너
 * - 에러 상태: 위치 권한 거부, 타임아웃 (재시도), 매장 미발견
 */
export function MapModal({ brand, isOpen, onClose }: MapModalProps) {
  const { currentPosition, stores, loading, error, searchStores, retryLocation } =
    useLocation();

  useEffect(() => {
    if (isOpen) {
      searchStores(brand);
    }
  }, [isOpen, brand, searchStores]);

  // 모달이 열릴 때 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="근처 매장 찾기"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            근처 매장 찾기
          </h2>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 로딩 상태 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-gray-600">
                위치를 확인하고 매장을 검색하고 있습니다...
              </p>
            </div>
          )}

          {/* 에러 상태: 위치 권한 거부 */}
          {!loading && error === 'permission_denied' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-yellow-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                위치 권한이 필요합니다
              </p>
              <p className="text-xs text-gray-500 mt-1">
                브라우저 설정에서 위치 접근을 허용해주세요.
              </p>
            </div>
          )}

          {/* 에러 상태: 타임아웃 / 위치 획득 실패 */}
          {!loading &&
            (error === 'timeout' || error === 'position_unavailable') && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-red-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  위치를 가져올 수 없습니다
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {error === 'timeout'
                    ? '위치 확인에 시간이 너무 오래 걸렸습니다.'
                    : '위치 정보를 사용할 수 없습니다.'}
                </p>
                <button
                  onClick={retryLocation}
                  className="mt-4 px-4 py-2 min-h-[44px] bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
                >
                  다시 시도
                </button>
              </div>
            )}

          {/* 에러 상태: API 실패 */}
          {!loading && error === 'api_failure' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-red-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                매장 검색에 실패했습니다
              </p>
              <p className="text-xs text-gray-500 mt-1">
                잠시 후 다시 시도해주세요.
              </p>
              <button
                onClick={retryLocation}
                className="mt-4 px-4 py-2 min-h-[44px] bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* 성공: 지도 + 매장 목록 */}
          {!loading && !error && currentPosition && (
            <>
              <KakaoMap center={currentPosition} stores={stores} />

              {stores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-gray-600">
                    근처에 <span className="font-medium">{brand}</span> 매장을
                    찾을 수 없습니다.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    반경 5km 이내에 검색 결과가 없습니다.
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {brand} 매장 ({stores.length}개)
                  </p>
                  <StoreList stores={stores} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
