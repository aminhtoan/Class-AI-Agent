import {
  Injectable,
  NotFoundException,
  GoneException,
  InternalServerErrorException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePdfJobDto } from './dto/create-pdf-job.dto';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
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
  private readonly logger = new Logger(PdfJobsService.name);

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

    // Trigger PDF generation asynchronously
    this.executePdfAsync(pdfJob.id);

    return this.mapPdfJob(pdfJob);
  }

  private executePdfAsync(jobId: string): void {
    setImmediate(async () => {
      try {
        await this.generatePdf(jobId);
      } catch (error) {
        this.logger.error(`Failed to execute PDF job ${jobId}:`, error);
      }
    });
  }

  private async generatePdf(jobId: string): Promise<void> {
    const job = await this.prisma.pdfJob.findUnique({
      where: { id: jobId },
      include: {
        story: {
          include: {
            tocItems: {
              orderBy: { position: 'asc' },
            },
            chapters: {
              include: { content: true },
            },
          },
        },
      },
    });

    if (!job) {
      throw new Error('PDF job not found');
    }

    await this.prisma.pdfJob.update({
      where: { id: jobId },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      const { story } = job;

      // Sort chapters by TOC position
      const tocUrlToPosition = new Map(
        story.tocItems.map(toc => [toc.url, toc.position])
      );

      const chapters = story.chapters
        .filter(ch => ch.content)
        .sort((a, b) => {
          const posA = tocUrlToPosition.get(a.sourceUrl) ?? 9999;
          const posB = tocUrlToPosition.get(b.sourceUrl) ?? 9999;
          return posA - posB;
        });

      if (chapters.length === 0) {
        throw new Error('No chapters with content available');
      }

      // Update progress total
      await this.prisma.pdfJob.update({
        where: { id: jobId },
        data: { progressTotal: chapters.length, progressDone: 0 },
      });

      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      // Load Vietnamese-compatible fonts
      const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Regular.ttf');
      const boldFontPath = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Bold.ttf');

      let font;
      let boldFont;

      if (fs.existsSync(fontPath) && fs.existsSync(boldFontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        const boldFontBytes = fs.readFileSync(boldFontPath);
        font = await pdfDoc.embedFont(fontBytes);
        boldFont = await pdfDoc.embedFont(boldFontBytes);
      } else {
        // Fallback to built-in fonts (may not support Vietnamese)
        const { StandardFonts } = await import('pdf-lib');
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        this.logger.warn('Vietnamese fonts not found, falling back to Helvetica');
      }

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 50;
      const lineHeight = 18; // 12pt * 1.5 line spacing
      const paragraphSpacing = 8;
      const fontSize = 12;
      const titleFontSize = 16;

      // Title page
      if (job.includeCover) {
        const titlePage = pdfDoc.addPage([pageWidth, pageHeight]);
        const titleText = story.title || 'Untitled Story';
        const authorText = story.author ? `by ${story.author}` : '';

        const titleWidth = boldFont.widthOfTextAtSize(titleText, 24);
        titlePage.drawText(titleText, {
          x: (pageWidth - titleWidth) / 2,
          y: pageHeight / 2 + 50,
          size: 24,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        if (authorText) {
          const authorWidth = font.widthOfTextAtSize(authorText, 14);
          titlePage.drawText(authorText, {
            x: (pageWidth - authorWidth) / 2,
            y: pageHeight / 2,
            size: 14,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
          });
        }
      }

      // Table of contents
      if (job.includeToc && chapters.length > 0) {
        let tocPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let yPos = pageHeight - margin;

        tocPage.drawText('Table of Contents', {
          x: margin,
          y: yPos,
          size: titleFontSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPos -= lineHeight * 2;

        for (let i = 0; i < chapters.length; i++) {
          if (yPos < margin + lineHeight) {
            tocPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPos = pageHeight - margin;
          }

          const chapterTitle = `${i + 1}. ${chapters[i].title || `Chapter ${i + 1}`}`;
          const truncatedTitle = chapterTitle.length > 60
            ? chapterTitle.substring(0, 57) + '...'
            : chapterTitle;

          tocPage.drawText(truncatedTitle, {
            x: margin,
            y: yPos,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
          yPos -= lineHeight;
        }
      }

      // Chapters
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const content = chapter.content?.contentText || '';

        // Update progress
        await this.prisma.pdfJob.update({
          where: { id: jobId },
          data: { progressDone: i + 1 },
        });

        if (!content.trim()) continue;

        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let yPos = pageHeight - margin;
        const maxWidth = pageWidth - margin * 2;

        // Chapter title
        const chapterTitle = chapter.title || `Chapter ${i + 1}`;
        page.drawText(chapterTitle, {
          x: margin,
          y: yPos,
          size: titleFontSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPos -= lineHeight * 2;

        // Split content into paragraphs (by double newline or single newline)
        const paragraphs = content
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 0);

        for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
          const paragraph = paragraphs[pIdx];

          // Split paragraph into lines (by single newline)
          const lines = paragraph.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

          for (const line of lines) {
            // Word wrap each line
            const words = line.split(/\s+/);
            let currentLine = '';

            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize);

              if (testWidth > maxWidth) {
                // Draw current line and start new one
                if (yPos < margin + lineHeight) {
                  page = pdfDoc.addPage([pageWidth, pageHeight]);
                  yPos = pageHeight - margin;
                }

                page.drawText(currentLine, {
                  x: margin,
                  y: yPos,
                  size: fontSize,
                  font: font,
                  color: rgb(0, 0, 0),
                });
                yPos -= lineHeight;
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }

            // Draw remaining text in line
            if (currentLine) {
              if (yPos < margin + lineHeight) {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                yPos = pageHeight - margin;
              }
              page.drawText(currentLine, {
                x: margin,
                y: yPos,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
              });
              yPos -= lineHeight;
            }
          }

          // Add paragraph spacing after each paragraph (except last)
          if (pIdx < paragraphs.length - 1) {
            yPos -= paragraphSpacing;
          }
        }
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const storageDir = process.env.PDF_STORAGE_PATH || './storage/pdfs';

      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const safeTitle = (story.title || 'story')
        .replace(/[^a-zA-Z0-9À-ɏḀ-ỿ]/g, '_')
        .substring(0, 50);
      const fileName = `${safeTitle}_${Date.now()}.pdf`;
      const storageKey = `${jobId}_${fileName}`;
      const filePath = path.join(storageDir, storageKey);

      fs.writeFileSync(filePath, pdfBytes);

      await this.prisma.pdfFile.create({
        data: {
          pdfJobId: jobId,
          fileName,
          storageProvider: 'local',
          storageKey,
          fileSizeBytes: pdfBytes.length,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await this.prisma.pdfJob.update({
        where: { id: jobId },
        data: { status: 'succeeded', finishedAt: new Date() },
      });

      this.logger.log(`PDF job ${jobId} completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PDF job ${jobId} failed: ${message}`);

      await this.prisma.pdfJob.update({
        where: { id: jobId },
        data: { status: 'failed', finishedAt: new Date() },
      });
    }
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

    const now = new Date();
    const startedAt = pdfJob.startedAt || pdfJob.createdAt;
    const elapsedMs = now.getTime() - startedAt.getTime();
    const finishedAt = pdfJob.finishedAt;
    const totalMs = finishedAt
      ? finishedAt.getTime() - startedAt.getTime()
      : null;

    return {
      progressDone: pdfJob.progressDone,
      progressTotal: pdfJob.progressTotal,
      status: pdfJob.status,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt?.toISOString() || null,
      elapsedMs,
      totalMs,
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
