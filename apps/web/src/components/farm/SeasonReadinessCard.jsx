import CardSurface from "@/components/shared/CardSurface";
import React from 'react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { blockLabel, scopeLabel } from '@/lib/farm-scope';
import { formatDate, humanize } from '@/lib/farm-management';
import { taskLogDate } from '@/lib/task-log-profile';
import { taskLogTaskLink } from '@/lib/season-readiness';

export default function SeasonReadinessCard({ icon: Icon, title, model, total, accent }) {
  const colors = { green: 'bg-lime-50 text-lime-700', gold: 'bg-amber-50 text-amber-600', leaf: 'bg-emerald-50 text-emerald-700' };
  const latestLink = model.records.map(taskLogTaskLink).find(Boolean);
  const Summary = latestLink ? Link : 'div';
  const taskRow = row => {
    const href = taskLogTaskLink(row);
    const Content = href ? Link : 'div';
    return (
      <li key={row.id}>
        <Content {...(href ? { to: href } : {})} className="block rounded-md px-2 py-2 text-caption hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
          <span className="block break-words font-semibold text-slate-800">{row.title || row.activity_title || row.description || row.category || title}</span>
          <span className="mt-0.5 block text-slate-500">
            {formatDate(taskLogDate(row))} · {blockLabel(row) || scopeLabel(row.shared_scope || row.farm_name) || 'Farm-level task'}
          </span>
          <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{humanize(row.status) || 'Not recorded'}</span>
        </Content>
      </li>
    );
  };
  return (
    <CardSurface aria-label={`${title} readiness`} className="min-w-0 rounded-lg border border-slate-100 bg-white p-3.5 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
      <Summary data-card-primary={latestLink ? true : undefined} {...(latestLink ? { to: latestLink, 'aria-label': `${title}: open latest task` } : {})} className="grid grid-cols-[auto_1fr] gap-x-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${colors[accent]}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h3 className="text-card-title text-slate-800">{title}</h3>
          <p className="mt-0.5 text-caption font-medium text-slate-600">{model.records.length ? `${model.records.length} ${model.records.length === 1 ? 'task' : 'tasks'} recorded` : 'No Daily Task Log records'}</p>
          <p className="mt-1 text-caption text-slate-500">{model.count} of {total} blocks with records</p>
          <p className="mt-2 text-caption text-slate-500">Task completion</p>
          <div className="mt-1 flex items-center gap-2">
            <Progress aria-label={`${title} task completion`} aria-valuenow={model.percent} value={model.percent} className="h-1.5 flex-1 bg-slate-100" />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-caption font-semibold text-slate-500">{model.percent}%</span>
          </div>
          <p className="mt-1.5 text-caption text-slate-500">{model.completed} completed · {model.pending} pending · {model.inProgress} in progress</p>
          {model.farmLevelCount > 0 ? <p className="mt-1 text-caption text-slate-500">{model.farmLevelCount} farm-level/shared {model.farmLevelCount === 1 ? 'task' : 'tasks'}</p> : null}
        </div>
      </Summary>
      {model.records.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-1">
          <p className="px-2 pt-1 text-caption font-medium text-emerald-700">Select a task to view its details</p>
          <ul className="mt-1 divide-y divide-slate-100">{model.records.slice(0, 3).map(taskRow)}</ul>
          {model.records.length > 3 ? <details className="mt-1"><summary className="cursor-pointer px-2 py-2 text-caption font-semibold text-emerald-700">Show {model.records.length - 3} more tasks</summary><ul className="divide-y divide-slate-100">{model.records.slice(3).map(taskRow)}</ul></details> : null}
        </div>
      ) : null}
    </CardSurface>
  );
}
