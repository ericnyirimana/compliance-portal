import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface VerifyResult {
  valid: boolean;
  totalRows: number;
  firstBrokenRowId?: string;
  firstBrokenPosition?: number;
}

export function AuditVerifyPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<VerifyResult>({
    queryKey: ['audit-verify'],
    queryFn: () => api.get('/audit/verify').then((r) => r.data),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-bnr-text">Audit Log Integrity</h1>
          <p className="text-bnr-subtle text-sm mt-0.5">Verifies the SHA-256 hash chain across all audit entries.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-sm font-semibold text-bnr-brown hover:text-bnr-dark transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Re-verify
        </button>
      </div>

      {isLoading && (
        <div className="bg-bnr-light rounded-xl border border-bnr-muted p-8 text-center text-bnr-subtle text-sm animate-pulse">
          Verifying hash chain…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to verify audit log. Ensure the backend is reachable.
        </div>
      )}

      {data && (
        <div
          className={`rounded-xl border p-6 ${
            data.valid
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-5">
            {data.valid
              ? <CheckCircle className="h-6 w-6 text-green-700 flex-shrink-0" />
              : <AlertTriangle className="h-6 w-6 text-red-700 flex-shrink-0" />}
            <h2 className={`font-bold text-base ${data.valid ? 'text-green-800' : 'text-red-800'}`}>
              {data.valid ? 'Hash chain is intact' : 'Integrity violation detected'}
            </h2>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-black/5">
              <dt className="text-gray-600 font-medium">Total entries verified</dt>
              <dd className="font-bold text-gray-900">{data.totalRows}</dd>
            </div>

            {!data.valid && (
              <>
                <div className="flex items-start justify-between py-2 border-b border-red-100">
                  <dt className="text-red-700 font-medium">First broken row ID</dt>
                  <dd className="font-mono text-xs text-red-900 ml-4 text-right break-all">
                    {data.firstBrokenRowId}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-red-700 font-medium">Position in chain</dt>
                  <dd className="font-bold text-red-900">#{data.firstBrokenPosition}</dd>
                </div>
              </>
            )}
          </dl>

          {data.valid && (
            <p className="mt-4 text-xs text-green-700">
              All {data.totalRows} audit entries form a valid SHA-256 chain. No tampering detected.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
