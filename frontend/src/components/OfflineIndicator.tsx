interface OfflineIndicatorProps {
  isOffline: boolean;
}

export function OfflineIndicator({ isOffline }: OfflineIndicatorProps) {
  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="text-xs text-gray-400 text-center py-2 mb-4"
    >
      오프라인 상태입니다. 캐시된 데이터를 표시합니다.
    </div>
  );
}
