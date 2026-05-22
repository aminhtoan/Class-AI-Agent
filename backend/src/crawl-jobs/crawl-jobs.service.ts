import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlerService } from '../crawlers/crawler.service';
import { CreateCrawlJobDto, CrawlMode } from './dto/create-crawl-job.dto';

export interface CrawlJobResponse {
  id: string;
  storyId: string;
  status: string;
  mode: string;
  progressTotal: number;
  progressDone: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class CrawlJobsService {
  private readonly logger = new Logger(CrawlJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlerService: CrawlerService,
  ) {}

  async createCrawlJob(
    storyId: string,
    dto: CreateCrawlJobDto,
  ): Promise<CrawlJobResponse> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    const runningJob = await this.prisma.crawlJob.findFirst({
      where: {
        storyId,
        status: { in: ['pending', 'running'] },
      },
    });

    if (runningJob) {
      throw new ConflictException({
        code: 'CRAWL_JOB_IN_PROGRESS',
        message: 'A crawl job is already in progress for this story',
      });
    }

    const crawlJob = await this.prisma.crawlJob.create({
      data: {
        storyId,
        status: 'pending',
        progressTotal: 0,
        progressDone: 0,
      },
    });

    await this.prisma.story.update({
      where: { id: storyId },
      data: { status: 'crawling' },
    });

    this.executeCrawlAsync(crawlJob.id, dto.mode);

    return this.mapCrawlJob(crawlJob, dto.mode);
  }

  private executeCrawlAsync(jobId: string, mode: CrawlMode): void {
    setImmediate(async () => {
      try {
        await this.crawlerService.executeCrawlJob(jobId, mode);
      } catch (error) {
        this.logger.error(`Failed to execute crawl job ${jobId}:`, error);
      }
    });
  }

  async getCrawlJobsByStoryId(storyId: string): Promise<CrawlJobResponse[]> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    const crawlJobs = await this.prisma.crawlJob.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
    });

    return crawlJobs.map((job) => this.mapCrawlJob(job));
  }

  async getCrawlJobById(id: string): Promise<CrawlJobResponse> {
    const crawlJob = await this.prisma.crawlJob.findUnique({
      where: { id },
    });

    if (!crawlJob) {
      throw new NotFoundException({
        code: 'CRAWL_JOB_NOT_FOUND',
        message: 'Crawl job not found',
      });
    }

    return this.mapCrawlJob(crawlJob);
  }

  async cancelCrawlJob(id: string): Promise<CrawlJobResponse> {
    const crawlJob = await this.prisma.crawlJob.findUnique({
      where: { id },
    });

    if (!crawlJob) {
      throw new NotFoundException({
        code: 'CRAWL_JOB_NOT_FOUND',
        message: 'Crawl job not found',
      });
    }

    const finishedStatuses = ['succeeded', 'failed', 'cancelled'];
    if (finishedStatuses.includes(crawlJob.status)) {
      throw new ConflictException({
        code: 'CANNOT_CANCEL_FINISHED_JOB',
        message: 'Cannot cancel a finished job',
      });
    }

    const updatedJob = await this.prisma.crawlJob.update({
      where: { id },
      data: {
        status: 'cancelled',
        finishedAt: new Date(),
      },
    });

    return this.mapCrawlJob(updatedJob);
  }

  async getJobForProgress(id: string) {
    const crawlJob = await this.prisma.crawlJob.findUnique({
      where: { id },
    });

    if (!crawlJob) {
      throw new NotFoundException({
        code: 'CRAWL_JOB_NOT_FOUND',
        message: 'Crawl job not found',
      });
    }

    return {
      progressDone: crawlJob.progressDone,
      progressTotal: crawlJob.progressTotal,
      status: crawlJob.status,
    };
  }

  private mapCrawlJob(
    job: {
      id: string;
      storyId: string;
      status: string;
      progressTotal: number;
      progressDone: number;
      errorCode: string | null;
      errorMessage: string | null;
      startedAt: Date | null;
      finishedAt: Date | null;
      createdAt: Date;
    },
    mode: string = CrawlMode.TOC_AND_CHAPTERS,
  ): CrawlJobResponse {
    return {
      id: job.id,
      storyId: job.storyId,
      status: job.status,
      mode,
      progressTotal: job.progressTotal,
      progressDone: job.progressDone,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      createdAt: job.createdAt,
    };
  }
}
