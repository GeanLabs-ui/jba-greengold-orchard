import React from 'react';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://media.base44.com/images/public/6a46e07bc7a700bfb99375f8/f3c9b0559_image.png';

export default function BrandLogo({ className }) {
  return (
    <img
      src={LOGO_URL}
      alt="JBA GreenGold Orchard"
      className={cn('h-20 w-auto object-contain', className)}
    />
  );
}