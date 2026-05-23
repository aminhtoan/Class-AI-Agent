'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Card, StatusBadge, Button, ProgressBar } from '@/components/ui';
import {
  useStory,
  useStoryChapters,
  useCrawlJobs,
  useCreateCrawlJob,
  useCancelCrawlJob,
  useDeleteStory,
  useJobProgress,
} from '@/lib/hooks';
import type { Chapter, ChapterStatus, CrawlMode } from '@/types/api';

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function ChapterRow({ chapter, position }: { chapter: Chapter; position: number }) {
  const isProcessing = chapter.status === 'pending';
  const isFailed = chapter.status === 'failed';

  return (
    <tr
      className={`hover:bg-surface-container-lowest transition-colors ${
        isProcessing ? 'bg-primary/5' : ''
      }`}
    >
      <td className="px-6 py-4 text-sm font-medium text-outline">
        {String(position).padStart(3, '0')}
      </td>
      <td className="px-6 py-4 font-medium text-on-surface">{chapter.title}</td>
      <td className="px-6 py-4">
        <StatusBadge status={chapter.status as ChapterStatus} />
      </td>
      <td className="px-6 py-4 text-right">
        {chapter.status === 'fetched' && (
          <button className="material-symbols-outlined text-outline hover:text-primary transition-colors">
            visibility
          </button>
        )}
        {isFailed && (
          <button className="material-symbols-outlined text-outline hover:text-primary transition-colors">
            refresh
          </button>
        )}
      </td>
    </tr>
  );
}

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [completedCrawlTime, setCompletedCrawlTime] = useState<number | null>(null);

  const { data: story, isLoading: storyLoading, error: storyError } = useStory(storyId);
  const { data: chaptersData, isLoading: chaptersLoading } = useStoryChapters(storyId, {
    limit: 50,
  });
  const { data: crawlJobs } = useCrawlJobs(storyId);

  const createCrawlJob = useCreateCrawlJob();
  const cancelCrawlJob = useCancelCrawlJob();
  const deleteStory = useDeleteStory();

  const activeCrawlJob = crawlJobs?.find(
    (job) => job.status === 'pending' || job.status === 'running'
  );
  const progress = useJobProgress('crawl', activeCrawlJob?.id ?? null);

  // Track when crawl completes to show total time
  useEffect(() => {
    if (progress?.status === 'succeeded' && progress.totalMs) {
      setCompletedCrawlTime(progress.totalMs);
      const timer = setTimeout(() => setCompletedCrawlTime(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [progress?.status, progress?.totalMs]);

  const handleStartCrawl = () => {
    createCrawlJob.mutate({
      storyId,
      dto: { mode: 'toc-and-chapters' as CrawlMode },
    });
  };

  const handleCancelCrawl = () => {
    if (activeCrawlJob) {
      cancelCrawlJob.mutate(activeCrawlJob.id);
    }
  };

  const handleDeleteStory = () => {
    if (confirm('Are you sure you want to delete this story?')) {
      deleteStory.mutate(storyId, {
        onSuccess: () => {
          router.push('/');
        },
      });
    }
  };

  if (storyLoading) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 px-gutter max-w-[800px] mx-auto flex-1">
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">
              sync
            </span>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (storyError || !story) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 px-gutter max-w-[800px] mx-auto flex-1">
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
            <p className="text-on-surface-variant mb-4">Story not found</p>
            <Button onClick={() => router.push('/')}>Back to Home</Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const chapters = chaptersData?.data || [];
  const fetchedCount = chapters.filter((c) => c.status === 'fetched').length;
  const failedCount = chapters.filter((c) => c.status === 'failed').length;
  const pendingCount = chapters.filter((c) => c.status === 'pending').length;

  const currentProgress = progress
    ? (progress.progressDone / Math.max(progress.progressTotal, 1)) * 100
    : activeCrawlJob
    ? (activeCrawlJob.progressDone / Math.max(activeCrawlJob.progressTotal, 1)) * 100
    : 0;

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-gutter max-w-[800px] mx-auto flex-1">
        <section className="mb-stack-lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <nav className="flex items-center gap-2 mb-2">
                <Link href="/" className="text-xs font-medium text-secondary uppercase tracking-wider hover:text-primary">
                  Home
                </Link>
                <span className="material-symbols-outlined text-sm text-outline">
                  chevron_right
                </span>
                <span className="text-xs font-medium text-outline uppercase tracking-wider">
                  Story Detail
                </span>
              </nav>
              <h1 className="text-3xl font-semibold text-on-surface tracking-tight">
                {story.title || 'Untitled Story'}
              </h1>
              <p className="text-on-surface-variant mt-1">
                Source:{' '}
                <a
                  href={story.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-outline-variant hover:text-primary"
                >
                  {story.sourceUrl}
                </a>
              </p>
            </div>
            <div className="flex gap-2">
              {story.status === 'ready' && (
                <Link href={`/stories/${storyId}/pdf`}>
                  <Button icon="picture_as_pdf">Generate PDF</Button>
                </Link>
              )}
              {(story.status === 'pending' || story.status === 'ready') && !activeCrawlJob && (
                <Button
                  icon="play_arrow"
                  onClick={handleStartCrawl}
                  loading={createCrawlJob.isPending}
                >
                  Start Crawl
                </Button>
              )}
              {activeCrawlJob && (
                <Button
                  variant="danger"
                  icon="close"
                  onClick={handleCancelCrawl}
                  loading={cancelCrawlJob.isPending}
                >
                  Cancel Job
                </Button>
              )}
              {!activeCrawlJob && (
                <Button
                  variant="outline"
                  icon="delete"
                  onClick={handleDeleteStory}
                  loading={deleteStory.isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-xs font-medium text-secondary block mb-1">Total Chapters</span>
              <span className="text-2xl font-semibold">{story.chapterCount || chapters.length}</span>
            </Card>
            <Card className="p-4">
              <span className="text-xs font-medium text-secondary block mb-1">Status</span>
              <StatusBadge status={story.status} />
            </Card>
            <Card className="p-4">
              <span className="text-xs font-medium text-secondary block mb-1">Language</span>
              <span className="text-2xl font-semibold">{story.language || 'Auto'}</span>
            </Card>
            <Card className="p-4">
              <span className="text-xs font-medium text-secondary block mb-1">Author</span>
              <span className="text-2xl font-semibold truncate">{story.author || 'Unknown'}</span>
            </Card>
          </div>
        </section>

        {activeCrawlJob && (
          <section className="mb-stack-lg">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </div>
                  <h2 className="text-sm font-medium text-on-surface uppercase tracking-widest">
                    Live Progress
                  </h2>
                </div>
                <span className="text-xs font-medium text-on-surface-variant">
                  Fetching Chapter {progress?.progressDone || activeCrawlJob.progressDone}/
                  {progress?.progressTotal || activeCrawlJob.progressTotal} (
                  {Math.round(currentProgress)}%)
                </span>
              </div>
              <ProgressBar progress={currentProgress} showPercentage={false} />
              <div className="flex flex-wrap gap-4 items-center justify-between border-t border-border-subtle pt-6 mt-6">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-status-ready text-[18px]">
                      check_circle
                    </span>
                    <span className="text-xs font-medium text-on-surface-variant">
                      {fetchedCount} Fetched
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-status-pending text-[18px]">
                      sync
                    </span>
                    <span className="text-xs font-medium text-on-surface-variant">
                      {pendingCount} Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-status-failed text-[18px]">
                      error
                    </span>
                    <span className="text-xs font-medium text-on-surface-variant">
                      {failedCount} Failed
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    timer
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {progress?.elapsedMs ? formatTime(progress.elapsedMs) : '0s'}
                  </span>
                </div>
              </div>
            </Card>
          </section>
        )}

        {completedCrawlTime && !activeCrawlJob && (
          <section className="mb-stack-lg">
            <Card className="p-4 bg-status-ready/10 border-status-ready/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-status-ready text-2xl">
                    check_circle
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Crawl completed successfully!</p>
                    <p className="text-xs text-on-surface-variant">
                      Fetched {chapters.length} chapters in {formatTime(completedCrawlTime)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCompletedCrawlTime(null)}
                  className="text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </Card>
          </section>
        )}

        <section className="mb-section-gap">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-on-surface">Table of Contents</h3>
              <p className="text-sm font-medium text-on-surface-variant">
                Manage individual chapter ingestion states
              </p>
            </div>
            <button className="flex items-center gap-2 text-primary text-sm font-medium hover:underline">
              <span className="material-symbols-outlined text-[20px]">checklist</span>
              Select All Chapters
            </button>
          </div>

          <Card className="p-0 overflow-hidden">
            {chaptersLoading ? (
              <div className="flex justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">
                  sync
                </span>
              </div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">
                  menu_book
                </span>
                <p className="text-on-surface-variant">
                  No chapters yet. Start a crawl to fetch chapters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-border-subtle">
                    <tr>
                      <th className="px-6 py-4 text-xs font-medium text-secondary uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="px-6 py-4 text-xs font-medium text-secondary uppercase tracking-wider">
                        Chapter Title
                      </th>
                      <th className="px-6 py-4 text-xs font-medium text-secondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-medium text-secondary uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {chapters.map((chapter, index) => (
                      <ChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        position={chapter.position || index + 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {chaptersData && chaptersData.pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline">Load More Chapters</Button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
