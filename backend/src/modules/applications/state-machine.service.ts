import { ConflictException, Injectable } from '@nestjs/common';
import { ApplicationStatus } from './entities/application.entity';
import { UserRole } from '../users/entities/user.entity';

interface TransitionRule {
  from: ApplicationStatus;
  to: ApplicationStatus;
  allowedRoles: UserRole[];
  action: string;
}

const TRANSITIONS: TransitionRule[] = [
  {
    from: ApplicationStatus.DRAFT,
    to: ApplicationStatus.SUBMITTED,
    allowedRoles: [UserRole.APPLICANT],
    action: 'submit',
  },
  {
    from: ApplicationStatus.SUBMITTED,
    to: ApplicationStatus.UNDER_REVIEW,
    allowedRoles: [UserRole.REVIEWER],
    action: 'pickup',
  },
  {
    from: ApplicationStatus.UNDER_REVIEW,
    to: ApplicationStatus.RETURNED_FOR_INFO,
    allowedRoles: [UserRole.REVIEWER],
    action: 'request-info',
  },
  {
    from: ApplicationStatus.UNDER_REVIEW,
    to: ApplicationStatus.PENDING_DECISION,
    allowedRoles: [UserRole.REVIEWER],
    action: 'recommend',
  },
  {
    from: ApplicationStatus.RETURNED_FOR_INFO,
    to: ApplicationStatus.SUBMITTED,
    allowedRoles: [UserRole.APPLICANT],
    action: 'resubmit',
  },
  {
    from: ApplicationStatus.PENDING_DECISION,
    to: ApplicationStatus.APPROVED,
    allowedRoles: [UserRole.DECISION_MAKER],
    action: 'decide',
  },
  {
    from: ApplicationStatus.PENDING_DECISION,
    to: ApplicationStatus.REJECTED,
    allowedRoles: [UserRole.DECISION_MAKER],
    action: 'decide',
  },
];

export const TERMINAL_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.REJECTED,
];

@Injectable()
export class StateMachineService {
  isTerminal(status: ApplicationStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
  }

  /**
   * Returns the transition rule if valid, throws 409 otherwise.
   * Does NOT perform the transition — the caller saves the entity.
   */
  assertTransition(
    current: ApplicationStatus,
    next: ApplicationStatus,
    role: UserRole,
  ): TransitionRule {
    if (this.isTerminal(current)) {
      throw new ConflictException({
        code: 'TERMINAL_STATE',
        message: `Application is in terminal state ${current} and cannot be transitioned`,
      });
    }

    const rule = TRANSITIONS.find(
      (t) => t.from === current && t.to === next,
    );

    if (!rule) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Transition from ${current} to ${next} is not allowed`,
      });
    }

    if (!rule.allowedRoles.includes(role)) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Role ${role} cannot perform this transition`,
      });
    }

    return rule;
  }

  getValidTransitions(current: ApplicationStatus, role: UserRole): ApplicationStatus[] {
    if (this.isTerminal(current)) return [];
    return TRANSITIONS
      .filter((t) => t.from === current && t.allowedRoles.includes(role))
      .map((t) => t.to);
  }
}
