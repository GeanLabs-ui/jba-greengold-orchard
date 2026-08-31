import { useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { resolveSkeleton } from './skeleton-routes';

const widths = ['w-[88%]', 'w-[72%]', 'w-[94%]', 'w-[64%]', 'w-[81%]'];

const B = ({ className = '', ...props }) => <Skeleton aria-hidden="true" className={className} {...props} />;

function Lines({ count = 3, light = false, className = '' }) {
  return <div className={cn('space-y-2.5', className)}>{Array.from({ length: count }, (_, index) => <B key={index} className={cn('h-3', widths[index % widths.length], light && 'skeleton-on-dark')} />)}</div>;
}

function PageHeading({ action = true, compact = false }) {
  return <div className="flex items-start justify-between gap-5"><div className="min-w-0 space-y-2"><B className={cn('h-7', compact ? 'w-44' : 'w-60 max-w-[70vw]')} /><B className="h-3.5 w-80 max-w-[76vw]" /></div>{action && <B className="hidden h-10 w-32 shrink-0 sm:block" />}</div>;
}

function Metrics({ count = 4, joined = false }) {
  return <div className={cn('grid gap-3 sm:grid-cols-2', count === 3 ? 'lg:grid-cols-3' : 'xl:grid-cols-4', joined && 'gap-px overflow-hidden rounded-xl border bg-border')}>
    {Array.from({ length: count }, (_, index) => <div key={index} className={cn('bg-card p-5', !joined && 'rounded-xl border shadow-sm')}><div className="flex items-start justify-between gap-4"><div className="space-y-3"><B className="h-3 w-20" /><B className={cn('h-7', index % 2 ? 'w-24' : 'w-32')} /><B className="h-2.5 w-16" /></div><B className="h-10 w-10 rounded-lg" /></div></div>)}
  </div>;
}

function Table({ rows = 6, columns = 5, toolbar = true, tall = false }) {
  return <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
    {toolbar && <div className="flex items-center justify-between gap-4 border-b px-4 py-3.5"><B className="h-4 w-36" /><div className="flex gap-2"><B className="h-8 w-28" /><B className="hidden h-8 w-20 sm:block" /></div></div>}
    <div className="border-b bg-muted/40 px-4 py-3"><div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, index) => <B key={index} className="h-2.5 w-3/5" />)}</div></div>
    <div className="divide-y px-4">{Array.from({ length: rows }, (_, row) => <div key={row} className={cn('grid items-center gap-4 py-3.5', tall && 'py-5')} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, column) => <B key={column} className={cn('h-3', column === 0 ? widths[row % widths.length] : column === columns - 1 ? 'w-16 rounded-full' : 'w-3/4')} />)}</div>)}</div>
  </section>;
}

function Chart({ bars = 9, className = '' }) {
  return <section className={cn('rounded-xl border bg-card p-5 shadow-sm', className)}><div className="flex items-center justify-between"><B className="h-4 w-40" /><B className="h-8 w-24" /></div><div className="mt-7 flex h-52 items-end gap-2 border-b border-l px-3 pt-4">{Array.from({ length: bars }, (_, index) => <B key={index} className="min-w-3 flex-1 rounded-b-none" style={{ height: `${28 + ((index * 23) % 68)}%` }} />)}</div><div className="mt-4 flex justify-between"><B className="h-2.5 w-16" /><B className="h-2.5 w-20" /><B className="h-2.5 w-14" /></div></section>;
}

function CardList({ count = 4, avatar = true, horizontal = false }) {
  return <div className={cn(horizontal ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>{Array.from({ length: count }, (_, index) => <section key={index} className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-center gap-3">{avatar && <B className="h-11 w-11 shrink-0 rounded-lg" />}<div className="min-w-0 flex-1 space-y-2"><B className={cn('h-4', index % 2 ? 'w-36' : 'w-44')} /><B className="h-3 w-4/5" /></div><B className="h-7 w-16 shrink-0 rounded-full" /></div>{horizontal && <Lines count={2} className="mt-5 border-t pt-4" />}</section>)}</div>;
}

function Tabs({ count = 4 }) {
  return <div className="flex gap-2 overflow-hidden">{Array.from({ length: count }, (_, index) => <B key={index} className={cn('h-9 shrink-0', index === 0 ? 'w-28' : 'w-24')} />)}</div>;
}

function Filters({ count = 3 }) {
  return <div className="flex flex-wrap gap-2">{Array.from({ length: count }, (_, index) => <B key={index} className={cn('h-10', index === 0 ? 'w-56 max-w-full' : 'w-32')} />)}</div>;
}

function FormGrid({ fields = 8, sidebar = false }) {
  const form = <section className="rounded-xl border bg-card p-5 shadow-sm md:p-6"><B className="h-5 w-44" /><div className="mt-6 grid gap-5 sm:grid-cols-2">{Array.from({ length: fields }, (_, index) => <div key={index} className={cn('space-y-2', index > fields - 3 && 'sm:col-span-2')}><B className="h-3 w-24" /><B className={cn('w-full', index > fields - 3 ? 'h-24' : 'h-10')} /></div>)}</div></section>;
  if (!sidebar) return form;
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_340px]">{form}<section className="space-y-5 rounded-xl border bg-card p-5 shadow-sm"><B className="h-5 w-36" /><B className="h-36 w-full" /><Lines count={4} /><B className="h-10 w-full" /></section></div>;
}

function Calendar() {
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><section className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="flex items-center justify-between border-b p-4"><div className="flex gap-2"><B className="h-8 w-8" /><B className="h-8 w-8" /></div><B className="h-5 w-32" /><B className="h-8 w-24" /></div><div className="grid grid-cols-7 border-b bg-muted/30">{Array.from({ length: 7 }, (_, index) => <div key={index} className="p-3"><B className="mx-auto h-2.5 w-8" /></div>)}</div><div className="grid grid-cols-7">{Array.from({ length: 35 }, (_, index) => <div key={index} className="min-h-20 border-b border-r p-2"><B className="h-3 w-5 rounded-full" />{index % 4 === 0 && <B className="mt-3 h-5 w-full" />}</div>)}</div></section><section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"><div className="flex justify-between"><B className="h-5 w-32" /><B className="h-8 w-8" /></div><CardList count={4} avatar={false} /></section></div>;
}

function Board() {
  return <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }, (_, column) => <section key={column} className="rounded-xl border bg-muted/25 p-3"><div className="mb-4 flex justify-between"><B className="h-4 w-28" /><B className="h-5 w-6 rounded-full" /></div><CardList count={column === 1 ? 3 : 2} avatar={false} /></section>)}</div>;
}

function AdminContent({ template, contentOnly = false }) {
  const heading = !contentOnly && <PageHeading action={!['settings', 'profile'].includes(template)} />;
  switch (template) {
    case 'dashboard': return <div className="space-y-6">{heading}<Metrics /><div className="grid gap-5 lg:grid-cols-3"><Chart className="lg:col-span-2" /><Chart bars={5} /></div><div className="grid gap-5 xl:grid-cols-2"><Table rows={4} columns={3} /><CardList count={4} /></div></div>;
    case 'analytics': return <div className="space-y-5">{heading}<Filters count={5} /><Metrics count={4} joined /><div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_360px]"><Chart bars={12} /><CardList count={5} avatar={false} /></div><Table rows={5} columns={6} /></div>;
    case 'finance': return contentOnly ? <Table rows={5} columns={6} /> : <div className="space-y-5">{heading}<Filters count={4} /><Metrics /><div className="grid gap-5 lg:grid-cols-2"><Chart bars={10} /><Chart bars={7} /></div><Table rows={5} columns={6} /></div>;
    case 'calendar': return <div className="space-y-5">{heading}<Metrics count={4} joined /><Calendar /></div>;
    case 'directory': return contentOnly ? <CardList count={6} horizontal /> : <div className="space-y-5">{heading}<Filters count={3} /><Metrics count={3} /><CardList count={6} horizontal /></div>;
    case 'applications': return contentOnly ? <CardList count={5} /> : <div className="space-y-5">{heading}<Metrics count={3} /><Filters count={3} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_300px]"><CardList count={5} /><section className="rounded-xl border bg-card p-5"><B className="h-5 w-32" /><Lines count={6} className="mt-5" /></section></div></div>;
    case 'profile': return <div className="space-y-5">{heading}<section className="rounded-xl border bg-card p-5"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><B className="h-20 w-20 rounded-xl" /><div className="flex-1 space-y-3"><B className="h-8 w-64 max-w-full" /><B className="h-4 w-44" /><div className="flex gap-2"><B className="h-7 w-20 rounded-full" /><B className="h-7 w-24 rounded-full" /></div></div><B className="h-10 w-28" /></div></section><Metrics /><Tabs count={5} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_340px]"><Table rows={5} columns={4} /><CardList count={4} /></div></div>;
    case 'block-profile': return <div className="space-y-5">{heading}<section className="rounded-xl border bg-card p-5"><div className="flex items-center gap-4"><B className="h-14 w-14 rounded-full" /><div className="flex-1 space-y-2"><B className="h-7 w-56" /><B className="h-3 w-72 max-w-full" /></div><B className="h-9 w-24" /></div></section><Metrics count={4} joined /><Tabs count={6} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]"><Chart bars={8} /><section className="rounded-xl border bg-card p-5"><B className="h-5 w-36" /><div className="mt-5 grid grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, i) => <B key={i} className="h-20 w-full" />)}</div></section></div><Table rows={5} columns={5} /></div>;
    case 'form': return <div className="space-y-5">{heading}<FormGrid fields={10} sidebar /></div>;
    case 'schedule': return <div className="space-y-5">{heading}<Filters count={4} /><Metrics count={3} /><Board /></div>;
    case 'task': return <div className="space-y-5">{heading}<section className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center gap-3"><B className="h-7 w-64" /><B className="h-7 w-20 rounded-full" /><B className="ml-auto h-10 w-36" /></div><Lines count={2} className="mt-4" /></section><Tabs count={4} /><FormGrid fields={8} sidebar /></div>;
    case 'risk': return <div className="space-y-5">{heading}<Metrics count={4} /><div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]"><section className="rounded-xl border bg-card p-5"><B className="h-5 w-36" /><div className="mt-5 space-y-4">{Array.from({ length: 5 }, (_, index) => <div key={index}><div className="mb-2 flex justify-between"><B className="h-3 w-24" /><B className="h-3 w-8" /></div><B className="h-2 w-full rounded-full" /></div>)}</div></section><Table rows={6} columns={5} /></div></div>;
    case 'activity-log': return <div className="space-y-5">{heading}<Filters count={4} /><Table rows={8} columns={6} tall /></div>;
    case 'approvals': return <div className="space-y-5">{heading}<Metrics count={3} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><Table rows={6} columns={5} tall /><CardList count={4} avatar={false} /></div></div>;
    case 'harvest': return contentOnly ? <div className="grid gap-5 lg:grid-cols-2"><Chart bars={8} /><CardList count={4} /></div> : <div className="space-y-5">{heading}<Filters count={4} /><Metrics /><div className="grid gap-5 lg:grid-cols-2"><Chart bars={8} /><section className="rounded-xl border bg-card p-5"><B className="h-5 w-40" /><div className="mt-6 grid grid-cols-2 gap-4">{Array.from({ length: 4 }, (_, i) => <B key={i} className="h-24 w-full rounded-xl" />)}</div></section></div><Table rows={5} columns={6} /></div>;
    case 'harvest-log': return <div className="space-y-5">{heading}<Metrics count={3} joined /><Filters count={4} /><Table rows={7} columns={6} /></div>;
    case 'logistics-board': return <div className="space-y-5">{heading}<Metrics count={3} /><Filters count={3} /><Board /></div>;
    case 'budget': return <div className="space-y-5">{heading}<Filters count={4} /><div className="grid gap-5 lg:grid-cols-2"><Chart bars={9} /><Chart bars={6} /></div><Table rows={5} columns={6} /></div>;
    case 'equipment': return contentOnly ? <CardList count={6} horizontal /> : <div className="space-y-5">{heading}<Metrics count={3} /><Filters count={3} /><CardList count={6} horizontal /></div>;
    case 'equipment-log': return <div className="space-y-5">{heading}<Metrics count={3} /><Filters count={4} /><Table rows={7} columns={6} /></div>;
    case 'report-table': return <div className="space-y-5">{heading}<Filters count={4} /><Metrics count={3} joined /><Table rows={7} columns={6} /></div>;
    case 'reports': return <div className="space-y-5">{heading}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <section key={index} className="rounded-xl border bg-card p-5"><B className="h-10 w-10 rounded-lg" /><B className="mt-5 h-5 w-32" /><Lines count={2} className="mt-3" /></section>)}</div><div className="grid gap-5 lg:grid-cols-2"><Chart /><Chart bars={6} /></div><Table rows={4} columns={5} /></div>;
    case 'documents': return <div className="space-y-5">{heading}{!contentOnly && <Tabs count={3} />}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <section key={index} className="rounded-xl border bg-card p-5"><div className="flex justify-between"><B className="h-11 w-11 rounded-lg" /><B className="h-8 w-8" /></div><B className="mt-5 h-4 w-36" /><Lines count={2} className="mt-3" /></section>)}</div></div>;
    case 'settings': return <div className="space-y-5">{heading}<div className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 4 }, (_, card) => <section key={card} className="rounded-xl border bg-card p-6"><div className="flex items-center gap-3 border-b pb-4"><B className="h-10 w-10 rounded-lg" /><div className="space-y-2"><B className="h-4 w-36" /><B className="h-3 w-52 max-w-full" /></div></div><div className="mt-5 space-y-5">{Array.from({ length: 3 }, (_, field) => <div key={field}><B className="mb-2 h-3 w-24" /><B className="h-10 w-full" /></div>)}</div></section>)}</div></div>;
    default: return contentOnly ? <Table rows={6} columns={5} /> : <div className="space-y-5">{heading}<Metrics count={3} /><Filters count={3} /><Table rows={6} columns={5} /></div>;
  }
}

function Hero({ split = false, compact = false }) {
  return <section className={cn('relative overflow-hidden bg-[#0b432f]', compact ? 'min-h-[23rem]' : 'min-h-[34rem]')}><div className={cn('mx-auto grid h-full max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:px-10', split && 'lg:grid-cols-2 lg:items-center')}><div className="max-w-xl space-y-5 self-center"><B className="skeleton-on-dark h-3 w-28" /><B className="skeleton-on-dark h-12 w-[88%] max-w-lg" /><B className="skeleton-on-dark h-12 w-[65%] max-w-md" /><Lines count={3} light /><div className="flex gap-3 pt-3"><B className="skeleton-on-dark h-11 w-32" /><B className="skeleton-on-dark h-11 w-28" /></div></div>{split && <B className="skeleton-on-dark min-h-64 w-full rounded-2xl lg:min-h-80" />}</div>{!split && <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-white/[0.035] lg:block"><B className="skeleton-on-dark h-full w-full rounded-none" /></div>}</section>;
}

function PublicContent({ template, contentOnly = false }) {
  if (template === 'home') return <div><Hero /><section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div><B className="h-7 w-56" /><Lines count={4} className="mt-5" /></div><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <B key={index} className="aspect-[4/5] w-full rounded-xl" />)}</div></div></section></div>;
  if (template === 'catalog') return <div>{!contentOnly && <Hero compact />}<section className="mx-auto max-w-7xl space-y-7 px-5 py-12 sm:px-8 lg:px-10"><Filters count={4} /><div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <article key={index}><B className="aspect-[4/5] w-full rounded-xl" /><B className="mt-4 h-4 w-3/4" /><B className="mt-2 h-3 w-1/2" /></article>)}</div></section></div>;
  if (template === 'cart' || template === 'checkout') return <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8"><PageHeading action={false} /><div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_360px]">{template === 'cart' ? <CardList count={4} /> : <FormGrid fields={8} />}<section className="h-fit rounded-xl border bg-[#fffdf7] p-6 shadow-sm"><B className="h-5 w-36" /><Lines count={5} className="mt-6" /><B className="mt-6 h-12 w-full" /></section></div></section>;
  if (template === 'orders') return <section className={cn('mx-auto max-w-6xl space-y-6', !contentOnly && 'px-5 py-12 sm:px-8')}>{!contentOnly && <PageHeading />}<Filters count={2} /><CardList count={5} avatar /></section>;
  if (template === 'farms') return <div>{!contentOnly && <Hero split />}<section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10"><div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"><CardList count={5} /><B className="min-h-[30rem] w-full rounded-2xl" /></div><div className="mt-10 grid gap-5 lg:grid-cols-3"><B className="h-72 w-full rounded-xl" /><section className="rounded-xl border p-5"><Lines count={7} /></section><B className="h-72 w-full rounded-xl" /></div></section></div>;
  if (template === 'farm-detail') return <div>{!contentOnly && <Hero compact />}<section className="mx-auto max-w-7xl space-y-8 px-5 py-12 sm:px-8 lg:px-10"><Metrics count={3} /><div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]"><div><B className="h-7 w-52" /><Lines count={6} className="mt-5" /></div><B className="h-72 w-full rounded-2xl" /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <B key={i} className="aspect-square rounded-xl" />)}</div></section></div>;
  if (template === 'article') return <article className="mx-auto max-w-4xl px-5 py-12 sm:px-8"><B className="h-3 w-24" /><B className="mt-5 h-10 w-[92%]" /><B className="mt-3 h-10 w-2/3" /><B className="mt-5 h-3 w-36" /><B className="mt-9 aspect-[16/8] w-full rounded-2xl" /><Lines count={12} className="mt-9" /></article>;
  if (template === 'news' || template === 'media' || template === 'careers') return <div>{!contentOnly && <Hero compact split={template === 'careers'} />}<section className={cn('mx-auto max-w-7xl', !contentOnly && 'px-5 py-12 sm:px-8 lg:px-10')}>{!contentOnly && <div className="mb-8 flex justify-between"><B className="h-7 w-52" /><B className="h-10 w-40" /></div>}<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <article key={index}><B className={cn('w-full rounded-xl', template === 'careers' ? 'h-36' : 'aspect-[4/3]')} /><B className="mt-4 h-5 w-4/5" /><Lines count={2} className="mt-3" /></article>)}</div></section></div>;
  if (template === 'contact') return <div>{!contentOnly && <Hero compact />}<section className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]"><div><B className="h-7 w-44" /><Lines count={6} className="mt-5" /><B className="mt-8 h-48 w-full rounded-xl" /></div><FormGrid fields={6} /></section></div>;
  if (template === 'legal') return <article className="mx-auto max-w-4xl px-5 py-12 sm:px-8"><PageHeading action={false} /><div className="mt-10 space-y-9">{Array.from({ length: 6 }, (_, index) => <section key={index}><B className="h-5 w-48" /><Lines count={index % 2 ? 3 : 5} className="mt-4" /></section>)}</div></article>;
  if (template === 'export') return <div>{!contentOnly && <Hero />}<section className="mx-auto max-w-7xl space-y-12 px-5 py-14 sm:px-8 lg:px-10"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index}><B className="h-40 w-full rounded-xl" /><B className="mt-4 h-4 w-28" /></div>)}</div><B className="h-80 w-full rounded-2xl" /></section></div>;
  if (template === 'about') return <div>{!contentOnly && <Hero split />}<section className="mx-auto max-w-7xl space-y-14 px-5 py-14 sm:px-8 lg:px-10"><div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]"><div><B className="h-8 w-56" /><Lines count={7} className="mt-6" /></div><B className="h-80 w-full rounded-2xl" /></div><div className="grid gap-6 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <section key={i} className="border-t pt-5"><B className="h-7 w-28" /><Lines count={3} className="mt-4" /></section>)}</div></section></div>;
  if (template === 'sustainability') return <div>{!contentOnly && <Hero />}<section className="mx-auto max-w-7xl space-y-12 px-5 py-14 sm:px-8 lg:px-10"><Metrics count={3} /><div className="grid gap-8 lg:grid-cols-2"><B className="h-96 w-full rounded-2xl" /><div className="space-y-8">{Array.from({ length: 3 }, (_, i) => <section key={i}><B className="h-6 w-48" /><Lines count={4} className="mt-4" /></section>)}</div></div></section></div>;
  if (template === 'local-supply') return <div>{!contentOnly && <Hero compact split />}<section className="mx-auto max-w-7xl space-y-14 px-5 py-14 sm:px-8 lg:px-10"><div className="grid gap-6 md:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <section key={i}><B className="h-44 w-full rounded-xl" /><B className="mt-5 h-5 w-36" /><Lines count={3} className="mt-3" /></section>)}</div><div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]"><B className="h-80 w-full rounded-2xl" /><div><B className="h-8 w-56" /><Lines count={6} className="mt-5" /><B className="mt-6 h-11 w-32" /></div></div></section></div>;
  return <div>{!contentOnly && <Hero split />}<section className="mx-auto max-w-7xl space-y-12 px-5 py-14 sm:px-8 lg:px-10"><div className="grid gap-10 lg:grid-cols-2"><div><B className="h-8 w-64" /><Lines count={6} className="mt-6" /></div><B className="h-80 w-full rounded-2xl" /></div><div className="grid gap-6 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <section key={i}><B className="h-12 w-12 rounded-full" /><B className="mt-4 h-5 w-32" /><Lines count={3} className="mt-3" /></section>)}</div></section></div>;
}

function PortalContent({ template, contentOnly = false }) {
  const heading = !contentOnly && <PageHeading action={template === 'portal-orders'} />;
  if (template === 'portal-dashboard') return <div className="space-y-6">{heading}<Metrics /><div className="grid gap-6 lg:grid-cols-2"><Table rows={4} columns={3} /><CardList count={4} /></div><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <B key={i} className="h-24 w-full rounded-xl" />)}</div></div>;
  if (template === 'portal-payments') return contentOnly ? <Table rows={6} columns={6} /> : <div className="space-y-5">{heading}<Metrics count={3} /><Tabs count={2} /><Table rows={6} columns={6} /></div>;
  if (template === 'portal-documents') return <div className="space-y-5">{heading}{!contentOnly && <Metrics count={3} />}<B className="h-5 w-28" /><CardList count={5} /></div>;
  return contentOnly ? <Table rows={6} columns={5} /> : <div className="space-y-5">{heading}<Filters count={2} /><Table rows={6} columns={5} /></div>;
}

function AuthContent() {
  return <div className="grid min-h-screen place-items-center bg-muted/30 px-5"><section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-xl"><B className="mx-auto h-14 w-40" /><B className="mx-auto mt-8 h-7 w-48" /><B className="mx-auto mt-3 h-3 w-64 max-w-full" /><div className="mt-8 space-y-5">{Array.from({ length: 2 }, (_, index) => <div key={index}><B className="mb-2 h-3 w-20" /><B className="h-11 w-full" /></div>)}<B className="h-11 w-full" /></div></section></div>;
}

function PublicChrome({ children }) {
  return <div className="skeleton-shell min-h-screen bg-[#fffdf7]"><header className="flex h-[4.5rem] items-center border-b border-[#0b432f]/10 px-5 sm:px-8 lg:px-10"><div className="mx-auto flex w-full max-w-7xl items-center justify-between"><B className="h-11 w-32" /><div className="hidden gap-4 lg:flex">{Array.from({ length: 8 }, (_, i) => <B key={i} className="h-3 w-14" />)}</div><div className="flex gap-2"><B className="h-10 w-10" /><B className="hidden h-10 w-32 sm:block" /></div></div></header>{children}</div>;
}

function PortalChrome({ children }) {
  return <div className="skeleton-shell flex min-h-screen bg-muted/30"><aside className="hidden w-64 shrink-0 border-r bg-card p-4 lg:block"><B className="h-12 w-36" /><div className="mt-8 space-y-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-lg p-3"><B className="h-4 w-4" /><B className="h-3 w-24" /></div>)}</div></aside><div className="min-w-0 flex-1"><header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6"><B className="h-5 w-28" /><div className="ml-auto flex items-center gap-3"><B className="h-9 w-9 rounded-full" /><B className="h-9 w-9 rounded-full" /></div></header><main className="p-4 md:p-6">{children}</main></div></div>;
}

function AdminChrome({ children }) {
  return <div className="admin-theme skeleton-shell min-h-screen bg-background"><header className="flex h-16 items-center gap-3 border-b bg-card px-4 md:px-6"><B className="hidden h-11 w-24 xl:block" /><div className="hidden items-center gap-2 rounded-xl bg-[#1b5e20] p-1 xl:flex">{Array.from({ length: 5 }, (_, index) => <B key={index} className="skeleton-on-dark h-9 w-24" />)}</div><B className="hidden h-10 min-w-40 max-w-sm flex-1 md:block" /><div className="ml-auto flex gap-2"><B className="h-9 w-9 rounded-full" /><B className="h-9 w-9 rounded-full" /><B className="h-9 w-9 rounded-full" /></div></header><main className="p-4 md:p-6">{children}</main></div>;
}

export default function PageSkeleton({ pathname, variant, className = '', fullPage = false, contentOnly = false }) {
  const location = useLocation();
  const descriptor = resolveSkeleton(pathname || location.pathname);
  const template = variant === 'analytics' ? 'analytics' : variant && variant !== 'page' ? variant : descriptor.template;
  const content = descriptor.area === 'admin' ? <AdminContent template={template} contentOnly={contentOnly} /> : descriptor.area === 'portal' ? <PortalContent template={template} contentOnly={contentOnly} /> : descriptor.area === 'auth' ? <AuthContent /> : <PublicContent template={template} contentOnly={contentOnly} />;
  const accessibleContent = <div aria-busy="true" aria-live="polite" aria-label={`Loading ${descriptor.label}`} className={cn('route-skeleton', className)}><span className="sr-only">Loading {descriptor.label}</span>{content}</div>;
  if (!fullPage || descriptor.area === 'auth') return accessibleContent;
  if (descriptor.area === 'admin') return <AdminChrome>{accessibleContent}</AdminChrome>;
  if (descriptor.area === 'portal') return <PortalChrome>{accessibleContent}</PortalChrome>;
  return <PublicChrome>{accessibleContent}</PublicChrome>;
}
