import type { CreateItemRequest, ImageAnalysisResponse } from '../types';

interface ExtractedInfoCardProps {
  data: ImageAnalysisResponse['extractedData'];
  imageBase64?: string;
  imageContentType?: string;
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

export function ExtractedInfoCard({
  data,
  imageBase64,
  imageContentType,
  onConfirm,
  onEdit,
  onDismiss,
}: ExtractedInfoCardProps) {
  const handleConfirm = () => {
    const request: CreateItemRequest = {
      name: data.name ?? '',
      category: data.category ?? 'other',
      expiryDate: data.expiryDate ?? '',
      brand: data.brand,
    };
    if (data.subcategory) {
      request.subcategory = data.subcategory;
    }
    // 이미지 포함
    if (imageBase64 && imageContentType) {
      request.imageBase64 = imageBase64;
      request.imageContentType = imageContentType as 'image/jpeg' | 'image/png' | 'image/webp';
    }
    onConfirm(request);
  };

  const hasName = Boolean(data.name);
  const hasExpiryDate = Boolean(data.expiryDate);
  const canConfirm = hasName && hasExpiryDate;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-900 mb-3">분석 결과</p>

      <div className="space-y-2 text-sm">
        {data.name && (
          <div className="flex justify-between">
            <span className="text-gray-400">이름</span>
            <span className="text-gray-900 font-medium">{data.name}</span>
          </div>
        )}
        {data.brand && (
          <div className="flex justify-between">
            <span className="text-gray-400">브랜드</span>
            <span className="text-gray-900">{data.brand}</span>
          </div>
        )}
        {data.category && (
          <div className="flex justify-between">
            <span className="text-gray-400">카테고리</span>
            <span className="text-gray-900">{categoryLabel[data.category] ?? data.category}</span>
          </div>
        )}
        {data.expiryDate && (
          <div className="flex justify-between">
            <span className="text-gray-400">만료일</span>
            <span className="text-gray-900">{data.expiryDate}</span>
          </div>
        )}
      </div>

      {(!hasName || !hasExpiryDate) && (
        <p className="mt-3 text-xs text-gray-400">
          일부 정보가 추출되지 않았습니다.
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 min-h-[44px] rounded-lg bg-gray-900 text-white text-xs font-medium disabled:bg-gray-200 disabled:text-gray-400 hover:opacity-80 transition-opacity"
        >
          등록
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 min-h-[44px] rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"
        >
          수정
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 min-h-[44px] rounded-lg text-gray-400 text-xs font-medium hover:text-gray-600"
        >
          취소
        </button>
      </div>
    </div>
  );
}
