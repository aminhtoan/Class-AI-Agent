import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Crawler, TocEntry, ChapterData } from './crawler.interface';
import { SangtacvietCrawler } from './sources/sangtacviet.crawler';
import { XtruyenCrawler } from './sources/xtruyen.crawler';
import { politeDelay } from './retry.util';

type CrawlMode = 'toc-only' | 'chapters-only' | 'toc-and-chapters';

interface CrawlProgress {
  jobId: string;
  status: string;
  progressTotal: number;
  progressDone: number;
  currentTask?: string;
}

interface DomainConfig {
  concurrency: number;
  politeDelayEvery: number;
}

const DOMAIN_CONFIG: Record<string, DomainConfig> = {
  'truyenfull.vn': { concurrency: 10, politeDelayEvery: 20 },
  'metruyenchu.com': { concurrency: 8, politeDelayEvery: 15 },
  'sangtacviet.app': { concurrency: 3, politeDelayEvery: 10 },
  'xtruyen.vn': { concurrency: 8, politeDelayEvery: 15 },
  default: { concurrency: 5, politeDelayEvery: 15 },
};

function getDomainConfig(host: string): DomainConfig {
  return DOMAIN_CONFIG[host] ?? DOMAIN_CONFIG['default'];
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly crawlers: Crawler[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.crawlers.push(new SangtacvietCrawler());
    this.crawlers.push(new XtruyenCrawler());
  }

  getCrawlerForHost(host: string): Crawler | null {
    const normalizedHost = host.toLowerCase();
    return this.crawlers.find((crawler) => crawler.supports(normalizedHost)) || null;
  }

  getSupportedHosts(): string[] {
    return this.crawlers.flatMap((crawler) => crawler.supportedHosts);
  }

  async executeCrawlJob(
    jobId: string,
    mode: CrawlMode = 'toc-and-chapters',
    onProgress?: (progress: CrawlProgress) => void,
  ): Promise<void> {
    const crawlJob = await this.prisma.crawlJob.findUnique({
      where: { id: jobId },
      include: { story: true },
    });

    if (!crawlJob) {
      throw new NotFoundException({
        code: 'CRAWL_JOB_NOT_FOUND',
        message: 'Crawl job not found',
      });
    }

    const { story } = crawlJob;
    const crawler = this.getCrawlerForHost(story.sourceHost);

    if (!crawler) {
      await this.failJob(jobId, 'UNSUPPORTED_SOURCE', `Unsupported source: ${story.sourceHost}`);
      return;
    }

    await this.prisma.crawlJob.update({
      where: { id: jobId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      const shouldFetchToc = mode === 'toc-only' || mode === 'toc-and-chapters';
      const shouldFetchChapters = mode === 'chapters-only' || mode === 'toc-and-chapters';

      let tocEntries: TocEntry[] = [];

      if (shouldFetchToc) {
        this.logger.log(`Fetching TOC for story ${story.id}`);

        const metadataResult = await crawler.fetchStoryMetadata(story.sourceUrl);
        if (metadataResult.success && metadataResult.data) {
          await this.prisma.story.update({
            where: { id: story.id },
            data: {
              title: metadataResult.data.title,
              author: metadataResult.data.author,
              language: metadataResult.data.language,
              coverUrl: metadataResult.data.coverUrl,
              description: metadataResult.data.description,
            },
          });
        }

        const tocResult = await crawler.fetchToc(story.sourceUrl);
        if (!tocResult.success || !tocResult.data) {
          await this.failJob(jobId, tocResult.error?.code || 'TOC_FETCH_FAILED', tocResult.error?.message || 'Failed to fetch TOC');
          return;
        }

        tocEntries = tocResult.data;

        await this.prisma.tocItem.deleteMany({
          where: { storyId: story.id },
        });

        if (tocEntries.length > 0) {
          await this.prisma.tocItem.createMany({
            data: tocEntries.map((entry) => ({
              storyId: story.id,
              title: entry.title,
              url: entry.url,
              position: entry.position,
            })),
          });
        }

        this.logger.log(`Saved ${tocEntries.length} TOC entries for story ${story.id}`);
      }

      if (shouldFetchChapters) {
        if (tocEntries.length === 0) {
          const existingToc = await this.prisma.tocItem.findMany({
            where: { storyId: story.id },
            orderBy: { position: 'asc' },
          });
          tocEntries = existingToc.map((item) => ({
            title: item.title,
            url: item.url,
            position: item.position,
          }));
        }

        if (tocEntries.length === 0) {
          await this.failJob(jobId, 'NO_TOC', 'No table of contents available. Run TOC crawl first.');
          return;
        }

        await this.prisma.crawlJob.update({
          where: { id: jobId },
          data: { progressTotal: tocEntries.length },
        });

        // Get domain config for concurrency settings
        const domainConfig = getDomainConfig(story.sourceHost);
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(domainConfig.concurrency);
        let progressDone = 0;
        let cancelled = false;

        this.logger.log(
          `Crawling ${tocEntries.length} chapters (concurrency=${domainConfig.concurrency})`,
        );

        await Promise.all(
          tocEntries.map((entry, index) =>
            limit(async () => {
              // Check cancel flag
              if (cancelled) return;

              if (index % 10 === 0) {
                const currentJob = await this.prisma.crawlJob.findUnique({
                  where: { id: jobId },
                  select: { status: true },
                });
                if (currentJob?.status === 'cancelled') {
                  cancelled = true;
                  this.logger.log(`Crawl job ${jobId} was cancelled`);
                  return;
                }
              }

              // Skip if already fetched (resume support)
              const existingChapter = await this.prisma.chapter.findUnique({
                where: {
                  storyId_sourceUrl: {
                    storyId: story.id,
                    sourceUrl: entry.url,
                  },
                },
                include: { content: true },
              });

              if (existingChapter?.content) {
                progressDone++;
                await this.prisma.crawlJob.update({
                  where: { id: jobId },
                  data: { progressDone },
                });
                return;
              }

              // Add polite delay every N chapters to avoid rate limiting
              if (index > 0 && index % domainConfig.politeDelayEvery === 0) {
                await politeDelay();
              }

              try {
                const chapterResult = await crawler.fetchChapter(entry.url);

                if (chapterResult.success && chapterResult.data) {
                  const chapterData = chapterResult.data;

                  const chapter = await this.prisma.chapter.upsert({
                    where: {
                      storyId_sourceUrl: {
                        storyId: story.id,
                        sourceUrl: entry.url,
                      },
                    },
                    create: {
                      storyId: story.id,
                      title: chapterData.title || entry.title,
                      sourceUrl: entry.url,
                      status: 'fetched',
                      fetchedAt: new Date(),
                      publishedAt: chapterData.publishedAt,
                    },
                    update: {
                      title: chapterData.title || entry.title,
                      status: 'fetched',
                      fetchedAt: new Date(),
                      publishedAt: chapterData.publishedAt,
                    },
                  });

                  await this.prisma.chapterContent.upsert({
                    where: { chapterId: chapter.id },
                    create: {
                      chapterId: chapter.id,
                      contentText: chapterData.contentText,
                      contentHtml: chapterData.contentHtml,
                      wordCount: chapterData.wordCount,
                    },
                    update: {
                      contentText: chapterData.contentText,
                      contentHtml: chapterData.contentHtml,
                      wordCount: chapterData.wordCount,
                    },
                  });

                  this.logger.debug(`✓ Chapter ${entry.position}: ${entry.title}`);
                } else {
                  await this.prisma.chapter.upsert({
                    where: {
                      storyId_sourceUrl: {
                        storyId: story.id,
                        sourceUrl: entry.url,
                      },
                    },
                    create: {
                      storyId: story.id,
                      title: entry.title,
                      sourceUrl: entry.url,
                      status: 'failed',
                    },
                    update: {
                      status: 'failed',
                    },
                  });
                  this.logger.warn(`✗ Chapter ${entry.position} failed: ${chapterResult.error?.message}`);
                }
              } catch (chapterError) {
                this.logger.warn(`✗ Chapter ${entry.position} error: ${chapterError}`);
                await this.prisma.chapter.upsert({
                  where: {
                    storyId_sourceUrl: {
                      storyId: story.id,
                      sourceUrl: entry.url,
                    },
                  },
                  create: {
                    storyId: story.id,
                    title: entry.title,
                    sourceUrl: entry.url,
                    status: 'failed',
                  },
                  update: {
                    status: 'failed',
                  },
                });
              }

              progressDone++;
              await this.prisma.crawlJob.update({
                where: { id: jobId },
                data: { progressDone },
              });

              if (onProgress) {
                onProgress({
                  jobId,
                  status: 'running',
                  progressTotal: tocEntries.length,
                  progressDone,
                  currentTask: `Fetching chapter ${progressDone}/${tocEntries.length}`,
                });
              }
            }),
          ),
        );

        if (cancelled) {
          return;
        }
      }

      await this.prisma.crawlJob.update({
        where: { id: jobId },
        data: {
          status: 'succeeded',
          finishedAt: new Date(),
        },
      });

      await this.prisma.story.update({
        where: { id: story.id },
        data: {
          status: 'ready',
          lastScannedAt: new Date(),
        },
      });

      this.logger.log(`Crawl job ${jobId} completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Crawl job ${jobId} failed: ${message}`);
      await this.failJob(jobId, 'CRAWL_FAILED', message);
    }
  }

  private async failJob(jobId: string, errorCode: string, errorMessage: string): Promise<void> {
    await this.prisma.crawlJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorCode,
        errorMessage,
        finishedAt: new Date(),
      },
    });

    const crawlJob = await this.prisma.crawlJob.findUnique({
      where: { id: jobId },
      select: { storyId: true },
    });

    if (crawlJob) {
      await this.prisma.story.update({
        where: { id: crawlJob.storyId },
        data: { status: 'failed' },
      });
    }
  }
}
