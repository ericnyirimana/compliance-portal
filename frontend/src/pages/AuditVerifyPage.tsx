import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface VerifyResult {
  valid: boolean;
  totalRows: number;
  firstBrokenRowId?: string;
  firstBrokenPosition?: number;
}

export function AuditVerifyPage() {
  const { data, isLoading, error, refetch } = useQuery<VerifyResult>({
    queryKey: ['audit-verify'],
    queryFn: () => api.get('/audit/verify').then((r) => r.data),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Audit Log Integrity</h1>
        <button
          onClick={() => refetch()}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Re-verify
        </button>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm animate-pulse">
          Verifying hash chain…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 text-sm">
          Failed to verify audit log.
        </div>
      )}

      {data && (
        <div className={`rounded-xl border p-6 ${data.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            {data.valid
              ? <CheckCircle className="h-6 w-6 text-green-600" />
              : <AlertTriangle className="h-6 w-6 text-red-600" />}
            <h2 className={`font-semibold ${data.valid ? 'text-green-800' : 'text-red-800'}`}>
              {data.valid ? 'Hash chain is intact' : 'Hash chain integrity violation detected'}
            </h2>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Total entries verified</dt>
              <dd className="font-medium">{data.totalRows}</dd>
            </div>
            {!data.valid && (
              <>
                <div className="flex justify-between">
                  <dt className="text-red-700">First broken row ID</dt>
                  <dd className="font-mono text-xs text-red-800">{data.firstBrokenRowId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-red-700">Position in chain</dt>
                  <dd className="font-medium text-red-800">#{data.firstBrokenPosition}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
