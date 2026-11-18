import React from 'react';
import { activateCardSurface } from '@/lib/card-surface';

const CardSurface = React.forwardRef(function CardSurface({ as: Component = 'article', onClick, ...props }, ref) {
  return <Component
    {...props}
    ref={ref}
    data-card-surface=""
    onClick={onClick || activateCardSurface}
  />;
});

export default CardSurface;
