import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Application } from '../lib/types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/utils';
import { FileText, Eye, Clock, CheckCircle } from 'lucide-react';

const STAT_ITEMS = (stats: { total: number; underReview: number; pending: number; approved: number }) => [
  { label: 'Total Applications', value: stats.total,       icon: FileText,     color: 'text-bnr-dark'   },
  { label: 'Under Review',       value: stats.underReview, icon: Eye,          color: 'text-amber-700'  },
  { label: 'Pending Decision',   value: stats.pending,     icon: Clock,        color: 'text-orange-700' },
  { label: 'Approved',           value: stats.approved,    icon: CheckCircle,  color: 'text-green-700'  },
];

export function DashboardPage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications').then((r) => r.data),
  });

  const stats = {
    total:       applications.length,
    underReview: applications.filter((a) => a.status === 'UNDER_REVIEW').length,
    pending:     applications.filter((a) => a.status === 'PENDING_DECISION').length,
    approved:    applications.filter((a) => a.status === 'APPROVED').length,
  };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-bnr-text">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="text-bnr-subtle text-sm mt-0.5">
          Here's an overview of licensing activity.
        </p>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-bnr-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STAT_ITEMS(stats).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-bnr-light rounded-xl border border-bnr-muted p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-bnr-cream flex items-center justify-center flex-shrink-0">
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-bnr-subtle leading-tight">{label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New application CTA */}
      {user?.role === 'APPLICANT' && (
        <Link
          to="/applications/new"
          className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#5C3B0E' }}
        >
          + New Application
        </Link>
      )}

      {/* Recent applications table */}
      <div className="bg-bnr-light rounded-xl border border-bnr-muted overflow-hidden">
        <div className="px-6 py-4 border-b border-bnr-muted flex items-center justify-between">
          <h2 className="font-semibold text-bnr-text">Recent Applications</h2>
          <Link to="/applications" className="text-xs font-medium text-bnr-brown hover:underline">
            View all
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="p-12 text-center text-bnr-subtle text-sm">
            No applications yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bnr-cream text-bnr-subtle text-left">
                <th className="px-6 py-3 font-medium">Bank Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bnr-muted/60">
              {applications.slice(0, 5).map((app) => (
                <tr key={app.id} className="hover:bg-bnr-cream/50 transition-colors">
                  <td className="px-6 py-3">
                    <Link
                      to={`/applications/${app.id}`}
                      className="font-medium text-bnr-dark hover:underline"
                    >
                      {app.bankName}
                    </Link>
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-6 py-3 text-bnr-subtle">{formatDate(app.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
