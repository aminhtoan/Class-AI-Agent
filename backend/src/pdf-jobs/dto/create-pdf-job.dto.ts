import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePdfJobDto {
  @ApiPropertyOptional({ description: 'Include cover page', default: true })
  @IsOptional()
  @IsBoolean()
  includeCover?: boolean;

  @ApiPropertyOptional({
    description: 'Include table of contents',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeToc?: boolean;

  @ApiPropertyOptional({
    description: 'Specific chapter IDs to include (empty = all chapters)',
    type: [String],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chapterIds?: string[];
}
