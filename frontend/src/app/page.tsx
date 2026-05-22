'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Card, CardHeader, CardFooter, StatusBadge, Button, ProgressBar } from '@/components/ui';
import { useStories, useCreateStory, useDeleteStory } from '@/lib/hooks';
import type { Story, StoryStatus } from '@/types/api';

function StoryCard({ story, onDelete }: { story: Story; onDelete: (id: string) => void }) {
  const isReady = story.status === 'ready';
  const isCrawling = story.status === 'crawling';

  return (
    <Card hoverable={isReady}>
      <Link href={`/stories/${story.id}`} className="block">
        <CardHeader>
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-on-surface group-hover:text-primary transition-colors">
              {story.title || 'Untitled Story'}
            </h3>
            <p className="text-sm font-medium text-secondary mt-1">
              {story.author ? `By ${story.author}` : 'Unknown Author'} •{' '}
              {new URL(story.sourceUrl).hostname}
            </p>
          </div>
          <StatusBadge status={story.status as StoryStatus} />
        </CardHeader>
      </Link>

      {isCrawling && (
        <div className="mt-stack-md">
          <ProgressBar progress={65} label="Indexing Chapters" />
        </div>
      )}

      <CardFooter>
        {isReady ? (
          <>
            <div className="flex gap-4">
              <Link
                href={`/stories/${story.id}/pdf`}
                className="text-xs font-medium text-on-surface-variant hover:text-primary flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                PDF
              </Link>
              <button className="text-xs font-medium text-on-surface-variant hover:text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">share</span>
                Share
              </button>
            </div>
            <span className="text-xs font-medium text-outline">
              {story.chapterCount || 0} Chapters
            </span>
          </>
        ) : story.status === 'pending' ? (
          <>
            <p className="text-xs font-medium text-outline italic">Waiting in queue</p>
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete(story.id);
              }}
              className="text-xs font-medium text-error hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              Cancel
            </button>
          </>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function IngestInput({ onSubmit, isLoading }: { onSubmit: (url: string) => void; isLoading: boolean }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
      setUrl('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="ambient-shadow bg-surface-container-lowest border border-border-subtle rounded-xl p-2 flex flex-col md:flex-row items-center gap-2 transition-all duration-300 focus-within:border-primary-container focus-within:ring-2 focus-within:ring-primary-container/10">
        <div className="flex-1 flex items-center px-4 w-full">
          <span className="material-symbols-outlined text-outline mr-3">link</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full h-14 border-none bg-transparent focus:ring-0 focus:outline-none text-lg text-on-surface placeholder:text-outline-variant"
            placeholder="Paste story or article URL here..."
            required
          />
        </div>
        <Button
          type="submit"
          icon="auto_stories"
          size="lg"
          loading={isLoading}
          className="w-full md:w-auto"
        >
          Ingest Story
        </Button>
      </div>
      <div className="mt-stack-md flex items-center justify-center gap-4">
        <span className="text-xs font-medium text-outline flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">encrypted</span>
          Zero logs
        </span>
        <span className="text-xs font-medium text-outline flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">timer</span>
          Avg. 15s crawl
        </span>
      </div>
    </form>
  );
}

export default function HomePage() {
  const { data, isLoading, error } = useStories();
  const createStory = useCreateStory();
  const deleteStory = useDeleteStory();

  const handleIngest = (url: string) => {
    createStory.mutate({ sourceUrl: url });
  };

  const handleDelete = (id: string) => {
    deleteStory.mutate(id);
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-20 flex-1">
        <section className="max-w-[800px] mx-auto px-gutter mb-section-gap text-center">
          <div className="mb-stack-lg">
            <h1 className="text-5xl font-bold tracking-tight mb-stack-sm text-on-surface">
              Distill any web story.
            </h1>
            <p className="text-lg text-on-surface-variant">
              Anonymous, encrypted conversion from volatile web pages to clean, permanent PDF documents.
            </p>
          </div>
          <IngestInput onSubmit={handleIngest} isLoading={createStory.isPending} />
          {createStory.isError && (
            <p className="mt-4 text-sm text-error">
              Failed to create story. Please check the URL and try again.
            </p>
          )}
        </section>

        <section className="max-w-[800px] mx-auto px-gutter">
          <div className="flex items-center justify-between mb-stack-lg border-b border-border-subtle pb-4">
            <h2 className="text-2xl font-semibold text-on-surface">Recent Stories</h2>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-surface-variant transition-colors text-outline">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button className="p-2 rounded-lg hover:bg-surface-variant transition-colors text-outline">
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">
                sync
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-error mb-2">error</span>
              <p className="text-on-surface-variant">Failed to load stories</p>
            </div>
          ) : data?.data.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-outline mb-4">
                auto_stories
              </span>
              <p className="text-on-surface-variant">
                No stories yet. Paste a URL above to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-stack-md">
              {data?.data.map((story) => (
                <StoryCard key={story.id} story={story} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {data && data.pagination.totalPages > 1 && (
            <div className="mt-stack-lg flex justify-center">
              <Button variant="outline">View Archive</Button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
