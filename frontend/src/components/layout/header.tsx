'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface border-b border-border-subtle">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-2xl font-semibold text-primary">
          StoryBridge
        </Link>
      </div>
      <div className="hidden md:flex items-center gap-8">
        <nav className="flex gap-6">
          <Link
            href="/"
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            Recent
          </Link>
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            Support
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-surface-variant transition-colors text-primary">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </div>
      <div className="md:hidden">
        <button className="p-2 rounded-lg text-primary">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </header>
  );
}
