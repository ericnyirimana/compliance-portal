import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="h-14 bg-bnr-light border-b border-bnr-muted flex items-center justify-between px-6">
      {/* Left: breadcrumb placeholder */}
      <div />

      {/* Right: user + logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: '#5C3B0E' }}
          >
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-bnr-text leading-tight">{user?.email}</p>
            <p className="text-[10px] text-bnr-subtle uppercase tracking-wide leading-tight">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-bnr-subtle hover:text-red-600 transition-colors font-medium"
          aria-label="Logout"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
