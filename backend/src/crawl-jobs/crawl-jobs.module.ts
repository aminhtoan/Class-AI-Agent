import { Module } from '@nestjs/common';
import { CrawlJobsController } from './crawl-jobs.controller';
import { CrawlJobsService } from './crawl-jobs.service';

@Module({
  controllers: [CrawlJobsController],
  providers: [CrawlJobsService],
  exports: [CrawlJobsService],
})
export class CrawlJobsModule {}
