import { Skeleton } from '@/components/ui/skeleton';

const bars = ['w-4/5', 'w-3/5', 'w-11/12', 'w-2/3', 'w-5/6'];

function SkeletonTable() {
  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div className="flex items-center justify-between border-b border-border px-5 py-4"><Skeleton className="h-5 w-36" /><Skeleton className="h-8 w-24" /></div>
    <div className="space-y-3 p-5">{bars.map((width, index) => <div key={index} className="grid grid-cols-[1.15fr_0.8fr_0.9fr_0.75fr] gap-4"><Skeleton className={`h-4 ${width}`} /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>)}</div>
  </section>;
}

export default function PageSkeleton({ variant = 'page', className = '' }) {
  const analytics = variant === 'analytics';
  return <div aria-busy="true" aria-label="Loading page content" className={`space-y-4 ${className}`}>
    <span className="sr-only">Loading page content</span>
    <div className="flex items-center justify-between gap-4"><div className="space-y-2"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-10 w-32" /></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <section key={item} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-28" /><Skeleton className="h-3 w-24" /></div></div></section>)}</div>
    {analytics ? <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.9fr)]"><section className="rounded-xl border border-border bg-card p-5 shadow-sm"><Skeleton className="mb-5 h-5 w-48" /><Skeleton className="h-56 w-full" /><div className="mt-5 space-y-3">{bars.slice(0, 4).map((width, index) => <Skeleton key={index} className={`h-4 ${width}`} />)}</div></section><section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}</section></div> : <SkeletonTable />}
  </div>;
}
