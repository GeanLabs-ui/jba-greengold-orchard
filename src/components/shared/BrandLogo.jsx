import React from 'react';
import { cn } from '@/lib/utils';

export default function BrandLogo({ className, imageClassName }) {
  return (
    <div className={cn('flex min-w-0 items-center', className)}>
      <img
        src="/brand/brand-logo.svg"
        alt="JBA GreenGold Orchard"
        className={cn('h-12 w-auto max-w-[210px] shrink-0 object-contain sm:h-14 sm:max-w-[260px]', imageClassName)}
      />
    </div>
  );
}
