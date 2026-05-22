import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlerService } from './crawler.service';

@Module({
  imports: [PrismaModule],
  providers: [CrawlerService],
  exports: [CrawlerService],
})
export class CrawlersModule {}
