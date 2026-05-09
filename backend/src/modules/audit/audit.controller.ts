import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('verify')
  @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.DECISION_MAKER)
  @ApiOperation({ summary: 'Verify audit log hash chain integrity' })
  verify() {
    return this.auditService.verify();
  }

  @Get('applications/:applicationId')
  @ApiOperation({ summary: 'Get audit log for an application' })
  findByApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.findByApplication(applicationId, +limit, +offset);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.REVIEWER, UserRole.DECISION_MAKER)
  @ApiOperation({ summary: 'Get all audit log entries (paginated)' })
  findAll(
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.findAll(+limit, +offset);
  }
}
