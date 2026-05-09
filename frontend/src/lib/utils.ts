import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ApplicationStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusVariant(status: ApplicationStatus) {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'error';
    case 'PENDING_DECISION': return 'warning';
    case 'UNDER_REVIEW': return 'info';
    case 'RETURNED_FOR_INFO': return 'warning';
    default: return 'default';
  }
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatBytes(bytes: string | number) {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function getApiErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response: { data: { error: { message: string } } } }).response;
    return r?.data?.error?.message || 'An error occurred';
  }
  return 'An error occurred';
}
