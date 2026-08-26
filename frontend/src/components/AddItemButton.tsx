import { useNavigate } from 'react-router-dom';

/**
 * 아이템 추가 플로팅 액션 버튼
 * - 최소 44px x 44px 탭 대상
 * - 아이템 등록 폼으로 이동
 */
export function AddItemButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/items/new')}
      className="fixed bottom-20 right-4 w-14 h-14 min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      aria-label="아이템 추가"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
