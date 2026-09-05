import React from 'react';
import { cn } from '@/lib/utils';

export default function MetricCard({ title, value, icon: Icon, trend, trendUp, color = 'primary', subtitle }) {
  const semanticColor = /cost|expense/i.test(title) ? 'red' : /yield/i.test(title) ? 'green' : /revenue|sales/i.test(title) ? 'blue' : color;
  const colorClasses = {
    primary: 'metric-tone-primary bg-primary/10',
    green: 'metric-tone-green bg-emerald-50',
    blue: 'metric-tone-blue bg-blue-50',
    purple: 'metric-tone-purple bg-violet-50',
    red: 'metric-tone-red bg-red-50',
    amber: 'metric-tone-amber bg-amber-50',
  };

  return (
    <div className="rounded border border-border bg-card p-5 shadow-none transition-colors hover:border-primary/35">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 font-heading text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-11 w-11 items-center justify-center rounded', colorClasses[semanticColor])}>
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
