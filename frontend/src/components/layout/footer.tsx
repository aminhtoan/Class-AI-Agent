import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full py-8 px-gutter border-t border-border-subtle bg-surface-container-low mt-section-gap">
      <div className="max-w-[800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="text-sm font-medium text-secondary">StoryBridge</span>
          <span className="text-xs text-on-secondary-container">
            © 2024 StoryBridge. Anonymous & Encrypted.
          </span>
        </div>
        <nav className="flex gap-6">
          <Link
            href="#"
            className="text-xs text-on-secondary-container hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="#"
            className="text-xs text-on-secondary-container hover:underline"
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="text-xs text-on-secondary-container hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            Github
          </Link>
        </nav>
      </div>
    </footer>
  );
}
