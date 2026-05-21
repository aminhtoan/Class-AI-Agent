import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { buildSuccessResponse } from '../common/api-response';
import { ChaptersService } from './chapters.service';
import { ListChaptersQueryDto } from './dto/list-chapters-query.dto';

@ApiTags('chapters')
@Controller()
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Get('stories/:id/toc')
  @ApiOperation({ summary: 'Get table of contents for a story' })
  @ApiResponse({ status: 200, description: 'TOC items' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async getToc(@Param('id') storyId: string) {
    const tocItems = await this.chaptersService.getTocByStoryId(storyId);

    return buildSuccessResponse(tocItems);
  }

  @Get('stories/:id/chapters')
  @ApiOperation({ summary: 'List chapters for a story' })
  @ApiResponse({ status: 200, description: 'Chapter list' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async getChapters(
    @Param('id') storyId: string,
    @Query() query: ListChaptersQueryDto,
  ) {
    const result = await this.chaptersService.getChaptersByStoryId(
      storyId,
      query,
    );

    return buildSuccessResponse(result.items, result.pagination);
  }

  @Get('chapters/:id')
  @ApiOperation({ summary: 'Get chapter details' })
  @ApiResponse({ status: 200, description: 'Chapter detail' })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  async getChapter(@Param('id') id: string) {
    const chapter = await this.chaptersService.getChapterById(id);

    return buildSuccessResponse(chapter);
  }

  @Get('chapters/:id/content')
  @ApiOperation({ summary: 'Get chapter content' })
  @ApiResponse({ status: 200, description: 'Chapter content' })
  @ApiResponse({ status: 404, description: 'Chapter or content not found' })
  async getChapterContent(@Param('id') id: string) {
    const content = await this.chaptersService.getChapterContent(id);

    return buildSuccessResponse(content);
  }
}
