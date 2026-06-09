'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...rest }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[80px] ${
            error
              ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
              : 'border-border hover:border-border-strong'
          } ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error && textareaId ? `${textareaId}-error` : undefined
          }
          {...rest}
        />
        {error && (
          <p
            id={textareaId ? `${textareaId}-error` : undefined}
            className="text-sm text-danger-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
export default Textarea;
