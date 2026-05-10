import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
} from './entities/application.entity';
import { Review, ReviewAction } from './entities/review.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { StateMachineService } from './state-machine.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { DecideApplicationDto } from './dto/decide-application.dto';
import { RequestInfoDto } from './dto/request-info.dto';
import { RecommendApplicationDto } from './dto/recommend-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly stateMachine: StateMachineService,
  ) {}

  async create(
    dto: CreateApplicationDto,
    user: User,
    requestId: string,
    ip: string,
  ): Promise<Application> {
    return this.dataSource.transaction(async (manager) => {
      const qr = manager.queryRunner!;

      const app = manager.create(Application, {
        applicantId: user.id,
        bankName: dto.bankName,
        licenceType: dto.licenceType,
        capitalAmount: String(dto.capitalAmount),
        address: dto.address,
        status: ApplicationStatus.DRAFT,
      });
      await manager.save(app);

      await this.auditService.write(
        {
          actorUserId: user.id,
          action: 'APPLICATION_CREATED',
          applicationId: app.id,
          stateBefore: undefined,
          stateAfter: ApplicationStatus.DRAFT,
          payload: { bankName: dto.bankName },
          requestId,
          ip,
        },
        qr,
      );

      return app;
    });
  }

  async findAll(user: User): Promise<Application[]> {
    const qb = this.appRepo.createQueryBuilder('app');

    if (user.role === UserRole.APPLICANT) {
      qb.where('app.applicant_id = :id', { id: user.id });
    }

    return qb.orderBy('app.created_at', 'DESC').getMany();
  }

  async findOne(id: string, user: User): Promise<Application> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) {
      throw new NotFoundException({ code: 'APPLICATION_NOT_FOUND', message: `Application ${id} not found` });
    }
    if (user.role === UserRole.APPLICANT && app.applicantId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }
    return app;
  }

  async submit(
    id: string,
    user: User,
    requestId: string,
    ip: string,
  ): Promise<Application> {
    return this.transitionWithOptimisticLock(
      id,
      user,
      ApplicationStatus.SUBMITTED,
      async (app, manager) => {
        // Applicants can only submit their own
        if (app.applicantId !== user.id) {
          throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        app.submittedAt = new Date();
        return {
          action: 'APPLICATION_SUBMITTED',
          payload: {},
          requestId,
          ip,
        };
      },
    );
  }

  async pickup(
    id: string,
    user: User,
    requestId: string,
    ip: string,
  ): Promise<Application> {
    return this.transitionWithOptimisticLock(
      id,
      user,
      ApplicationStatus.UNDER_REVIEW,
      async (app, manager) => {
        app.reviewerId = user.id;
        const review = manager.create(Review, {
          applicationId: id,
          reviewerId: user.id,
          action: ReviewAction.PICKED_UP,
          notes: 'Application picked up for review.',
        });
        await manager.save(review);
        return {
          action: 'APPLICATION_PICKED_UP',
          payload: { reviewerId: user.id },
          requestId,
          ip,
        };
      },
    );
  }

  async requestInfo(
    id: string,
    user: User,
    dto: RequestInfoDto,
    requestId: string,
    ip: string,
  ): Promise<Application> {
    return this.transitionWithOptimisticLock(
      id,
      user,
      ApplicationStatus.RETURNED_FOR_INFO,
      async (app, manager) => {
        const review = manager.create(Review, {
          applicationId: id,
          reviewerId: user.id,
          action: ReviewAction.REQUESTED_INFO,
          notes: dto.notes,
        });
        await manager.save(review);
        return {
          action: 'APPLICATION_RETURNED_FOR_INFO',
          payload: { notes: dto.notes },
          requestId,
          ip,
        };
      },
    );
  }

  async recommend(
    id: string,
    user: User,
    dto: RecommendApplicationDto,
    requestId: string,
    ip: string,
  ): Promise<Application> {
    return this.transitionWithOptimisticLock(
      id,
      user,
      ApplicationStatus.PENDING_DECISION,
      async (app, manager) => {
        const review = manager.create(Review, {
          applicationId: id,
          reviewerId: user.id,
          action: ReviewAction.RECOMMENDED_APPROVE,
          notes: dto.notes,
        });
        await manager.save(review);
        return {
          action: 'APPLICATION_RECOMMENDED',
          payload: { notes: dto.notes },
          requestId,
          ip,
        };
      },
    );
  }

  async resubmit(
    id: string,
    user: User,
    requestId: string,
    ip: string,
  ): Promise<Application> {
    return this.transitionWithOptimisticLock(
      id,
      user,
      ApplicationStatus.SUBMITTED,
      async (app) => {
        if (app.applicantId !== user.id) {
          throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        app.submittedAt = new Date();
        return {
          action: 'APPLICATION_RESUBMITTED',
          payload: {},
          requestId,
          ip,
        };
      },
    );
  }

  async decide(
    id: string,
    user: User,
    dto: DecideApplicationDto,
    requestId: string,
    ip: string,
  ): Promise<Application> {
    // Service-layer reviewer≠decision-maker check (DB trigger is belt-and-braces)
    const reviewCount = await this.reviewRepo.count({
      where: { applicationId: id, reviewerId: user.id },
    });
    if (reviewCount > 0) {
      throw new ForbiddenException({
        code: 'REVIEWER_IS_DECISION_MAKER',
        message: 'A reviewer cannot make the final decision on an application they reviewed',
      });
    }

    return this.transitionWithOptimisticLock(
      id,
      user,
      dto.decision,
      async (app) => {
        app.decisionMakerId = user.id;
        app.decisionNotes = dto.notes ?? null;
        app.decidedAt = new Date();
        return {
          action: dto.decision === ApplicationStatus.APPROVED
            ? 'APPLICATION_APPROVED'
            : 'APPLICATION_REJECTED',
          payload: { notes: dto.notes },
          requestId,
          ip,
        };
      },
    );
  }

  async getReviews(applicationId: string, user: User): Promise<Review[]> {
    await this.findOne(applicationId, user); // access check
    return this.reviewRepo.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Core optimistic-locking transition.
   *
   * Pattern:
   * 1. Fetch the application (outside transaction — for read)
   * 2. Assert state-machine transition
   * 3. Open a transaction
   * 4. UPDATE applications SET status=$next, version=version+1
   *    WHERE id=$id AND version=$currentVersion
   * 5. If 0 rows affected → 409 STALE_VERSION
   * 6. Optionally run the sideEffectFn (create Review, update timestamps, etc.)
   * 7. Write audit entry in the same transaction
   */
  private async transitionWithOptimisticLock(
    id: string,
    user: User,
    nextStatus: ApplicationStatus,
    sideEffectFn: (
      app: Application,
      manager: EntityManager,
    ) => Promise<{
      action: string;
      payload: Record<string, unknown>;
      requestId: string;
      ip: string;
    }>,
  ): Promise<Application> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) {
      throw new NotFoundException({ code: 'APPLICATION_NOT_FOUND', message: `Application ${id} not found` });
    }

    const currentStatus = app.status;
    const currentVersion = app.version;

    // This throws 409 on invalid transitions
    this.stateMachine.assertTransition(currentStatus, nextStatus, user.role);

    return this.dataSource.transaction(async (manager) => {
      const qr = manager.queryRunner!;

      // Conditional update for optimistic locking
      const result = await manager.query<{ id: string }[]>(
        `UPDATE applications
         SET status = $1, version = version + 1, updated_at = NOW()
         WHERE id = $2 AND version = $3
         RETURNING id`,
        [nextStatus, id, currentVersion],
      );

      if (!result || result.length === 0) {
        // Re-read to distinguish version conflict from invalid transition.
        // A version mismatch means concurrent modification → STALE_VERSION takes priority
        // regardless of what state the app is in now.
        const current = await manager.findOne(Application, { where: { id } });
        if (!current || current.version !== currentVersion) {
          throw new ConflictException({
            code: 'STALE_VERSION',
            message: 'Application was modified by another request. Please retry.',
          });
        }
        // Version unchanged but update still missed — re-run the state check to surface the right error
        this.stateMachine.assertTransition(current.status, nextStatus, user.role);
        throw new ConflictException({
          code: 'STALE_VERSION',
          message: 'Application was modified by another request. Please retry.',
        });
      }

      // Fetch updated application for sideEffectFn
      const updatedApp = await manager.findOne(Application, { where: { id } });

      // Run side effects (create Review row, set timestamps, etc.)
      const auditCtx = await sideEffectFn(updatedApp!, manager);

      // Persist any mutations made in sideEffectFn (e.g., updatedApp.submittedAt)
      await manager.save(updatedApp);

      // Write audit in same transaction
      await this.auditService.write(
        {
          actorUserId: user.id,
          action: auditCtx.action,
          applicationId: id,
          stateBefore: currentStatus,
          stateAfter: nextStatus,
          payload: auditCtx.payload,
          requestId: auditCtx.requestId,
          ip: auditCtx.ip,
        },
        qr,
      );

      return updatedApp!;
    });
  }
}
