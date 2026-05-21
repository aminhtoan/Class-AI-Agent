import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ListStoriesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    description: "Filter by status",
    enum: ["pending", "crawling", "ready", "failed"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["pending", "crawling", "ready", "failed"])
  status?: string;

  @ApiPropertyOptional({ description: "Search by title" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
