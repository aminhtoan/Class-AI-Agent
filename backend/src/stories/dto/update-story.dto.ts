import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoryDto {
  @ApiPropertyOptional({ description: 'Story title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Author name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @ApiPropertyOptional({ description: 'Language code', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;
}
