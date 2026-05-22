import {
  Injectable,
  UnprocessableEntityException,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { getEnv } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStoryDto } from "./dto/create-story.dto";
import { ListStoriesQueryDto } from "./dto/list-stories-query.dto";
import { UpdateStoryDto } from "./dto/update-story.dto";
import {
  isAllowedStoryHost,
  parseAllowedDomains,
  parseStorySourceUrl,
} from "./story-url";

const ANONYMOUS_USER_EMAIL = "anonymous@story-to-pdf.local";

type StoryWithChapterCount = {
  id: string;
  title: string | null;
  author: string | null;
  sourceUrl: string;
  language: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { chapters: number };
};

export interface StoryListItem {
  id: string;
  title: string | null;
  author: string | null;
  sourceUrl: string;
  language: string | null;
  status: string;
  chapterCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class StoriesService {
  private readonly allowedDomains = parseAllowedDomains(
    getEnv().ALLOWED_DOMAINS,
  );

  constructor(private readonly prisma: PrismaService) {}

  async createStory(dto: CreateStoryDto) {
    const parsedUrl = parseStorySourceUrl(dto.sourceUrl);

    if (!isAllowedStoryHost(parsedUrl.sourceHost, this.allowedDomains)) {
      throw new UnprocessableEntityException({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: [
          {
            field: "sourceUrl",
            message: "sourceUrl host is not in the allowed domain list",
          },
        ],
      });
    }

    const user = await this.getAnonymousUser();

    const existingStory = await this.prisma.story.findUnique({
      where: {
        userId_sourceUrl: {
          userId: user.id,
          sourceUrl: parsedUrl.sourceUrl,
        },
      },
      include: {
        _count: {
          select: {
            chapters: true,
          },
        },
      },
    });

    if (existingStory) {
      return {
        story: this.mapStory(existingStory),
        created: false,
      };
    }

    const story = await this.prisma.story.create({
      data: {
        userId: user.id,
        title: dto.title?.trim() || null,
        author: dto.author?.trim() || null,
        sourceUrl: parsedUrl.sourceUrl,
        sourceHost: parsedUrl.sourceHost,
        language: dto.language?.trim() || null,
        status: "pending",
      },
      include: {
        _count: {
          select: {
            chapters: true,
          },
        },
      },
    });

    return {
      story: this.mapStory(story),
      created: true,
    };
  }

  async listStories(query: ListStoriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      where.title = {
        contains: query.q,
        mode: "insensitive",
      };
    }

    const [stories, total] = await this.prisma.$transaction([
      this.prisma.story.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              chapters: true,
            },
          },
        },
      }),
      this.prisma.story.count({ where }),
    ]);

    return {
      items: stories.map((story: StoryWithChapterCount) =>
        this.mapStory(story),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStoryById(id: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            chapters: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException({
        code: "STORY_NOT_FOUND",
        message: "Story not found",
      });
    }

    return this.mapStory(story);
  }

  async updateStory(id: string, dto: UpdateStoryDto) {
    const existing = await this.prisma.story.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: "STORY_NOT_FOUND",
        message: "Story not found",
      });
    }

    const story = await this.prisma.story.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title?.trim() || null : undefined,
        author:
          dto.author !== undefined ? dto.author?.trim() || null : undefined,
        language:
          dto.language !== undefined ? dto.language?.trim() || null : undefined,
      },
      include: {
        _count: {
          select: {
            chapters: true,
          },
        },
      },
    });

    return this.mapStory(story);
  }

  async deleteStory(id: string) {
    const existing = await this.prisma.story.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: "STORY_NOT_FOUND",
        message: "Story not found",
      });
    }

    await this.prisma.story.delete({
      where: { id },
    });
  }

  private async getAnonymousUser() {
    const passwordHash = await bcrypt.hash(randomUUID(), 10);

    return this.prisma.user.upsert({
      where: {
        email: ANONYMOUS_USER_EMAIL,
      },
      update: {},
      create: {
        email: ANONYMOUS_USER_EMAIL,
        name: "Anonymous Reader",
        password: passwordHash,
        role: "USER",
        status: "active",
      },
    });
  }

  private mapStory(story: StoryWithChapterCount): StoryListItem {
    return {
      id: story.id,
      title: story.title,
      author: story.author,
      sourceUrl: story.sourceUrl,
      language: story.language,
      status: story.status,
      chapterCount: story._count.chapters,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    };
  }
}
