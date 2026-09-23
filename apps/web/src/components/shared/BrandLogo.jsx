import React from 'react';
import { cn } from '@/lib/utils';

export default function BrandLogo({ className, imageClassName, light = false }) {
  return (
    <div role="img" aria-label="JBA GreenGold Orchard" data-preserve-colors="true" className={cn('brand-lockup flex h-16 w-[150px] min-w-0 flex-col items-center justify-center', className)}>
      <img
        src="/brand/brand-logo.png"
        alt=""
        className={cn('min-h-0 w-full flex-1 object-contain', imageClassName)}
      />
      <svg aria-hidden="true" viewBox="0 0 340 30" className="h-[14px] w-full shrink-0 overflow-visible" style={{ fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 700 }}>
        <text x="170" y="24" textAnchor="middle" fontSize="28" textLength="336" lengthAdjust="spacingAndGlyphs">
          <tspan fill={light ? '#f4fbf5' : '#174d25'}>GREEN </tspan><tspan fill="#b88a08">GOLD </tspan><tspan fill={light ? '#f4fbf5' : '#174d25'}>ORCHARD</tspan>
        </text>
      </svg>
    </div>
  );
}
