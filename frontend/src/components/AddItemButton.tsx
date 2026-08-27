import { useNavigate } from 'react-router-dom';

export function AddItemButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/items/new')}
      className="fixed bottom-20 right-5 w-12 h-12 min-w-[44px] min-h-[44px] bg-gray-900 hover:opacity-80 text-white rounded-lg flex items-center justify-center transition-opacity duration-200"
      aria-label="아이템 추가"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
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
