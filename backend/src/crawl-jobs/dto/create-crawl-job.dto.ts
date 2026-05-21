import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CrawlMode {
  TOC_ONLY = 'toc-only',
  CHAPTERS_ONLY = 'chapters-only',
  TOC_AND_CHAPTERS = 'toc-and-chapters',
}

export class CreateCrawlJobDto {
  @ApiProperty({
    enum: CrawlMode,
    description: 'Crawl mode: toc-only, chapters-only, or toc-and-chapters',
    example: 'toc-and-chapters',
  })
  @IsEnum(CrawlMode, {
    message: 'mode must be one of: toc-only, chapters-only, toc-and-chapters',
  })
  mode!: CrawlMode;
}
