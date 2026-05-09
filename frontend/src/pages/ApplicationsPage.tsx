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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
        {user?.role === 'APPLICANT' && (
          <Link
            to="/applications/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Application
          </Link>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading && (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <div className="p-8 text-center text-red-500 text-sm">Failed to load applications.</div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm">No applications found.</div>
        )}
        {!isLoading && !error && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-6 py-3 font-medium">Bank Name</th>
                <th className="px-6 py-3 font-medium">Licence Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
                <th className="px-6 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link to={`/applications/${app.id}`} className="text-blue-600 hover:underline font-medium">
                      {app.bankName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{app.licenceType.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-6 py-3 text-gray-500">{formatDate(app.submittedAt)}</td>
                  <td className="px-6 py-3 text-gray-500">{formatDate(app.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
