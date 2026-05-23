import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  Sse,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  Observable,
  interval,
  map,
  takeWhile,
  startWith,
  switchMap,
} from 'rxjs';
import { buildSuccessResponse } from '../common/api-response';
import { PdfJobsService } from './pdf-jobs.service';
import { CreatePdfJobDto } from './dto/create-pdf-job.dto';

interface MessageEvent {
  data: string | object;
}

@ApiTags('pdf-jobs')
@Controller()
export class PdfJobsController {
  constructor(private readonly pdfJobsService: PdfJobsService) {}

  @Post('stories/:id/pdf-jobs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a PDF job for a story' })
  @ApiResponse({ status: 201, description: 'PDF job created' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  @ApiResponse({ status: 422, description: 'Validation error or no chapters' })
  async createPdfJob(
    @Param('id') storyId: string,
    @Body() dto: CreatePdfJobDto,
  ) {
    const job = await this.pdfJobsService.createPdfJob(storyId, dto);

    return buildSuccessResponse(job);
  }

  @Get('stories/:id/pdf-jobs')
  @ApiOperation({ summary: 'List PDF jobs for a story' })
  @ApiResponse({ status: 200, description: 'PDF job list' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async getPdfJobsByStory(@Param('id') storyId: string) {
    const jobs = await this.pdfJobsService.getPdfJobsByStoryId(storyId);

    return buildSuccessResponse(jobs);
  }

  @Get('pdf-jobs/:id')
  @ApiOperation({ summary: 'Get PDF job details' })
  @ApiResponse({ status: 200, description: 'PDF job detail' })
  @ApiResponse({ status: 404, description: 'PDF job not found' })
  async getPdfJob(@Param('id') id: string) {
    const job = await this.pdfJobsService.getPdfJobById(id);

    return buildSuccessResponse(job);
  }

  @Sse('pdf-jobs/:id/progress')
  @ApiOperation({ summary: 'Stream PDF job progress via SSE' })
  @ApiResponse({ status: 200, description: 'SSE stream' })
  @ApiResponse({ status: 404, description: 'PDF job not found' })
  streamProgress(@Param('id') id: string): Observable<MessageEvent> {
    const finishedStatuses = ['succeeded', 'failed', 'cancelled'];

    return interval(1000).pipe(
      startWith(0),
      switchMap(async () => {
        try {
          const progress = await this.pdfJobsService.getJobForProgress(id);
          return { success: true, data: progress };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }),
      map((result) => ({
        data: JSON.stringify(result.success ? result.data : { status: 'error', error: result.error }),
      })),
      takeWhile((event) => {
        const data = JSON.parse(event.data as string);
        if (data.status === 'error') return false;
        return !finishedStatuses.includes(data.status);
      }, true),
    );
  }

  @Get('pdf-files/:id/download')
  @ApiOperation({ summary: 'Download a PDF file' })
  @ApiResponse({ status: 200, description: 'PDF file stream' })
  @ApiResponse({ status: 404, description: 'PDF file not found' })
  @ApiResponse({ status: 410, description: 'PDF file expired' })
  @ApiResponse({ status: 500, description: 'Storage file missing' })
  async downloadPdfFile(@Param('id') id: string, @Res() res: Response) {
    const pdfFile = await this.pdfJobsService.getPdfFileById(id);
    const { stream, fileName } = await this.pdfJobsService.getFileStream(
      pdfFile,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.setHeader('Content-Length', pdfFile.fileSizeBytes);

    stream.pipe(res);
  }
}
