import { Badge } from './ui/Badge';
import { statusVariant } from '../lib/utils';
import { ApplicationStatus } from '../lib/types';

const labels: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  RETURNED_FOR_INFO: 'Info Requested',
  PENDING_DECISION: 'Pending Decision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={statusVariant(status)}>{labels[status]}</Badge>;
}
