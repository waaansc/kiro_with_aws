import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/', label: '대시보드' },
  { to: '/chat', label: '채팅' },
  { to: '/archive', label: '아카이브' },
];

/**
 * 하단 네비게이션 바 컴포넌트
 * - 대시보드, 채팅, 아카이브 3탭
 * - 최소 44px x 44px 탭 대상 (Requirement 10.2)
 * - 활성 탭 하이라이트
 * - 고정 위치(fixed bottom)
 */
export function BottomNavigation() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50"
      aria-label="메인 네비게이션"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 text-sm transition-colors ${
              isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`
          }
          aria-current={undefined}
        >
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
