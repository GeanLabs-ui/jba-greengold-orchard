import { useEffect, useLayoutEffect } from 'react';

// Measure before paint in the browser; static rendering has no layout to measure.
export const useBrowserLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;
