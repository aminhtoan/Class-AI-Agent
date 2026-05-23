'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from './api';
import type {
  Story,
  Chapter,
  TocItem,
  CrawlJob,
  PdfJob,
  CreateStoryDto,
  CreateCrawlJobDto,
  CreatePdfJobDto,
  ListStoriesParams,
  ListChaptersParams,
  JobStatus,
} from '@/types/api';

export function useStories(params?: ListStoriesParams) {
  return useQuery({
    queryKey: ['stories', params],
    queryFn: () => api.stories.list(params),
  });
}

export function useStory(id: string) {
  return useQuery({
    queryKey: ['story', id],
    queryFn: () => api.stories.get(id),
    enabled: !!id,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateStoryDto) => api.stories.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.stories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useStoryToc(storyId: string) {
  return useQuery({
    queryKey: ['story', storyId, 'toc'],
    queryFn: () => api.stories.getToc(storyId),
    enabled: !!storyId,
  });
}

export function useStoryChapters(storyId: string, params?: ListChaptersParams) {
  return useQuery({
    queryKey: ['story', storyId, 'chapters', params],
    queryFn: () => api.stories.getChapters(storyId, params),
    enabled: !!storyId,
  });
}

export function useChapterContent(chapterId: string) {
  return useQuery({
    queryKey: ['chapter', chapterId, 'content'],
    queryFn: () => api.chapters.getContent(chapterId),
    enabled: !!chapterId,
  });
}

export function useCrawlJobs(storyId: string) {
  return useQuery({
    queryKey: ['story', storyId, 'crawl-jobs'],
    queryFn: () => api.crawlJobs.listByStory(storyId),
    enabled: !!storyId,
  });
}

export function useCreateCrawlJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, dto }: { storyId: string; dto: CreateCrawlJobDto }) =>
      api.crawlJobs.create(storyId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['story', variables.storyId, 'crawl-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['story', variables.storyId] });
    },
  });
}

export function useCancelCrawlJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.crawlJobs.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function usePdfJobs(storyId: string) {
  return useQuery({
    queryKey: ['story', storyId, 'pdf-jobs'],
    queryFn: () => api.pdfJobs.listByStory(storyId),
    enabled: !!storyId,
  });
}

export function usePdfJob(id: string) {
  return useQuery({
    queryKey: ['pdf-job', id],
    queryFn: () => api.pdfJobs.get(id),
    enabled: !!id,
  });
}

export function useCreatePdfJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, dto }: { storyId: string; dto: CreatePdfJobDto }) =>
      api.pdfJobs.create(storyId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['story', variables.storyId, 'pdf-jobs'] });
    },
  });
}

interface JobProgress {
  status: JobStatus;
  progressDone: number;
  progressTotal: number;
  elapsedMs?: number;
  totalMs?: number | null;
}

export function useJobProgress(
  type: 'crawl' | 'pdf',
  jobId: string | null
): JobProgress | null {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return;

    const eventSource =
      type === 'crawl'
        ? api.crawlJobs.streamProgress(jobId)
        : api.pdfJobs.streamProgress(jobId);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress({
          status: data.status,
          progressDone: data.progressDone,
          progressTotal: data.progressTotal,
          elapsedMs: data.elapsedMs,
          totalMs: data.totalMs,
        });

        const finishedStatuses: JobStatus[] = ['succeeded', 'failed', 'cancelled'];
        if (finishedStatuses.includes(data.status)) {
          eventSource.close();
          if (type === 'pdf') {
            queryClient.invalidateQueries({ queryKey: ['pdf-job', jobId] });
          } else {
            queryClient.invalidateQueries({ queryKey: ['story'] });
          }
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [type, jobId, queryClient]);

  return progress;
}
