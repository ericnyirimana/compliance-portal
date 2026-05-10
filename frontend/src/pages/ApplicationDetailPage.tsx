import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Application, AuditEntry, DocumentVersion, Document } from '../lib/types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatBytes, getApiErrorMessage } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const BNR_BTN = 'w-full text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60 transition-opacity hover:opacity-90';
const TEXTAREA = 'w-full rounded-lg border border-bnr-muted bg-white px-3 py-2 text-sm resize-none text-bnr-text focus:outline-none focus:ring-2 focus:ring-bnr-dark/40';

function ActionPanel({ app, onAction }: { app: Application; onAction: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');

  const transition = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: object }) =>
      api.post(`/applications/${app.id}/${action}`, body ?? {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['application', app.id] }); onAction(); },
    onError: (err) => {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        .response?.data?.error?.code;
      if (code === 'STALE_VERSION') {
        toast.error('Application was updated by someone else — please refresh and try again.');
      } else {
        toast.error(getApiErrorMessage(err));
      }
    },
  });

  const role = user?.role;
  const status = app.status;

  if (role === 'APPLICANT' && status === 'DRAFT') {
    return (
      <div className="bg-bnr-light rounded-xl border border-bnr-muted p-5">
        <h3 className="font-semibold text-bnr-text mb-4 text-sm uppercase tracking-wide">Actions</h3>
        <button
          onClick={() => transition.mutate({ action: 'submit' })}
          disabled={transition.isPending}
          className={BNR_BTN}
          style={{ backgroundColor: '#5C3B0E' }}
        >
          {transition.isPending ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    );
  }

  if (role === 'REVIEWER' && status === 'SUBMITTED') {
    return (
      <div className="bg-bnr-light rounded-xl border border-bnr-muted p-5">
        <h3 className="font-semibold text-bnr-text mb-4 text-sm uppercase tracking-wide">Actions</h3>
        <button
          onClick={() => transition.mutate({ action: 'pickup' })}
          disabled={transition.isPending}
          className={BNR_BTN}
          style={{ backgroundColor: '#5C3B0E' }}
        >
          {transition.isPending ? 'Picking up…' : 'Pick Up for Review'}
        </button>
      </div>
    );
  }

  if (role === 'REVIEWER' && status === 'UNDER_REVIEW') {
    return (
      <div className="bg-bnr-light rounded-xl border border-bnr-muted p-5 space-y-4">
        <h3 className="font-semibold text-bnr-text text-sm uppercase tracking-wide">Reviewer Actions</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add review notes…"
          rows={4}
          className={TEXTAREA}
        />
        <div className="flex gap-2">
          <button
            onClick={() => transition.mutate({ action: 'recommend', body: { notes } })}
            disabled={transition.isPending}
            className="flex-1 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 bg-green-700 hover:bg-green-800"
          >
            Recommend
          </button>
          <button
            onClick={() => {
              if (!notes.trim()) { toast.error('Notes required when requesting information'); return; }
              transition.mutate({ action: 'request-info', body: { notes } });
            }}
            disabled={transition.isPending}
            className="flex-1 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 bg-amber-700 hover:bg-amber-800"
          >
            Request Info
          </button>
        </div>
      </div>
    );
  }

  if (role === 'APPLICANT' && status === 'RETURNED_FOR_INFO') {
    return (
      <div className="bg-bnr-light rounded-xl border border-bnr-muted p-5 space-y-4">
        <h3 className="font-semibold text-bnr-text text-sm uppercase tracking-wide">Actions</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          Additional information has been requested by the reviewer. Upload any missing documents, then resubmit.
        </div>
        <button
          onClick={() => transition.mutate({ action: 'resubmit' })}
          disabled={transition.isPending}
          className={BNR_BTN}
          style={{ backgroundColor: '#5C3B0E' }}
        >
          {transition.isPending ? 'Resubmitting…' : 'Resubmit'}
        </button>
      </div>
    );
  }

  if (role === 'DECISION_MAKER' && status === 'PENDING_DECISION') {
    return (
      <div className="bg-bnr-light rounded-xl border border-bnr-muted p-5 space-y-4">
        <h3 className="font-semibold text-bnr-text text-sm uppercase tracking-wide">Issue Decision</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Decision notes…"
          rows={4}
          className={TEXTAREA}
        />
        <div className="flex gap-2">
          <button
            onClick={() => transition.mutate({ action: 'decide', body: { decision: 'APPROVED', notes } })}
            disabled={transition.isPending}
            className="flex-1 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 bg-green-700 hover:bg-green-800"
          >
            Approve
          </button>
          <button
            onClick={() => transition.mutate({ action: 'decide', body: { decision: 'REJECTED', notes } })}
            disabled={transition.isPending}
            className="flex-1 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 bg-red-700 hover:bg-red-800"
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

  if (isLoading) return <div className="p-6 text-bnr-subtle text-sm">Loading documents…</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Upload new slot */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="slotName" className="block text-sm font-medium text-bnr-text mb-1">
            New document slot name
          </label>
          <input
            id="slotName"
            value={uploadSlot}
            onChange={(e) => setUploadSlot(e.target.value)}
            placeholder="e.g. incorporation_certificate"
            className="w-full rounded-lg border border-bnr-muted bg-white px-3 py-2 text-sm text-bnr-text focus:outline-none focus:ring-2 focus:ring-bnr-dark/40"
          />
        </div>
        <label
          className="cursor-pointer text-white px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#5C3B0E' }}
        >
          {uploading === uploadSlot ? 'Uploading…' : 'Upload File'}
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
        <p className="text-bnr-subtle text-sm text-center py-8">No documents uploaded yet.</p>
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

  async function downloadVersion(versionId: string, filename: string) {
    try {
      const resp = await api.get(
        `/applications/${appId}/documents/${slot.slot}/versions/${versionId}/download`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(resp.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  }

  return (
    <div className="border border-bnr-muted rounded-lg overflow-hidden">
      <div className="bg-bnr-cream px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-bnr-text capitalize">
          {slot.slot.replace(/_/g, ' ')}
        </span>
        <label className="cursor-pointer text-xs font-medium text-bnr-brown hover:text-bnr-dark transition-colors">
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
      <div className="divide-y divide-bnr-muted/60">
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between px-4 py-2.5 text-sm bg-bnr-light">
            <div>
              <span className="font-medium text-bnr-text">{v.filenameOriginal}</span>
              <span className="text-bnr-subtle text-xs ml-2">v{v.versionNumber} · {formatBytes(v.sizeBytes)}</span>
            </div>
            <button
              onClick={() => downloadVersion(v.id, v.filenameOriginal)}
              className="text-xs font-medium text-bnr-brown hover:underline"
            >
              Download
            </button>
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

  if (isLoading) return <div className="p-6 text-bnr-subtle text-sm">Loading audit trail…</div>;
  if (entries.length === 0) return <div className="p-6 text-bnr-subtle text-sm text-center">No audit entries.</div>;

  return (
    <div className="p-6">
      <p className="text-xs text-bnr-subtle mb-4">{total} entries in audit trail</p>
      <ol className="relative border-l-2 border-bnr-muted space-y-5">
        {entries.map((entry) => (
          <li key={entry.id} className="ml-5">
            <span
              className="absolute -left-2 h-4 w-4 rounded-full border-2 border-bnr-light"
              style={{ backgroundColor: '#5C3B0E' }}
            />
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-bnr-text">
                {entry.action.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-bnr-subtle">{formatDate(entry.occurredAt)}</span>
            </div>
            {entry.stateBefore && entry.stateAfter && (
              <p className="text-xs text-bnr-subtle mt-0.5">
                {entry.stateBefore} → {entry.stateAfter}
              </p>
            )}
            <p className="text-[10px] text-bnr-muted mt-0.5 font-mono">
              {entry.rowHash.slice(0, 20)}…
            </p>
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
    return (
      <div className="space-y-4 max-w-4xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-bnr-muted/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (error || !app) {
    return <div className="text-red-600 text-sm">Failed to load application.</div>;
  }

  const tabs = ['overview', 'documents', 'audit'] as const;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-bnr-text">{app.bankName}</h1>
          <p className="text-bnr-subtle text-sm">{app.licenceType.replace(/_/g, ' ')}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b-2 border-bnr-muted">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold capitalize border-b-2 -mb-0.5 transition-colors ${
              tab === t
                ? 'border-bnr-dark text-bnr-dark'
                : 'border-transparent text-bnr-subtle hover:text-bnr-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content + action panel */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-bnr-light rounded-xl border border-bnr-muted overflow-hidden">
            {tab === 'overview' && (
              <dl className="divide-y divide-bnr-muted/60 text-sm">
                {[
                  ['Capital Amount', `RWF ${Number(app.capitalAmount).toLocaleString()}`],
                  ['Address', app.address || '—'],
                  ['Status', app.status],
                  ['Submitted', formatDate(app.submittedAt)],
                  ['Decided', formatDate(app.decidedAt)],
                  ['Decision Notes', app.decisionNotes || '—'],
                  ['Optimistic Version', String(app.version)],
                ].map(([k, v]) => (
                  <div key={k as string} className="grid grid-cols-2 px-6 py-3">
                    <dt className="text-bnr-subtle font-medium">{k as string}</dt>
                    <dd className="text-bnr-text">{v as string}</dd>
                  </div>
                ))}
              </dl>
            )}
            {tab === 'documents' && <DocumentsTab appId={app.id} />}
            {tab === 'audit' && <AuditTab appId={app.id} />}
          </div>
        </div>

        <div>
          <ActionPanel
            app={app}
            onAction={() => qc.invalidateQueries({ queryKey: ['application', id] })}
          />
        </div>
      </div>
    </div>
  );
}
