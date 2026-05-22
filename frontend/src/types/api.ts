export type StoryStatus = 'pending' | 'crawling' | 'ready' | 'failed';
export type ChapterStatus = 'pending' | 'fetched' | 'failed';
export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type CrawlMode = 'toc-only' | 'chapters-only' | 'toc-and-chapters';

export interface Story {
  id: string;
  sourceUrl: string;
  title: string | null;
  author: string | null;
  language: string | null;
  status: StoryStatus;
  chapterCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TocItem {
  id: string;
  title: string;
  url: string;
  position: number;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  sourceUrl: string;
  position: number;
  status: ChapterStatus;
}

export interface ChapterContent {
  chapterId: string;
  contentText: string;
  contentHtml: string;
  wordCount: number;
}

export interface CrawlJob {
  id: string;
  storyId: string;
  status: JobStatus;
  mode: CrawlMode;
  progressTotal: number;
  progressDone: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
}

export interface PdfFile {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  storageProvider: string;
  createdAt: string;
  expiresAt?: string | null;
}

export interface PdfJob {
  id: string;
  storyId: string;
  status: JobStatus;
  progressTotal: number;
  progressDone: number;
  file?: PdfFile | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface CreateStoryDto {
  sourceUrl: string;
  title?: string;
  author?: string;
  language?: string;
}

export interface UpdateStoryDto {
  title?: string;
  author?: string;
  language?: string;
}

export interface CreateCrawlJobDto {
  mode: CrawlMode;
}

export interface CreatePdfJobDto {
  includeCover?: boolean;
  includeToc?: boolean;
  chapterIds?: string[];
}

export interface ListStoriesParams {
  page?: number;
  limit?: number;
  status?: StoryStatus;
  q?: string;
}

export interface ListChaptersParams {
  page?: number;
  limit?: number;
  status?: ChapterStatus;
}
