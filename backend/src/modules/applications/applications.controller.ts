import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { DecideApplicationDto } from './dto/decide-application.dto';
import { RequestInfoDto } from './dto/request-info.dto';
import { RecommendApplicationDto } from './dto/recommend-application.dto';

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

@ApiTags('applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(UserRole.APPLICANT)
  @ApiOperation({ summary: 'Create a new application (APPLICANT)' })
  create(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] as string;
    return this.applicationsService.create(dto, user, requestId, getIp(req));
  }

  @Get()
  @ApiOperation({ summary: 'List applications (own for APPLICANT, all for others)' })
  findAll(@CurrentUser() user: User) {
    return this.applicationsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.findOne(id, user);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get review history for an application' })
  getReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.getReviews(id, user);
  }

  @Post(':id/submit')
  @Roles(UserRole.APPLICANT)
  @ApiOperation({ summary: 'Submit a DRAFT application (APPLICANT)' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.applicationsService.submit(
      id, user, req.headers['x-request-id'] as string, getIp(req),
    );
  }

  @Post(':id/pickup')
  @Roles(UserRole.REVIEWER)
  @ApiOperation({ summary: 'Pick up a SUBMITTED application for review (REVIEWER)' })
  pickup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.applicationsService.pickup(
      id, user, req.headers['x-request-id'] as string, getIp(req),
    );
  }

  @Post(':id/request-info')
  @Roles(UserRole.REVIEWER)
  @ApiOperation({ summary: 'Request additional information (REVIEWER)' })
  requestInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestInfoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.applicationsService.requestInfo(
      id, user, dto, req.headers['x-request-id'] as string, getIp(req),
    );
  }

  @Post(':id/recommend')
  @Roles(UserRole.REVIEWER)
  @ApiOperation({ summary: 'Recommend application for decision (REVIEWER)' })
  recommend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecommendApplicationDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.applicationsService.recommend(
      id, user, dto, req.headers['x-request-id'] as string, getIp(req),
    );
  }

  @Post(':id/resubmit')
  @Roles(UserRole.APPLICANT)
  @ApiOperation({ summary: 'Resubmit after info was requested (APPLICANT)' })
  resubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.applicationsService.resubmit(
      id, user, req.headers['x-request-id'] as string, getIp(req),
    );
  }

  @Post(':id/decide')
  @Roles(UserRole.DECISION_MAKER)
  @ApiOperation({ summary: 'Issue final approval or rejection (DECISION_MAKER)' })
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideApplicationDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.applicationsService.decide(
      id, user, dto, req.headers['x-request-id'] as string, getIp(req),
    );
  }
}
