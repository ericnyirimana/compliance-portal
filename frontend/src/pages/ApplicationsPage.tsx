import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Application, ApplicationStatus } from '../lib/types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const ALL_STATUSES: ApplicationStatus[] = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO',
  'PENDING_DECISION', 'APPROVED', 'REJECTED',
];

export function ApplicationsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');

  const { data: applications = [], isLoading, error } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications').then((r) => r.data),
  });

  const filtered = statusFilter
    ? applications.filter((a) => a.status === statusFilter)
    : applications;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-bnr-text">Applications</h1>
        {user?.role === 'APPLICANT' && (
          <Link
            to="/applications/new"
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#5C3B0E' }}
          >
            + New Application
          </Link>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            statusFilter === ''
              ? 'text-white border-transparent'
              : 'bg-bnr-light text-bnr-subtle border-bnr-muted hover:border-bnr-brown hover:text-bnr-text'
          }`}
          style={statusFilter === '' ? { backgroundColor: '#5C3B0E' } : {}}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              statusFilter === s
                ? 'text-white border-transparent'
                : 'bg-bnr-light text-bnr-subtle border-bnr-muted hover:border-bnr-brown hover:text-bnr-text'
            }`}
            style={statusFilter === s ? { backgroundColor: '#5C3B0E' } : {}}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-bnr-light rounded-xl border border-bnr-muted overflow-hidden">
        {isLoading && (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-bnr-muted/50 rounded animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <div className="p-8 text-center text-red-600 text-sm">Failed to load applications.</div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-12 text-center text-bnr-subtle text-sm">No applications found.</div>
        )}
        {!isLoading && !error && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bnr-cream text-bnr-subtle text-left">
                <th className="px-6 py-3 font-medium">Bank Name</th>
                <th className="px-6 py-3 font-medium">Licence Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
                <th className="px-6 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bnr-muted/60">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-bnr-cream/50 transition-colors">
                  <td className="px-6 py-3">
                    <Link
                      to={`/applications/${app.id}`}
                      className="font-medium text-bnr-dark hover:underline"
                    >
                      {app.bankName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-bnr-subtle">{app.licenceType.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-6 py-3 text-bnr-subtle">{formatDate(app.submittedAt)}</td>
                  <td className="px-6 py-3 text-bnr-subtle">{formatDate(app.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
