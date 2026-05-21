import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateStoryDto {
  @ApiProperty({
    description: "Source URL of the story",
    example: "https://example.com/story/abc",
  })
  @IsString()
  sourceUrl!: string;

  @ApiPropertyOptional({ description: "Story title", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: "Author name", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @ApiPropertyOptional({
    description: "Language code",
    maxLength: 32,
    example: "vi",
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;
}
