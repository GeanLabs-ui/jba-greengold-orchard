import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { useAuth } from '@/lib/AuthContext';
import { canAccessAdminPath } from '@/lib/access-control';
import { adminNavSections, dashboardItem, isAdminNavItemActive } from './admin-navigation';

export default function AdminHorizontalNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [pinnedSection, setPinnedSection] = useState(null);
  const [previewedSection, setPreviewedSection] = useState(null);
  const [attentionCounts, setAttentionCounts] = useState({ inquiries: 0, orders: 0, calendar: 0 });

  useEffect(() => {
    let active = true;
    let timer;
    const loadCounts = () => Promise.all([
      base44.entities.Inquiry.list('-created_date', 250).catch(() => []),
      base44.entities.Order.list('-order_date', 250).catch(() => []),
      base44.entities.CalendarEvent.list('start_at', 250).catch(() => []),
      base44.account.reviews().catch(() => ({ verifications: [], changes: [] })),
    ]).then(([inquiries, orders, calendarEvents, accountReviews]) => {
      if (!active) return;
      const now = new Date();
      setAttentionCounts({
        inquiries: inquiries.filter((item) => item.status === 'new' || !item.status).length + (accountReviews.verifications?.length || 0) + (accountReviews.changes?.length || 0),
        orders: orders.filter((item) => item.status === 'confirmed').length,
        calendar: calendarEvents.filter((item) => new Date(item.end_at || item.start_at) < now && !['completed', 'cancelled'].includes(item.status)).length,
      });
    });
    loadCounts();
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(loadCounts, 120);
    }, ['Inquiry', 'Order', 'CalendarEvent']);
    const interval = window.setInterval(loadCounts, 30000);
    return () => { active = false; clearTimeout(timer); clearInterval(interval); unsubscribe(); };
  }, []);

  useEffect(() => {
    setPinnedSection(null);
    setPreviewedSection(null);
  }, [location.pathname]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setPinnedSection(null);
      setPreviewedSection(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const accessibleSections = adminNavSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessAdminPath(user, item.path)) }))
    .filter((section) => section.items.some((item) => !item.subheading));
  const isOpen = (sectionTitle) => (
    previewedSection ? previewedSection === sectionTitle : pinnedSection === sectionTitle
  );
  const closeMenus = () => {
    setPinnedSection(null);
    setPreviewedSection(null);
  };

  const renderAttentionBadge = (item) => {
    const count = item.countKey ? attentionCounts[item.countKey] : 0;
    if (!count) return null;
    return (
      <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-primary-foreground">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <nav className="admin-horizontal-menu hidden shrink-0 items-center rounded-xl p-1 xl:flex" aria-label="Admin navigation">
      <Link
        to={dashboardItem.path}
        aria-current={isAdminNavItemActive(location.pathname, dashboardItem) ? 'page' : undefined}
        className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
          isAdminNavItemActive(location.pathname, dashboardItem)
            ? 'bg-primary text-primary-foreground'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <dashboardItem.icon className="h-4 w-4" />
        Dashboard
      </Link>

      {accessibleSections.map((section) => {
        const sectionOpen = isOpen(section.title);
        const hasActiveItem = section.items.some((item) => !item.subheading && isAdminNavItemActive(location.pathname, item));
        const SectionIcon = section.icon;
        return (
          <div
            key={section.title}
            className="relative"
            onMouseEnter={() => setPreviewedSection(section.title)}
            onMouseLeave={() => setPreviewedSection(null)}
            onFocusCapture={() => setPreviewedSection(section.title)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPreviewedSection(null);
            }}
          >
            <button
              type="button"
              aria-expanded={sectionOpen}
              aria-controls={`admin-horizontal-nav-${section.title.toLowerCase()}`}
              aria-label={`${section.title} navigation`}
              title={`${section.title} navigation`}
              onClick={() => {
                const isPinned = pinnedSection === section.title;
                setPinnedSection(isPinned ? null : section.title);
                if (isPinned) setPreviewedSection(null);
              }}
              className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
                sectionOpen || hasActiveItem
                  ? 'bg-white/10 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <SectionIcon className="h-4 w-4" />
              {section.title}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sectionOpen ? 'rotate-180' : ''}`} />
            </button>

            <div
              id={`admin-horizontal-nav-${section.title.toLowerCase()}`}
              className={`admin-horizontal-menu absolute left-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-xl border border-white/10 p-2 shadow-2xl transition-all duration-150 ${
                sectionOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
              }`}
            >
              <div className="max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin">
                {section.items.map((item) => {
                  if (item.subheading) {
                    return (
                      <p key={item.path} className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                        {item.label}
                      </p>
                    );
                  }
                  const ItemIcon = item.icon;
                  const active = isAdminNavItemActive(location.pathname, item);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMenus}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary/15 text-primary'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <ItemIcon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {renderAttentionBadge(item)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
