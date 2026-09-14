import React from 'react';
import { cn } from '@/lib/utils';

export default function PageHeader({ title, description, children, className }) {
  const hasHeading = Boolean(title || description);

  if (!hasHeading && !children) return null;

  return (
    <div data-page-navigation className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-center', hasHeading ? 'sm:justify-between' : 'sm:justify-end', className)}>
      {hasHeading && (
        <div>
          {title && <h1 className="text-page-title">{title}</h1>}
          {description && <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
