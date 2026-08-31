import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/shared/BrandLogo';
import {
  ChevronDown, Leaf, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { useAuth } from '@/lib/AuthContext';
import { canAccessAdminPath } from '@/lib/access-control';
import { adminNavSections, dashboardItem, isAdminNavItemActive } from './admin-navigation';

export default function AdminSidebar({ collapsed = false, onToggleCollapsed }) {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState(() => new Set());
  const [hoveredSection, setHoveredSection] = useState(null);
  const [suppressedHoverSection, setSuppressedHoverSection] = useState(null);
  const [attentionCounts, setAttentionCounts] = useState({ inquiries: 0, orders: 0, calendar: 0 });

  useEffect(() => {
    let active = true;
    let timer;
    const loadCounts = () => Promise.all([
      base44.entities.Inquiry.list('-created_date', 250).catch(() => []),
      base44.entities.Order.list('-order_date', 250).catch(() => []),
      base44.entities.CalendarEvent.list('start_at', 250).catch(() => []),
    ]).then(([inquiries, orders, calendarEvents]) => {
      if (!active) return;
      const now = new Date();
      setAttentionCounts({
        inquiries: inquiries.filter((item) => item.status === 'new' || !item.status).length,
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

  const isItemActive = (item) => isAdminNavItemActive(location.pathname, item);
  const accessibleSections = adminNavSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessAdminPath(user, item.path)) }))
    .filter((section) => section.items.length > 0);
  const activeSection = accessibleSections.find((section) => section.items.some((item) => !item.subheading && isItemActive(item)))?.title || null;

  useEffect(() => {
    if (!activeSection) return;
    setExpandedSections((current) => {
      if (current.has(activeSection)) return current;
      return new Set(current).add(activeSection);
    });
  }, [location.pathname, activeSection]);

  const toggleSection = (sectionTitle) => {
    const isExpanded = expandedSections.has(sectionTitle);
    setExpandedSections((current) => {
      const next = new Set(current);
      if (isExpanded) next.delete(sectionTitle);
      else next.add(sectionTitle);
      return next;
    });
    setSuppressedHoverSection(isExpanded ? sectionTitle : null);
  };

  const previewSection = (sectionTitle) => {
    setSuppressedHoverSection(null);
    setHoveredSection(sectionTitle);
  };

  const clearSectionPreview = (sectionTitle) => {
    setHoveredSection((current) => current === sectionTitle ? null : current);
    setSuppressedHoverSection((current) => current === sectionTitle ? null : current);
  };

  const renderItem = (item, compact = collapsed) => {
    if (item.subheading) {
      return compact ? null : (
        <p key={item.path} className="mt-2 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {item.label}
        </p>
      );
    }

    const isActive = isItemActive(item);
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        title={compact ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${
          compact ? 'justify-center px-2' : 'gap-3 px-3'
        } ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
        {!compact && item.label}
        {item.countKey && attentionCounts[item.countKey] > 0 && (
          <span className={`${compact ? 'absolute ml-7 -mt-5 h-2.5 w-2.5 p-0' : 'ml-auto min-w-5 px-1.5 py-0.5'} rounded-full bg-primary text-center text-[10px] font-bold text-primary-foreground`}>
            {!compact && (attentionCounts[item.countKey] > 99 ? '99+' : attentionCounts[item.countKey])}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className={`admin-sidebar flex h-full shrink-0 flex-col border-r border-border bg-card transition-all duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex h-16 items-center border-b border-border ${collapsed ? 'justify-center px-2' : 'gap-2 px-4'}`}>
        {!collapsed && <BrandLogo className="h-16" />}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`${collapsed ? '' : 'ml-auto'} hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto scrollbar-thin py-4 ${collapsed ? 'px-2' : 'px-3'}`} aria-label="Admin navigation">
        <div className="mb-3">
          {!collapsed && <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview</p>}
          {renderItem(dashboardItem)}
        </div>

        {accessibleSections.map((section) => {
          const isOpen = expandedSections.has(section.title)
            || (hoveredSection === section.title && suppressedHoverSection !== section.title);
          const hasActiveItem = section.items.some((item) => !item.subheading && isItemActive(item));
          const SectionIcon = section.icon;

          return (
            <div
              key={section.title}
              className="relative mb-2"
              onMouseEnter={() => previewSection(section.title)}
              onMouseLeave={() => clearSectionPreview(section.title)}
              onFocusCapture={() => previewSection(section.title)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) clearSectionPreview(section.title);
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`admin-nav-${section.title.toLowerCase()}`}
                aria-label={`${section.title} navigation`}
                onClick={() => toggleSection(section.title)}
                title={`${section.title} navigation`}
                className={`flex w-full items-center rounded-lg py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
                  collapsed ? 'justify-center px-2' : 'gap-2 px-3'
                } ${
                  isOpen || hasActiveItem
                    ? 'bg-muted/70 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <SectionIcon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{section.title}</span>}
                {!collapsed && <ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
              </button>

              <div
                id={`admin-nav-${section.title.toLowerCase()}`}
                className={`${
                  collapsed
                    ? `absolute left-[calc(100%+0.5rem)] top-0 z-50 w-64 rounded-xl border border-border bg-card p-2 shadow-xl transition-all duration-150 ${isOpen ? 'visible translate-x-0 opacity-100' : 'invisible -translate-x-1 opacity-0'}`
                    : `grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`
                }`}
              >
                <div className={`${collapsed ? '' : 'min-h-0 pt-1'}`}>
                  <div className={collapsed ? 'flex flex-col' : 'ml-3 border-l border-border/80 pl-2'}>
                    {section.items.map((item) => renderItem(item, false))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className={`border-t border-border ${collapsed ? 'p-2' : 'p-3'}`}>
        <Link
          to="/"
          title={collapsed ? 'Back to Website' : undefined}
          className={`flex items-center rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
            collapsed ? 'justify-center px-2' : 'gap-2 px-3'
          }`}
        >
          <Leaf className="h-4 w-4" />
          {!collapsed && 'Back to Website'}
        </Link>
      </div>
    </aside>
  );
}
