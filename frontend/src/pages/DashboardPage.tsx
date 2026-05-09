import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Application } from '../lib/types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/utils';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications').then((r) => r.data),
  });

  const stats = {
    total: applications.length,
    underReview: applications.filter((a) => a.status === 'UNDER_REVIEW').length,
    pending: applications.filter((a) => a.status === 'PENDING_DECISION').length,
    approved: applications.filter((a) => a.status === 'APPROVED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome, {user?.email}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Applications', value: stats.total, color: 'text-blue-600' },
            { label: 'Under Review', value: stats.underReview, color: 'text-yellow-600' },
            { label: 'Pending Decision', value: stats.pending, color: 'text-orange-600' },
            { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {user?.role === 'APPLICANT' && (
        <Link
          to="/applications/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Application
        </Link>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Recent Applications</h2>
        </div>
        {applications.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No applications yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-6 py-3 font-medium">Bank Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.slice(0, 5).map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link to={`/applications/${app.id}`} className="text-blue-600 hover:underline font-medium">
                      {app.bankName}
                    </Link>
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-6 py-3 text-gray-500">{formatDate(app.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
