import {
  Injectable,
  NotFoundException,
  GoneException,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePdfJobDto } from './dto/create-pdf-job.dto';
import * as fs from 'fs';
import * as path from 'path';

const ANONYMOUS_USER_EMAIL = 'anonymous@story-to-pdf.local';

export interface PdfJobResponse {
  id: string;
  storyId: string;
  status: string;
  includeCover: boolean;
  includeToc: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  file?: PdfFileResponse;
}

export interface PdfFileResponse {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  storageProvider: string;
  createdAt: Date;
  expiresAt: Date | null;
}

@Injectable()
export class PdfJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPdfJob(
    storyId: string,
    dto: CreatePdfJobDto,
  ): Promise<PdfJobResponse> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        _count: {
          select: { chapters: true },
        },
      },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    if (story._count.chapters === 0) {
      throw new UnprocessableEntityException({
        code: 'NO_CHAPTERS_AVAILABLE',
        message: 'No chapters available to generate PDF',
      });
    }

    const user = await this.getAnonymousUser();

    const pdfJob = await this.prisma.pdfJob.create({
      data: {
        userId: user.id,
        storyId,
        status: 'pending',
        includeCover: dto.includeCover ?? true,
        includeToc: dto.includeToc ?? true,
      },
    });

    return this.mapPdfJob(pdfJob);
  }

  async getPdfJobsByStoryId(storyId: string): Promise<PdfJobResponse[]> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    const pdfJobs = await this.prisma.pdfJob.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
      include: {
        files: true,
      },
    });

    return pdfJobs.map((job) => this.mapPdfJob(job, job.files[0]));
  }

  async getPdfJobById(id: string): Promise<PdfJobResponse> {
    const pdfJob = await this.prisma.pdfJob.findUnique({
      where: { id },
      include: {
        files: true,
      },
    });

    if (!pdfJob) {
      throw new NotFoundException({
        code: 'PDF_JOB_NOT_FOUND',
        message: 'PDF job not found',
      });
    }

    return this.mapPdfJob(pdfJob, pdfJob.files[0]);
  }

  async getJobForProgress(id: string) {
    const pdfJob = await this.prisma.pdfJob.findUnique({
      where: { id },
    });

    if (!pdfJob) {
      throw new NotFoundException({
        code: 'PDF_JOB_NOT_FOUND',
        message: 'PDF job not found',
      });
    }

    return {
      status: pdfJob.status,
    };
  }

  async getPdfFileById(id: string) {
    const pdfFile = await this.prisma.pdfFile.findUnique({
      where: { id },
    });

    if (!pdfFile) {
      throw new NotFoundException({
        code: 'PDF_FILE_NOT_FOUND',
        message: 'PDF file not found',
      });
    }

    if (pdfFile.expiresAt && pdfFile.expiresAt < new Date()) {
      throw new GoneException({
        code: 'PDF_FILE_EXPIRED',
        message: 'PDF file has expired',
      });
    }

    return pdfFile;
  }

  async getFileStream(pdfFile: { storageKey: string; fileName: string }) {
    const safeKey = path.basename(pdfFile.storageKey);
    const storageDir = process.env.PDF_STORAGE_PATH || './storage/pdfs';
    const filePath = path.join(storageDir, safeKey);

    if (!fs.existsSync(filePath)) {
      throw new InternalServerErrorException({
        code: 'STORAGE_FILE_MISSING',
        message: 'PDF file is missing from storage',
      });
    }

    return {
      stream: fs.createReadStream(filePath),
      fileName: pdfFile.fileName,
    };
  }

  private async getAnonymousUser() {
    return this.prisma.user.findUniqueOrThrow({
      where: { email: ANONYMOUS_USER_EMAIL },
    });
  }

  private mapPdfJob(
    job: {
      id: string;
      storyId: string;
      status: string;
      includeCover: boolean;
      includeToc: boolean;
      startedAt: Date | null;
      finishedAt: Date | null;
      createdAt: Date;
    },
    file?: {
      id: string;
      fileName: string;
      fileSizeBytes: number;
      storageProvider: string;
      createdAt: Date;
      expiresAt: Date | null;
    } | null,
  ): PdfJobResponse {
    const response: PdfJobResponse = {
      id: job.id,
      storyId: job.storyId,
      status: job.status,
      includeCover: job.includeCover,
      includeToc: job.includeToc,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      createdAt: job.createdAt,
    };

    if (file) {
      response.file = {
        id: file.id,
        fileName: file.fileName,
        fileSizeBytes: file.fileSizeBytes,
        storageProvider: file.storageProvider,
        createdAt: file.createdAt,
        expiresAt: file.expiresAt,
      };
    }

    return response;
  }
}
