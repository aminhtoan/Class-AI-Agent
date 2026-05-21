import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListChaptersQueryDto } from './dto/list-chapters-query.dto';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  async getTocByStoryId(storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    const tocItems = await this.prisma.tocItem.findMany({
      where: { storyId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        url: true,
        position: true,
      },
    });

    return tocItems;
  }

  async getChaptersByStoryId(storyId: string, query: ListChaptersQueryDto) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { storyId };

    if (query.status) {
      where.status = query.status;
    }

    const [chapters, total] = await this.prisma.$transaction([
      this.prisma.chapter.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          sourceUrl: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.chapter.count({ where }),
    ]);

    const chaptersWithPosition = chapters.map((chapter, index) => ({
      id: chapter.id,
      title: chapter.title,
      sourceUrl: chapter.sourceUrl,
      position: skip + index + 1,
      status: chapter.status,
    }));

    return {
      items: chaptersWithPosition,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getChapterById(id: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      select: {
        id: true,
        storyId: true,
        title: true,
        sourceUrl: true,
        status: true,
        createdAt: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException({
        code: 'CHAPTER_NOT_FOUND',
        message: 'Chapter not found',
      });
    }

    const position = await this.prisma.chapter.count({
      where: {
        storyId: chapter.storyId,
        createdAt: { lte: chapter.createdAt },
      },
    });

    return {
      id: chapter.id,
      storyId: chapter.storyId,
      title: chapter.title,
      sourceUrl: chapter.sourceUrl,
      position,
      status: chapter.status,
    };
  }

  async getChapterContent(id: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: {
        content: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException({
        code: 'CHAPTER_NOT_FOUND',
        message: 'Chapter not found',
      });
    }

    if (!chapter.content) {
      throw new NotFoundException({
        code: 'CONTENT_NOT_AVAILABLE',
        message: 'Chapter content is not available yet',
      });
    }

    return {
      chapterId: chapter.id,
      contentText: chapter.content.contentText,
      contentHtml: chapter.content.contentHtml,
      wordCount: chapter.content.wordCount,
    };
  }
}
