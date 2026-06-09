'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', id, ...rest }, ref) => {
    const checkboxId =
      id || label?.toLowerCase().replace(/\s+/g, '-') || undefined;

    return (
      <label
        htmlFor={checkboxId}
        className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}
      >
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className="h-4 w-4 rounded border-border-strong text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed accent-primary-600"
          {...rest}
        />
        {label && (
          <span className="text-sm text-text-primary">{label}</span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
