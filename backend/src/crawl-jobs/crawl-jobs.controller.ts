import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Sse,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable, interval, map, takeWhile, startWith, switchMap } from 'rxjs';
import { buildSuccessResponse } from '../common/api-response';
import { CrawlJobsService } from './crawl-jobs.service';
import { CreateCrawlJobDto } from './dto/create-crawl-job.dto';

interface MessageEvent {
  data: string | object;
}

@ApiTags('crawl-jobs')
@Controller()
export class CrawlJobsController {
  constructor(private readonly crawlJobsService: CrawlJobsService) {}

  @Post('stories/:id/crawl-jobs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a crawl job for a story' })
  @ApiResponse({ status: 201, description: 'Crawl job created' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async createCrawlJob(
    @Param('id') storyId: string,
    @Body() dto: CreateCrawlJobDto,
  ) {
    const job = await this.crawlJobsService.createCrawlJob(storyId, dto);

    return buildSuccessResponse(job);
  }

  @Get('stories/:id/crawl-jobs')
  @ApiOperation({ summary: 'List crawl jobs for a story' })
  @ApiResponse({ status: 200, description: 'Crawl job list' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async getCrawlJobsByStory(@Param('id') storyId: string) {
    const jobs = await this.crawlJobsService.getCrawlJobsByStoryId(storyId);

    return buildSuccessResponse(jobs);
  }

  @Get('crawl-jobs/:id')
  @ApiOperation({ summary: 'Get crawl job details' })
  @ApiResponse({ status: 200, description: 'Crawl job detail' })
  @ApiResponse({ status: 404, description: 'Crawl job not found' })
  async getCrawlJob(@Param('id') id: string) {
    const job = await this.crawlJobsService.getCrawlJobById(id);

    return buildSuccessResponse(job);
  }

  @Post('crawl-jobs/:id/cancel')
  @ApiOperation({ summary: 'Cancel a crawl job' })
  @ApiResponse({ status: 200, description: 'Crawl job cancelled' })
  @ApiResponse({ status: 404, description: 'Crawl job not found' })
  @ApiResponse({ status: 409, description: 'Cannot cancel finished job' })
  async cancelCrawlJob(@Param('id') id: string) {
    const job = await this.crawlJobsService.cancelCrawlJob(id);

    return buildSuccessResponse(job);
  }

  @Sse('crawl-jobs/:id/progress')
  @ApiOperation({ summary: 'Stream crawl job progress via SSE' })
  @ApiResponse({ status: 200, description: 'SSE stream' })
  @ApiResponse({ status: 404, description: 'Crawl job not found' })
  streamProgress(@Param('id') id: string): Observable<MessageEvent> {
    const finishedStatuses = ['succeeded', 'failed', 'cancelled'];

    return interval(1000).pipe(
      startWith(0),
      switchMap(async () => {
        try {
          const progress = await this.crawlJobsService.getJobForProgress(id);
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
}
