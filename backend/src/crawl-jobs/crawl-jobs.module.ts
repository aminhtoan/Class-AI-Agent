import { Module } from '@nestjs/common';
import { CrawlJobsController } from './crawl-jobs.controller';
import { CrawlJobsService } from './crawl-jobs.service';
import { CrawlersModule } from '../crawlers/crawlers.module';

@Module({
  imports: [CrawlersModule],
  controllers: [CrawlJobsController],
  providers: [CrawlJobsService],
  exports: [CrawlJobsService],
})
export class CrawlJobsModule {}
