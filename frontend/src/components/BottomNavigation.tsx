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

export function BottomNavigation() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-14 z-50"
      aria-label="메인 네비게이션"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 text-sm transition-colors ${
              isActive ? 'text-gray-900 font-semibold' : 'text-gray-400 font-normal'
            }`
          }
        >
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
