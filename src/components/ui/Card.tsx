import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-lg shadow-sm border border-border p-6 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
