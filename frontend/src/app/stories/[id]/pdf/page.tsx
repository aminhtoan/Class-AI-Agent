'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { useStory, useStoryChapters, useChapterContent, useCreatePdfJob } from '@/lib/hooks';
import type { Chapter } from '@/types/api';

function ChapterSelector({
  chapters,
  selectedIds,
  onToggle,
  onSelectAll,
  currentPreviewId,
  onPreviewSelect,
}: {
  chapters: Chapter[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  currentPreviewId: string | null;
  onPreviewSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-outline uppercase">Select Chapters</h3>
        <button
          onClick={onSelectAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          {selectedIds.size === chapters.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {chapters.map((chapter, index) => {
          const isSelected = selectedIds.has(chapter.id);
          const isCurrent = chapter.id === currentPreviewId;

          return (
            <label
              key={chapter.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer group ${
                isCurrent
                  ? 'border-primary bg-primary-container/10'
                  : 'border-border-subtle bg-surface-container-lowest hover:border-primary/30'
              }`}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                  onPreviewSelect(chapter.id);
                }
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(chapter.id)}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-outline'}`}>
                  CH {String(chapter.position || index + 1).padStart(2, '0')}
                  {isCurrent && ' (Preview)'}
                </span>
                <span className="text-base text-on-surface group-hover:text-primary transition-colors truncate">
                  {chapter.title}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ChapterPreview({ chapterId }: { chapterId: string }) {
  const { data: content, isLoading, error } = useChapterContent(chapterId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-4xl text-outline mb-2">article</span>
        <p className="text-on-surface-variant">Content not available</p>
      </div>
    );
  }

  return (
    <div
      className="prose prose-slate max-w-none"
      dangerouslySetInnerHTML={{ __html: content.contentHtml || content.contentText }}
    />
  );
}

export default function PdfConfigPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const { data: story, isLoading: storyLoading } = useStory(storyId);
  const { data: chaptersData, isLoading: chaptersLoading } = useStoryChapters(storyId, {
    limit: 100,
    status: 'fetched',
  });

  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());
  const [includeCover, setIncludeCover] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [previewChapterId, setPreviewChapterId] = useState<string | null>(null);

  const createPdfJob = useCreatePdfJob();

  const chapters = chaptersData?.data || [];
  const currentChapter = chapters.find((c) => c.id === previewChapterId);

  const estimatedSize = useMemo(() => {
    const baseSize = 0.1;
    const perChapter = 0.3;
    const selected = selectedChapterIds.size || chapters.length;
    return (baseSize + selected * perChapter).toFixed(1);
  }, [selectedChapterIds.size, chapters.length]);

  const handleToggleChapter = (id: string) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedChapterIds.size === chapters.length) {
      setSelectedChapterIds(new Set());
    } else {
      setSelectedChapterIds(new Set(chapters.map((c) => c.id)));
    }
  };

  const handleGeneratePdf = () => {
    createPdfJob.mutate(
      {
        storyId,
        dto: {
          includeCover,
          includeToc,
          chapterIds: selectedChapterIds.size > 0 ? Array.from(selectedChapterIds) : [],
        },
      },
      {
        onSuccess: (job) => {
          router.push(`/pdf-jobs/${job.id}`);
        },
      }
    );
  };

  if (storyLoading || chaptersLoading) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-12 min-h-screen flex-1">
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

  if (!story) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-12 min-h-screen flex-1">
          <div className="max-w-[800px] mx-auto px-gutter text-center py-12">
            <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
            <p className="text-on-surface-variant mb-4">Story not found</p>
            <Button onClick={() => router.push('/')}>Back to Home</Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-24 pb-12 min-h-screen flex-1">
        <div className="max-w-[1200px] mx-auto px-gutter grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-medium text-on-secondary-container">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <Link href={`/stories/${storyId}`} className="hover:text-primary">
                {story.title || 'Story'}
              </Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="font-semibold text-primary">PDF Export</span>
            </div>

            <Card className="overflow-hidden p-0">
              <div className="px-8 py-10 border-b border-border-subtle bg-surface-container-lowest">
                {currentChapter ? (
                  <>
                    <span className="text-sm font-medium text-primary uppercase tracking-widest mb-2 block">
                      Chapter {String(currentChapter.position).padStart(2, '0')}
                    </span>
                    <h1 className="text-3xl font-semibold text-on-surface">
                      {currentChapter.title}
                    </h1>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-primary uppercase tracking-widest mb-2 block">
                      Preview
                    </span>
                    <h1 className="text-3xl font-semibold text-on-surface">
                      {story.title || 'Untitled Story'}
                    </h1>
                  </>
                )}
              </div>
              <div className="px-8 py-12 max-w-prose mx-auto">
                {previewChapterId ? (
                  <ChapterPreview chapterId={previewChapterId} />
                ) : (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-6xl text-outline mb-4">
                      menu_book
                    </span>
                    <p className="text-on-surface-variant">
                      Click a chapter on the right to preview its content
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {previewChapterId && (
              <div className="flex justify-between items-center bg-white border border-border-subtle p-4 rounded-lg">
                <button
                  onClick={() => {
                    const currentIndex = chapters.findIndex((c) => c.id === previewChapterId);
                    if (currentIndex > 0) {
                      setPreviewChapterId(chapters[currentIndex - 1].id);
                    }
                  }}
                  disabled={chapters.findIndex((c) => c.id === previewChapterId) === 0}
                  className="flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Previous Chapter
                </button>
                <span className="text-xs font-medium text-outline">
                  {chapters.findIndex((c) => c.id === previewChapterId) + 1} of {chapters.length}
                </span>
                <button
                  onClick={() => {
                    const currentIndex = chapters.findIndex((c) => c.id === previewChapterId);
                    if (currentIndex < chapters.length - 1) {
                      setPreviewChapterId(chapters[currentIndex + 1].id);
                    }
                  }}
                  disabled={
                    chapters.findIndex((c) => c.id === previewChapterId) === chapters.length - 1
                  }
                  className="flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary transition-colors disabled:opacity-50"
                >
                  Next Chapter
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            )}
          </section>

          <aside className="lg:col-span-4 flex flex-col gap-6">
            <div className="sticky top-24">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary text-[28px]">
                    picture_as_pdf
                  </span>
                  <h2 className="text-2xl font-semibold text-on-surface">PDF Export</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-medium text-outline uppercase mb-4">Settings</h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-base text-on-surface">Include Cover Page</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeCover}
                            onChange={(e) => setIncludeCover(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                      </label>
                      <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-base text-on-surface">Generate Table of Contents</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeToc}
                            onChange={(e) => setIncludeToc(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <ChapterSelector
                    chapters={chapters}
                    selectedIds={selectedChapterIds}
                    onToggle={handleToggleChapter}
                    onSelectAll={handleSelectAll}
                    currentPreviewId={previewChapterId}
                    onPreviewSelect={setPreviewChapterId}
                  />
                </div>

                <div className="mt-8 pt-6 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-secondary">Est. File Size</span>
                    <span className="text-sm font-bold text-on-surface">{estimatedSize} MB</span>
                  </div>
                  <Button
                    icon="download"
                    size="lg"
                    className="w-full shadow-lg shadow-primary/20"
                    onClick={handleGeneratePdf}
                    loading={createPdfJob.isPending}
                  >
                    Generate PDF
                  </Button>
                  <p className="text-[11px] text-center text-outline mt-3">
                    Conversion takes approx. 15-30 seconds
                  </p>
                </div>
              </Card>

              <div className="mt-6 p-4 bg-secondary-container/30 border border-secondary-container rounded-lg flex gap-4 items-start">
                <span className="material-symbols-outlined text-secondary">info</span>
                <div>
                  <p className="text-sm font-semibold text-on-secondary-container">Pro Tip</p>
                  <p className="text-xs text-on-secondary-container opacity-80 mt-1">
                    Check &apos;Include Cover&apos; to use the story&apos;s original metadata and summary
                    as the first page.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
