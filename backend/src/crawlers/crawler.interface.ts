export interface TocEntry {
  title: string;
  url: string;
  position: number;
}

export interface ChapterData {
  title: string;
  contentHtml: string;
  contentText: string;
  wordCount: number;
  publishedAt?: Date;
}

export interface StoryMetadata {
  title: string;
  author: string | null;
  description?: string;
  coverUrl?: string;
  language?: string;
}

export interface CrawlerResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface Crawler {
  readonly name: string;
  readonly supportedHosts: string[];

  supports(host: string): boolean;

  fetchStoryMetadata(storyUrl: string): Promise<CrawlerResult<StoryMetadata>>;

  fetchToc(storyUrl: string): Promise<CrawlerResult<TocEntry[]>>;

  fetchChapter(chapterUrl: string): Promise<CrawlerResult<ChapterData>>;
}
