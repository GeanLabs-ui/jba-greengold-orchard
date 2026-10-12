import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { canAccessAdminPath } from '@/lib/access-control';
import { adminNavSections, dashboardItem, isAdminNavItemActive } from './admin-navigation';

export default function AdminMobileNav({ user }) {
  const location = useLocation();
  const navRef = useRef(null);
  const triggerRefs = useRef({});
  const [pinned, setPinned] = useState(null);
  const [preview, setPreview] = useState(null);
  const closeMenus = () => { setPinned(null); setPreview(null); };
  const sections = adminNavSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.subheading && canAccessAdminPath(user, item.path)),
  }));
  const openTitle = sections.find((section) => section.title === (preview || pinned) && section.items.length)?.title;

  useEffect(() => { setPinned(null); setPreview(null); }, [location.key]);
  useEffect(() => {
    if (!openTitle) return;
    const dismiss = (event) => {
      if (!navRef.current?.contains(event.target)) { setPinned(null); setPreview(null); }
    };
    const escape = (event) => {
      if (event.key === 'Escape') {
        triggerRefs.current[openTitle]?.focus();
        setPinned(null);
        setPreview(null);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [openTitle]);

  const buttonClass = (active) => cn(
    'flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded px-1 text-caption font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    active ? 'bg-[#2e7d32] text-white' : 'text-[#355e3b] hover:bg-[#c8e6c9] hover:text-[#123524]',
  );

  return (
    <nav ref={navRef} className="admin-mobile-nav fixed inset-x-0 bottom-0 z-[70] grid grid-cols-4 border-t border-[#e8f5e9] bg-white px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 md:hidden" aria-label="Quick navigation"
      onPointerLeave={() => setPreview(null)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenus(); }}
    >
      {canAccessAdminPath(user, dashboardItem.path) ? (
        <Link to={dashboardItem.path} onClick={closeMenus} onPointerEnter={() => setPreview(null)} aria-current={isAdminNavItemActive(location.pathname, dashboardItem) ? 'page' : undefined} className={buttonClass(isAdminNavItemActive(location.pathname, dashboardItem))}>
          <LayoutDashboard className="h-4 w-4" /><span>Home</span>
        </Link>
      ) : <span aria-hidden="true" />}
      {sections.map((section) => {
        if (!section.items.length) return <span key={section.title} aria-hidden="true" />;
        const Icon = section.icon;
        const open = openTitle === section.title;
        const active = section.items.some((item) => isAdminNavItemActive(location.pathname, item));
        return (
          <React.Fragment key={section.title}>
            <button ref={(node) => { triggerRefs.current[section.title] = node; }} type="button" aria-expanded={open} aria-controls={`admin-mobile-${section.title.toLowerCase()}`} className={buttonClass(open || active)}
              onPointerEnter={(event) => { if (event.pointerType === 'mouse') setPreview(section.title); }}
              onClick={() => { setPreview(null); setPinned(pinned === section.title ? null : section.title); }}
            >
              <Icon className="h-4 w-4" /><span>{section.title}</span>
            </button>
            {open && (
              <div id={`admin-mobile-${section.title.toLowerCase()}`} role="region" aria-label={`${section.title} pages`} className="absolute inset-x-2 bottom-full rounded-t-xl border border-[#c8e6c9] bg-white p-2 text-[#123524] shadow-[0_-8px_30px_rgba(18,53,36,0.15)]">
                <div className="flex items-center justify-between border-b border-[#e8f5e9] px-3 pb-1">
                  <span className="text-sm font-semibold">{section.title}</span>
                  <button type="button" aria-label={`Close ${section.title} menu`} className="flex h-11 w-11 items-center justify-center rounded hover:bg-[#e8f5e9]" onClick={() => { triggerRefs.current[section.title]?.focus(); closeMenus(); }}><X className="h-4 w-4" /></button>
                </div>
                <div className="max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain py-1">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const selected = isAdminNavItemActive(location.pathname, item);
                    return <Link key={item.path} to={item.path} onClick={closeMenus} aria-current={selected ? 'page' : undefined} className={cn('flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 font-medium focus-visible:outline-primary', selected ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'text-[#123524] hover:bg-[#f4fbf5]')}><ItemIcon className="h-4 w-4 shrink-0" /><span>{item.label}</span></Link>;
                  })}
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
