import { Module } from '@nestjs/common';
import { PdfJobsController } from './pdf-jobs.controller';
import { PdfJobsService } from './pdf-jobs.service';

@Module({
  controllers: [PdfJobsController],
  providers: [PdfJobsService],
  exports: [PdfJobsService],
})
export class PdfJobsModule {}
