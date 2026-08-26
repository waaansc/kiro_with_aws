interface OfflineIndicatorProps {
  isOffline: boolean;
}

/**
 * 오프라인 상태 표시 배너 컴포넌트
 * - 네트워크 연결이 끊기고 캐시된 데이터를 표시 중일 때 노출
 */
export function OfflineIndicator({ isOffline }: OfflineIndicatorProps) {
  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="bg-amber-100 border border-amber-400 text-amber-800 px-4 py-2 text-center text-sm"
    >
      오프라인 상태입니다. 캐시된 데이터를 표시합니다.
    </div>
  );
}
