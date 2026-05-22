import type {
  ApiResponse,
  Story,
  TocItem,
  Chapter,
  ChapterContent,
  CrawlJob,
  PdfJob,
  CreateStoryDto,
  UpdateStoryDto,
  CreateCrawlJobDto,
  CreatePdfJobDto,
  ListStoriesParams,
  ListChaptersParams,
  Pagination,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888/api/v1';

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' };
    throw new ApiError(error.code, error.message, error.details);
  }

  return data.data;
}

export const api = {
  stories: {
    list: async (params?: ListStoriesParams): Promise<{ data: Story[]; pagination: Pagination }> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      if (params?.q) searchParams.set('q', params.q);

      const url = `/stories${searchParams.toString() ? `?${searchParams}` : ''}`;
      const response = await fetch(`${API_BASE_URL}${url}`);
      const result: ApiResponse<Story[]> = await response.json();

      if (!result.success) {
        throw new ApiError('FETCH_ERROR', 'Failed to fetch stories');
      }

      return {
        data: result.data,
        pagination: result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },

    get: (id: string): Promise<Story> => fetchApi(`/stories/${id}`),

    create: (dto: CreateStoryDto): Promise<Story> =>
      fetchApi('/stories', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    update: (id: string, dto: UpdateStoryDto): Promise<Story> =>
      fetchApi(`/stories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),

    delete: (id: string): Promise<void> =>
      fetchApi(`/stories/${id}`, { method: 'DELETE' }),

    getToc: (id: string): Promise<TocItem[]> =>
      fetchApi(`/stories/${id}/toc`),

    getChapters: async (
      id: string,
      params?: ListChaptersParams
    ): Promise<{ data: Chapter[]; pagination: Pagination }> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);

      const url = `/stories/${id}/chapters${searchParams.toString() ? `?${searchParams}` : ''}`;
      const response = await fetch(`${API_BASE_URL}${url}`);
      const result: ApiResponse<Chapter[]> = await response.json();

      if (!result.success) {
        throw new ApiError('FETCH_ERROR', 'Failed to fetch chapters');
      }

      return {
        data: result.data,
        pagination: result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },
  },

  chapters: {
    get: (id: string): Promise<Chapter> => fetchApi(`/chapters/${id}`),
    getContent: (id: string): Promise<ChapterContent> =>
      fetchApi(`/chapters/${id}/content`),
  },

  crawlJobs: {
    create: (storyId: string, dto: CreateCrawlJobDto): Promise<CrawlJob> =>
      fetchApi(`/stories/${storyId}/crawl-jobs`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    listByStory: (storyId: string): Promise<CrawlJob[]> =>
      fetchApi(`/stories/${storyId}/crawl-jobs`),

    get: (id: string): Promise<CrawlJob> => fetchApi(`/crawl-jobs/${id}`),

    cancel: (id: string): Promise<CrawlJob> =>
      fetchApi(`/crawl-jobs/${id}/cancel`, { method: 'POST' }),

    streamProgress: (id: string): EventSource => {
      return new EventSource(`${API_BASE_URL}/crawl-jobs/${id}/progress`);
    },
  },

  pdfJobs: {
    create: (storyId: string, dto: CreatePdfJobDto): Promise<PdfJob> =>
      fetchApi(`/stories/${storyId}/pdf-jobs`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    listByStory: (storyId: string): Promise<PdfJob[]> =>
      fetchApi(`/stories/${storyId}/pdf-jobs`),

    get: (id: string): Promise<PdfJob> => fetchApi(`/pdf-jobs/${id}`),

    streamProgress: (id: string): EventSource => {
      return new EventSource(`${API_BASE_URL}/pdf-jobs/${id}/progress`);
    },

    getDownloadUrl: (fileId: string): string =>
      `${API_BASE_URL}/pdf-files/${fileId}/download`,
  },
};

export { ApiError };
