import { useLayoutEffect } from 'react';

// Stack each page's own navigation without assuming fixed toolbar heights.
export default function usePinnedPageNavigation(rootRef, routeKey) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame;
    let pinned = [];
    const observed = new Set();
    const resize = new ResizeObserver(() => schedule());
    const update = () => {
      pinned.forEach((node) => { node.removeAttribute('data-page-pinned'); node.style.removeProperty('--page-pin-top'); });
      // Phones keep the compact section navigation pinned; large headers,
      // filters and summaries scroll normally so they cannot cover the page.
      const selector = window.matchMedia('(max-width: 767px)').matches
        ? '.farm-activities-sticky-nav, [role="tablist"], .drc-view-nav'
        : '[data-page-navigation], [role="tablist"], .farm-activities-sticky-nav, .analytics-kpis, .drc-schedule-sticky, .drc-programme-bar, .drc-view-nav';
      const candidates = [...root.querySelectorAll(selector)]
        .filter((node) => node.getClientRects().length && node.textContent.trim() && !node.closest('[role="dialog"]'));
      pinned = candidates.filter((node) => !candidates.some((parent) => parent !== node && parent.contains(node)));
      let top = root.closest('.portal-shell')
        ? root.closest('.portal-shell').querySelector('header').getBoundingClientRect().height
        : parseFloat(getComputedStyle(root).getPropertyValue('--admin-page-inset')) || 0;
      pinned.forEach((node, index) => {
        node.style.setProperty('--page-pin-layer', String(45 - index));
        node.style.setProperty('--page-pin-cover', index === 0 ? 'calc(-1 * var(--admin-page-inset, 16px))' : '-8px');
        node.style.setProperty('--page-pin-top', `${top}px`);
        node.setAttribute('data-page-pinned', '');
        top += node.getBoundingClientRect().height + 8;
        if (!observed.has(node)) { resize.observe(node); observed.add(node); }
      });
      observed.forEach((node) => { if (!pinned.includes(node)) { resize.unobserve(node); observed.delete(node); } });
      root.style.setProperty('--page-navigation-height', `${top}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect();
      window.removeEventListener('resize', schedule);
      pinned.forEach((node) => { node.removeAttribute('data-page-pinned'); node.style.removeProperty('--page-pin-top'); });
    };
  }, [rootRef, routeKey]);
}
