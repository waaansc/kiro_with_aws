import type { CreateItemRequest, ImageAnalysisResponse } from '../types';

interface ExtractedInfoCardProps {
  data: ImageAnalysisResponse['extractedData'];
  onConfirm: (data: CreateItemRequest) => void;
  onEdit: () => void;
  onDismiss: () => void;
}

const categoryLabel: Record<string, string> = {
  gifticon: '기프티콘',
  food: '식재료',
  subscription: '정기결제',
  other: '기타',
};

/**
 * ExtractedInfoCard - 이미지 분석 결과 표시 + 등록 확인/수정/취소
 * (Requirement 8.6: 추출 정보 표시 + 등록 확인, 수정, 취소 옵션)
 */
export function ExtractedInfoCard({
  data,
  onConfirm,
  onEdit,
  onDismiss,
}: ExtractedInfoCardProps) {
  const handleConfirm = () => {
    // Build CreateItemRequest from extracted data
    const request: CreateItemRequest = {
      name: data.name ?? '',
      category: data.category ?? 'other',
      expiryDate: data.expiryDate ?? '',
      brand: data.brand,
    };

    if (data.subcategory) {
      request.subcategory = data.subcategory;
    }

    onConfirm(request);
  };

  const hasName = Boolean(data.name);
  const hasExpiryDate = Boolean(data.expiryDate);
  const canConfirm = hasName && hasExpiryDate;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        분석 결과
      </h3>

      <dl className="space-y-2 text-sm">
        {data.name && (
          <div className="flex">
            <dt className="w-16 text-gray-500 shrink-0">이름</dt>
            <dd className="text-gray-900 font-medium">{data.name}</dd>
          </div>
        )}
        {data.brand && (
          <div className="flex">
            <dt className="w-16 text-gray-500 shrink-0">브랜드</dt>
            <dd className="text-gray-900">{data.brand}</dd>
          </div>
        )}
        {data.category && (
          <div className="flex">
            <dt className="w-16 text-gray-500 shrink-0">카테고리</dt>
            <dd className="text-gray-900">
              {categoryLabel[data.category] ?? data.category}
            </dd>
          </div>
        )}
        {data.expiryDate && (
          <div className="flex">
            <dt className="w-16 text-gray-500 shrink-0">만료일</dt>
            <dd className="text-gray-900">{data.expiryDate}</dd>
          </div>
        )}
        {data.subcategory && (
          <div className="flex">
            <dt className="w-16 text-gray-500 shrink-0">분류</dt>
            <dd className="text-gray-900">{data.subcategory}</dd>
          </div>
        )}
      </dl>

      {/* Requirement 8.7: 일부 정보만 추출된 경우 안내 */}
      {(!hasName || !hasExpiryDate) && (
        <p className="mt-3 text-xs text-orange-600">
          일부 정보가 추출되지 않았습니다. 수정 버튼을 눌러 직접 입력해주세요.
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 min-h-[44px] rounded-lg bg-blue-500 text-white text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          등록
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          수정
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 min-h-[44px] rounded-lg border border-gray-300 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}
