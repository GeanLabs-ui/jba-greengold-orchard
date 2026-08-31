import React from 'react';
import { cn } from '@/lib/utils';

export default function MetricCard({ title, value, icon: Icon, trend, trendUp, color = 'primary', subtitle }) {
  const semanticColor = /cost|expense/i.test(title) ? 'red' : /yield/i.test(title) ? 'green' : /revenue|sales/i.test(title) ? 'blue' : color;
  const colorClasses = {
    primary: 'metric-tone-primary from-amber-500 to-orange-500 text-white',
    green: 'metric-tone-green from-emerald-500 to-green-600 text-white',
    blue: 'metric-tone-blue from-blue-500 to-indigo-600 text-white',
    purple: 'metric-tone-purple from-violet-500 to-purple-600 text-white',
    red: 'metric-tone-red from-red-500 to-rose-600 text-white',
    amber: 'metric-tone-amber from-amber-400 to-yellow-500 text-white',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 font-heading text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br', colorClasses[semanticColor])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </div>
      )}
    </div>
  );
}
