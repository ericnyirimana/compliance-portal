export type Role = 'APPLICANT' | 'REVIEWER' | 'DECISION_MAKER' | 'ADMIN';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'RETURNED_FOR_INFO'
  | 'PENDING_DECISION'
  | 'APPROVED'
  | 'REJECTED';

export type LicenceType =
  | 'COMMERCIAL_BANK'
  | 'MICROFINANCE'
  | 'FOREX_BUREAU'
  | 'PAYMENT_INSTITUTION';

export interface Application {
  id: string;
  bankName: string;
  licenceType: LicenceType;
  capitalAmount: string;
  address: string | null;
  status: ApplicationStatus;
  version: number;
  applicantId: string;
  reviewerId: string | null;
  decisionMakerId: string | null;
  decisionNotes: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorUserId: string | null;
  action: string;
  applicationId: string | null;
  stateBefore: string | null;
  stateAfter: string | null;
  payload: Record<string, unknown> | null;
  occurredAt: string;
  requestId: string | null;
  ip: string | null;
  prevHash: string;
  rowHash: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  filenameOriginal: string;
  mimeType: string;
  sizeBytes: string;
  uploadedById: string;
  createdAt: string;
}

export interface Document {
  id: string;
  applicationId: string;
  slot: string;
  currentVersionNumber: number;
  createdAt: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    request_id: string;
    details: Record<string, unknown>;
  };
}
