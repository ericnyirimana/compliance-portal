import { Test } from '@nestjs/testing';
import { StateMachineService } from './state-machine.service';
import { ApplicationStatus } from './entities/application.entity';
import { UserRole } from '../users/entities/user.entity';
import { ConflictException } from '@nestjs/common';

describe('StateMachineService', () => {
  let svc: StateMachineService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [StateMachineService],
    }).compile();
    svc = module.get(StateMachineService);
  });

  // Valid transitions
  describe('assertTransition - valid', () => {
    it('APPLICANT: DRAFT → SUBMITTED', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED, UserRole.APPLICANT),
      ).not.toThrow();
    });

    it('REVIEWER: SUBMITTED → UNDER_REVIEW', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, UserRole.REVIEWER),
      ).not.toThrow();
    });

    it('REVIEWER: UNDER_REVIEW → RETURNED_FOR_INFO', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.RETURNED_FOR_INFO, UserRole.REVIEWER),
      ).not.toThrow();
    });

    it('REVIEWER: UNDER_REVIEW → PENDING_DECISION', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.PENDING_DECISION, UserRole.REVIEWER),
      ).not.toThrow();
    });

    it('APPLICANT: RETURNED_FOR_INFO → SUBMITTED (loop)', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.RETURNED_FOR_INFO, ApplicationStatus.SUBMITTED, UserRole.APPLICANT),
      ).not.toThrow();
    });

    it('DECISION_MAKER: PENDING_DECISION → APPROVED', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.PENDING_DECISION, ApplicationStatus.APPROVED, UserRole.DECISION_MAKER),
      ).not.toThrow();
    });

    it('DECISION_MAKER: PENDING_DECISION → REJECTED', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.PENDING_DECISION, ApplicationStatus.REJECTED, UserRole.DECISION_MAKER),
      ).not.toThrow();
    });
  });

  // Invalid transitions
  describe('assertTransition - invalid', () => {
    it('APPLICANT cannot pick up (SUBMITTED → UNDER_REVIEW)', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, UserRole.APPLICANT),
      ).toThrow(ConflictException);
    });

    it('REVIEWER cannot submit (DRAFT → SUBMITTED)', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED, UserRole.REVIEWER),
      ).toThrow(ConflictException);
    });

    it('APPLICANT cannot decide (PENDING_DECISION → APPROVED)', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.PENDING_DECISION, ApplicationStatus.APPROVED, UserRole.APPLICANT),
      ).toThrow(ConflictException);
    });

    it('DRAFT cannot jump to APPROVED directly', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.DRAFT, ApplicationStatus.APPROVED, UserRole.DECISION_MAKER),
      ).toThrow(ConflictException);
    });

    it('UNDER_REVIEW cannot go back to DRAFT', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.DRAFT, UserRole.REVIEWER),
      ).toThrow(ConflictException);
    });
  });

  // Terminal state immutability
  describe('assertTransition - terminal', () => {
    it('APPROVED is terminal — any transition throws TERMINAL_STATE', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.APPROVED, ApplicationStatus.DRAFT, UserRole.ADMIN),
      ).toThrow(ConflictException);
    });

    it('REJECTED is terminal — any transition throws TERMINAL_STATE', () => {
      expect(() =>
        svc.assertTransition(ApplicationStatus.REJECTED, ApplicationStatus.SUBMITTED, UserRole.APPLICANT),
      ).toThrow(ConflictException);
    });
  });

  describe('isTerminal', () => {
    it('APPROVED is terminal', () => expect(svc.isTerminal(ApplicationStatus.APPROVED)).toBe(true));
    it('REJECTED is terminal', () => expect(svc.isTerminal(ApplicationStatus.REJECTED)).toBe(true));
    it('DRAFT is not terminal', () => expect(svc.isTerminal(ApplicationStatus.DRAFT)).toBe(false));
    it('UNDER_REVIEW is not terminal', () => expect(svc.isTerminal(ApplicationStatus.UNDER_REVIEW)).toBe(false));
  });

  describe('getValidTransitions', () => {
    it('APPLICANT from DRAFT gets [SUBMITTED]', () => {
      expect(svc.getValidTransitions(ApplicationStatus.DRAFT, UserRole.APPLICANT)).toEqual([ApplicationStatus.SUBMITTED]);
    });
    it('REVIEWER from UNDER_REVIEW gets RETURNED_FOR_INFO and PENDING_DECISION', () => {
      const result = svc.getValidTransitions(ApplicationStatus.UNDER_REVIEW, UserRole.REVIEWER);
      expect(result).toContain(ApplicationStatus.RETURNED_FOR_INFO);
      expect(result).toContain(ApplicationStatus.PENDING_DECISION);
    });
    it('terminal state has no valid transitions', () => {
      expect(svc.getValidTransitions(ApplicationStatus.APPROVED, UserRole.DECISION_MAKER)).toEqual([]);
    });
  });
});
