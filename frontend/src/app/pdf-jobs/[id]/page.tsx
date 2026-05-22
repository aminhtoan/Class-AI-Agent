'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Card, Button, ProgressBar } from '@/components/ui';
import { usePdfJob, useStory, useJobProgress } from '@/lib/hooks';
import { api } from '@/lib/api';
import type { JobStatus } from '@/types/api';

function ProcessingView({
  storyTitle,
  progress,
  progressDone,
  progressTotal,
}: {
  storyTitle: string;
  progress: number;
  progressDone: number;
  progressTotal: number;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-stack-lg relative w-full aspect-video md:aspect-[21/9] rounded-xl overflow-hidden bg-surface-container-low border border-border-subtle">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-surface/90 backdrop-blur-md px-6 py-4 rounded-lg border border-border-subtle shadow-lg flex items-center gap-4">
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
            <span className="text-sm font-medium text-on-surface">Assembling Chapters...</span>
          </div>
        </div>
      </div>
      <div className="w-full text-left space-y-stack-md">
        <div className="flex justify-between items-end">
          <h1 className="text-3xl font-semibold text-on-surface">{storyTitle}</h1>
          <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
        </div>
        <ProgressBar progress={progress} variant="gradient" showPercentage={false} />
        <div className="flex justify-between text-on-surface-variant">
          <span className="text-xs font-medium">Processing Meta-tags & Typography</span>
          <span className="text-xs font-medium">
            {progressDone} of {progressTotal} Steps
          </span>
        </div>
      </div>
    </div>
  );
}

function SuccessView({
  storyTitle,
  fileName,
  fileSize,
  downloadUrl,
  storyId,
}: {
  storyTitle: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  storyId: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col items-center text-center transition-all duration-700">
      <div className="mb-stack-lg">
        <div className="w-24 h-24 rounded-full bg-status-ready/10 flex items-center justify-center border-4 border-status-ready/20 animate-bounce">
          <span
            className="material-symbols-outlined text-status-ready text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
      </div>
      <h1 className="text-3xl font-semibold text-on-surface mb-stack-sm">Document Ready</h1>
      <p className="text-lg text-on-surface-variant mb-stack-lg max-w-md mx-auto">
        &quot;{storyTitle}&quot; has been successfully converted into a high-fidelity PDF document.
      </p>

      <Card className="w-full mb-section-gap">
        <div className="flex flex-col md:flex-row items-center gap-gutter">
          <div className="w-16 h-16 bg-primary-container/10 rounded-lg flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
          </div>
          <div className="text-left flex-1 min-w-0">
            <h3 className="text-2xl font-semibold text-on-surface truncate">{fileName}</h3>
            <p className="text-sm font-medium text-on-surface-variant uppercase tracking-wider">
              {formatFileSize(fileSize)} • High-Quality PDF
            </p>
          </div>
          <a href={downloadUrl} download>
            <Button icon="download" size="lg" className="shadow-md shadow-primary/20">
              Download PDF
            </Button>
          </a>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md w-full">
        <Button variant="outline" icon={copied ? 'check' : 'share'} onClick={handleCopyLink}>
          {copied ? 'Copied!' : 'Copy Anonymous Link'}
        </Button>
        <Link href={`/stories/${storyId}`}>
          <Button variant="outline" icon="arrow_back" className="w-full">
            Back to Story
          </Button>
        </Link>
      </div>
    </div>
  );
}

function FailedView({ storyId, errorMessage }: { storyId: string; errorMessage?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-stack-lg">
        <div className="w-24 h-24 rounded-full bg-status-failed/10 flex items-center justify-center border-4 border-status-failed/20">
          <span
            className="material-symbols-outlined text-status-failed text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
        </div>
      </div>
      <h1 className="text-3xl font-semibold text-on-surface mb-stack-sm">Generation Failed</h1>
      <p className="text-lg text-on-surface-variant mb-stack-lg max-w-md mx-auto">
        {errorMessage || 'An error occurred while generating the PDF. Please try again.'}
      </p>
      <div className="flex gap-4">
        <Link href={`/stories/${storyId}/pdf`}>
          <Button icon="refresh">Try Again</Button>
        </Link>
        <Link href={`/stories/${storyId}`}>
          <Button variant="outline" icon="arrow_back">
            Back to Story
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function PdfJobProgressPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { data: job, isLoading: jobLoading, error: jobError } = usePdfJob(jobId);
  const { data: story } = useStory(job?.storyId || '');

  const isActive = job?.status === 'pending' || job?.status === 'running';
  const liveProgress = useJobProgress('pdf', isActive ? jobId : null);

  const currentStatus = liveProgress?.status || job?.status;
  const progressDone = liveProgress?.progressDone ?? job?.progressDone ?? 0;
  const progressTotal = liveProgress?.progressTotal ?? job?.progressTotal ?? 1;
  const progressPercent = (progressDone / Math.max(progressTotal, 1)) * 100;

  if (jobLoading) {
    return (
      <>
        <Header />
        <main className="pt-32 pb-section-gap px-gutter min-h-screen flex flex-col items-center flex-1">
          <div className="w-full max-w-[800px] flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">
              sync
            </span>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (jobError || !job) {
    return (
      <>
        <Header />
        <main className="pt-32 pb-section-gap px-gutter min-h-screen flex flex-col items-center flex-1">
          <div className="w-full max-w-[800px] text-center py-12">
            <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
            <p className="text-on-surface-variant mb-4">PDF job not found</p>
            <Button onClick={() => router.push('/')}>Back to Home</Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const storyTitle = story?.title || 'Untitled Story';

  return (
    <>
      <Header />
      <main className="pt-32 pb-section-gap px-gutter min-h-screen flex flex-col items-center flex-1">
        <div className="w-full max-w-[800px]">
          {(currentStatus === 'pending' || currentStatus === 'running') && (
            <ProcessingView
              storyTitle={storyTitle}
              progress={progressPercent}
              progressDone={progressDone}
              progressTotal={progressTotal}
            />
          )}

          {currentStatus === 'succeeded' && job.file && (
            <SuccessView
              storyTitle={storyTitle}
              fileName={job.file.fileName}
              fileSize={job.file.fileSizeBytes}
              downloadUrl={api.pdfJobs.getDownloadUrl(job.file.id)}
              storyId={job.storyId}
            />
          )}

          {(currentStatus === 'failed' || currentStatus === 'cancelled') && (
            <FailedView storyId={job.storyId} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
