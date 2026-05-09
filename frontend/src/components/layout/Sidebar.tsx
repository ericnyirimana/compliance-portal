import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const allLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['APPLICANT', 'REVIEWER', 'DECISION_MAKER', 'ADMIN'] },
  { to: '/applications', label: 'Applications', icon: FileText, roles: ['APPLICANT', 'REVIEWER', 'DECISION_MAKER'] },
  { to: '/admin/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
  { to: '/audit/verify', label: 'Audit Integrity', icon: ShieldCheck, roles: ['ADMIN', 'REVIEWER', 'DECISION_MAKER'] },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const links = allLinks.filter((l) => user && l.roles.includes(user.role));

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-lg font-bold leading-tight">BNR Licensing</h1>
        <p className="text-xs text-gray-400 mt-0.5">Compliance Portal</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.pathname.startsWith(to)
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
