import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('applications/:applicationId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':slot')
  @ApiOperation({ summary: 'Upload a document to a slot (new version if slot exists)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      // No size limit here — we enforce it on the stream in the service
      // to reject mid-stream rather than buffering the whole file first.
      limits: { fileSize: undefined },
    }),
  )
  async upload(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('slot') slot: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string },
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const { Readable } = await import('stream');
    const stream = Readable.from(file.buffer);

    return this.documentsService.upload(
      applicationId,
      slot,
      stream,
      file.originalname,
      user,
      req.headers['x-request-id'] as string,
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown',
    );
  }

  @Get()
  @ApiOperation({ summary: 'List document slots for an application' })
  listSlots(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.listSlots(applicationId, user);
  }

  @Get(':slot')
  @ApiOperation({ summary: 'List all versions for a document slot' })
  listVersions(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('slot') slot: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.listVersions(applicationId, slot, user);
  }

  @Get(':slot/versions/:versionId/download')
  @ApiOperation({ summary: 'Download a specific document version (authenticated)' })
  async download(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('slot') slot: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { filePath, mimeType, filename } = await this.documentsService.download(
      applicationId,
      slot,
      versionId,
      user,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.sendFile(filePath, { root: '/' });
  }
}
