import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { User } from '../lib/types';
import { Badge } from '../components/ui/Badge';
import { formatDate, getApiErrorMessage } from '../lib/utils';

export function AdminUsersPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}/status`, { isActive }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User status updated'); },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">User Management</h1>

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading && (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
          </div>
        )}
        {error && <div className="p-8 text-center text-red-500 text-sm">Failed to load users.</div>}
        {!isLoading && !error && users.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm">No users found.</div>
        )}
        {!isLoading && !error && users.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900">{u.email}</td>
                  <td className="px-6 py-3">
                    <Badge variant="info">{u.role.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={u.isActive ? 'success' : 'error'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                      disabled={toggleActive.isPending}
                      className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                        u.isActive
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
