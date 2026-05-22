import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, error, className, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full h-14 border bg-transparent rounded-lg text-lg text-on-surface placeholder:text-outline-variant',
            'focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container focus:outline-none',
            'transition-all',
            icon ? 'pl-12 pr-4' : 'px-4',
            error ? 'border-error' : 'border-border-subtle',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
