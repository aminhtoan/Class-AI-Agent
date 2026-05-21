import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { buildSuccessResponse } from "../common/api-response";
import { CreateStoryDto } from "./dto/create-story.dto";
import { ListStoriesQueryDto } from "./dto/list-stories-query.dto";
import { UpdateStoryDto } from "./dto/update-story.dto";
import { StoriesService } from "./stories.service";

@ApiTags("stories")
@Controller("stories")
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiOperation({ summary: "Create a story from a source URL" })
  @ApiBody({ type: CreateStoryDto })
  @ApiResponse({ status: 201, description: "Story created" })
  @ApiResponse({ status: 200, description: "Existing story returned" })
  async createStory(
    @Body() body: CreateStoryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.storiesService.createStory(body);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);

    return buildSuccessResponse(result.story);
  }

  @Get()
  @ApiOperation({ summary: "List stories" })
  @ApiResponse({ status: 200, description: "Story list" })
  async listStories(@Query() query: ListStoriesQueryDto) {
    const result = await this.storiesService.listStories(query);

    return buildSuccessResponse(result.items, result.pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a story by id" })
  @ApiResponse({ status: 200, description: "Story detail" })
  @ApiResponse({ status: 404, description: "Story not found" })
  async getStoryById(@Param("id") id: string) {
    const story = await this.storiesService.getStoryById(id);

    return buildSuccessResponse(story);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update story metadata" })
  @ApiBody({ type: UpdateStoryDto })
  @ApiResponse({ status: 200, description: "Story updated" })
  @ApiResponse({ status: 404, description: "Story not found" })
  @ApiResponse({ status: 422, description: "Validation error" })
  async updateStory(@Param("id") id: string, @Body() body: UpdateStoryDto) {
    const story = await this.storiesService.updateStory(id, body);

    return buildSuccessResponse(story);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a story" })
  @ApiResponse({ status: 204, description: "Story deleted" })
  @ApiResponse({ status: 404, description: "Story not found" })
  async deleteStory(@Param("id") id: string) {
    await this.storiesService.deleteStory(id);
  }
}
