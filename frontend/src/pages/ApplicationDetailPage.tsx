import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Application, AuditEntry, DocumentVersion, Document } from '../lib/types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatBytes, getApiErrorMessage } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

function ActionPanel({ app, onAction }: { app: Application; onAction: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');

  const transition = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: object }) =>
      api.post(`/applications/${app.id}/${action}`, body ?? {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['application', app.id] }); onAction(); },
    onError: (err) => {
      const msg = getApiErrorMessage(err);
      if (msg.includes('STALE_VERSION') || (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code === 'STALE_VERSION') {
        toast.error('This application was updated by someone else. Please refresh and try again.');
      } else {
        toast.error(msg);
      }
    },
  });

  const role = user?.role;
  const status = app.status;

  if (role === 'APPLICANT' && status === 'DRAFT') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Actions</h3>
        <button
          onClick={() => transition.mutate({ action: 'submit' })}
          disabled={transition.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {transition.isPending ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    );
  }

  if (role === 'REVIEWER' && status === 'SUBMITTED') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Actions</h3>
        <button
          onClick={() => transition.mutate({ action: 'pickup' })}
          disabled={transition.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Pick Up for Review
        </button>
      </div>
    );
  }

  if (role === 'REVIEWER' && status === 'UNDER_REVIEW') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-medium text-gray-900">Reviewer Actions</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes…"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => transition.mutate({ action: 'recommend', body: { notes } })}
            disabled={transition.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            Recommend
          </button>
          <button
            onClick={() => {
              if (!notes.trim()) { toast.error('Notes required when requesting information'); return; }
              transition.mutate({ action: 'request-info', body: { notes } });
            }}
            disabled={transition.isPending}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            Request Info
          </button>
        </div>
      </div>
    );
  }

  if (role === 'APPLICANT' && status === 'RETURNED_FOR_INFO') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Actions</h3>
        <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3 mb-4">
          Additional information has been requested. Upload any missing documents then resubmit.
        </p>
        <button
          onClick={() => transition.mutate({ action: 'resubmit' })}
          disabled={transition.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Resubmit
        </button>
      </div>
    );
  }

  if (role === 'DECISION_MAKER' && status === 'PENDING_DECISION') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-medium text-gray-900">Decision</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Decision notes…"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => transition.mutate({ action: 'decide', body: { decision: 'APPROVED', notes } })}
            disabled={transition.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            Approve
          </button>
          <button
            onClick={() => transition.mutate({ action: 'decide', body: { decision: 'REJECTED', notes } })}
            disabled={transition.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            Reject
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function DocumentsTab({ appId }: { appId: string }) {
  const { data: slots = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents', appId],
    queryFn: () => api.get(`/applications/${appId}/documents`).then((r) => r.data),
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadSlot, setUploadSlot] = useState('');
  const qc = useQueryClient();

  async function handleUpload(slot: string, file: File) {
    setUploading(slot);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/applications/${appId}/documents/${slot}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['documents', appId] });
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setUploading(null);
    }
  }

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading documents…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="slotName" className="block text-sm font-medium text-gray-700 mb-1">Upload new document slot</label>
          <input
            id="slotName"
            value={uploadSlot}
            onChange={(e) => setUploadSlot(e.target.value)}
            placeholder="e.g. incorporation_certificate"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          {uploading === uploadSlot ? 'Uploading…' : 'Choose File'}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            disabled={!uploadSlot || !!uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && uploadSlot) handleUpload(uploadSlot.trim(), file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {slots.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-4">
          {slots.map((slot) => (
            <SlotCard key={slot.id} slot={slot} appId={appId} onUpload={handleUpload} uploading={uploading} />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCard({ slot, appId, onUpload, uploading }: {
  slot: Document;
  appId: string;
  onUpload: (slot: string, file: File) => void;
  uploading: string | null;
}) {
  const { data: versions = [] } = useQuery<DocumentVersion[]>({
    queryKey: ['doc-versions', slot.id],
    queryFn: () => api.get(`/applications/${appId}/documents/${slot.slot}`).then((r) => r.data),
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{slot.slot.replace(/_/g, ' ')}</span>
        <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium">
          Upload new version
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            disabled={!!uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(slot.slot, file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <div className="divide-y divide-gray-100">
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <span className="font-medium text-gray-800">{v.filenameOriginal}</span>
              <span className="text-gray-400 text-xs ml-2">v{v.versionNumber} · {formatBytes(v.sizeBytes)}</span>
            </div>
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/applications/${appId}/documents/${slot.slot}/versions/${v.id}/download`}
              className="text-blue-600 hover:underline text-xs"
              target="_blank"
              rel="noreferrer"
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ appId }: { appId: string }) {
  const { data, isLoading } = useQuery<[AuditEntry[], number]>({
    queryKey: ['audit', appId],
    queryFn: () => api.get(`/audit/applications/${appId}`).then((r) => r.data),
  });

  const [entries, total] = data ?? [[], 0];

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading audit trail…</div>;
  if (entries.length === 0) return <div className="p-6 text-gray-400 text-sm text-center">No audit entries.</div>;

  return (
    <div className="p-6">
      <p className="text-xs text-gray-400 mb-4">{total} total entries</p>
      <ol className="relative border-l border-gray-200 space-y-4">
        {entries.map((entry) => (
          <li key={entry.id} className="ml-4">
            <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500" />
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-gray-800">{entry.action.replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-400">{formatDate(entry.occurredAt)}</span>
            </div>
            {entry.stateBefore && entry.stateAfter && (
              <p className="text-xs text-gray-500 mt-0.5">
                {entry.stateBefore} → {entry.stateAfter}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{entry.rowHash.slice(0, 16)}…</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'overview' | 'documents' | 'audit'>('overview');
  const qc = useQueryClient();

  const { data: app, isLoading, error } = useQuery<Application>({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then((r) => r.data),
  });

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}</div>;
  }
  if (error || !app) {
    return <div className="text-red-500 text-sm">Failed to load application.</div>;
  }

  const tabs = ['overview', 'documents', 'audit'] as const;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{app.bankName}</h1>
          <p className="text-gray-500 text-sm">{app.licenceType.replace(/_/g, ' ')}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {tab === 'overview' && (
              <dl className="divide-y divide-gray-100 text-sm">
                {[
                  ['Capital Amount', `RWF ${Number(app.capitalAmount).toLocaleString()}`],
                  ['Address', app.address || '—'],
                  ['Status', app.status],
                  ['Submitted', formatDate(app.submittedAt)],
                  ['Decided', formatDate(app.decidedAt)],
                  ['Decision Notes', app.decisionNotes || '—'],
                  ['Version', app.version],
                ].map(([k, v]) => (
                  <div key={k as string} className="grid grid-cols-2 px-6 py-3">
                    <dt className="text-gray-500">{k as string}</dt>
                    <dd className="text-gray-900">{v as string}</dd>
                  </div>
                ))}
              </dl>
            )}
            {tab === 'documents' && <DocumentsTab appId={app.id} />}
            {tab === 'audit' && <AuditTab appId={app.id} />}
          </div>
        </div>
        <div>
          <ActionPanel app={app} onAction={() => qc.invalidateQueries({ queryKey: ['application', id] })} />
        </div>
      </div>
    </div>
  );
}
