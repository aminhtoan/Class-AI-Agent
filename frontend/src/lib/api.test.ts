import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from './api';

describe('API Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('stories.list', () => {
    it('fetches stories successfully', async () => {
      const mockStories = [
        { id: '1', title: 'Story 1', status: 'ready' },
        { id: '2', title: 'Story 2', status: 'pending' },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStories,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        }),
      });

      const result = await api.stories.list();

      expect(result.data).toEqual(mockStories);
      expect(result.pagination.total).toBe(2);
    });

    it('handles pagination parameters', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
        }),
      });

      await api.stories.list({ page: 2, limit: 10 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
    });
  });

  describe('stories.create', () => {
    it('creates a story successfully', async () => {
      const newStory = {
        id: '1',
        sourceUrl: 'https://example.com/story',
        title: null,
        status: 'pending',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: newStory }),
      });

      const result = await api.stories.create({ sourceUrl: 'https://example.com/story' });

      expect(result).toEqual(newStory);
    });

    it('throws ApiError on failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid URL' },
        }),
      });

      await expect(
        api.stories.create({ sourceUrl: 'invalid' })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('crawlJobs.streamProgress', () => {
    it('returns EventSource instance', () => {
      const eventSource = api.crawlJobs.streamProgress('job-123');
      expect(eventSource).toBeInstanceOf(EventSource);
    });
  });

  describe('pdfJobs.getDownloadUrl', () => {
    it('returns correct download URL', () => {
      const url = api.pdfJobs.getDownloadUrl('file-123');
      expect(url).toContain('/pdf-files/file-123/download');
    });
  });
});
