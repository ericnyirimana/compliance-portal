import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const allLinks = [
  { to: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard, roles: ['APPLICANT', 'REVIEWER', 'DECISION_MAKER', 'ADMIN'] },
  { to: '/applications', label: 'Applications',    icon: FileText,        roles: ['APPLICANT', 'REVIEWER', 'DECISION_MAKER'] },
  { to: '/admin/users',  label: 'User Management', icon: Users,           roles: ['ADMIN'] },
  { to: '/audit/verify', label: 'Audit Integrity', icon: ShieldCheck,     roles: ['ADMIN', 'REVIEWER', 'DECISION_MAKER'] },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const links = allLinks.filter((l) => user && l.roles.includes(user.role));

  return (
    <aside className="w-64 flex flex-col min-h-screen" style={{ backgroundColor: '#5C3B0E' }}>
      {/* Logo / branding */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* BNR emblem placeholder */}
          <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black leading-none">BNR</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">NATIONAL BANK</p>
            <p className="text-white/60 text-[10px] leading-tight uppercase tracking-wide">OF RWANDA</p>
          </div>
        </div>
        <p className="text-white/40 text-[10px] mt-3 uppercase tracking-widest">Licensing Portal</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User role chip at bottom */}
      {user && (
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
              {user.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-medium truncate">{user.email}</p>
              <p className="text-white/50 text-[10px] uppercase tracking-wide">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
