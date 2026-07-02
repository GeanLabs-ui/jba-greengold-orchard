import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/components/shared/format';
import { cn } from '@/lib/utils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const statusColors = {
  planned: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const gradeDots = {
  premium: 'bg-purple-400',
  grade_a: 'bg-emerald-400',
  grade_b: 'bg-amber-400',
  grade_c: 'bg-orange-400',
  reject: 'bg-red-400',
};

export default function HarvestCalendar({ harvests, onSelectHarvest }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const harvestsByDate = useMemo(() => {
    const map = {};
    (harvests || []).forEach((h) => {
      if (!h.harvest_date) return;
      const key = h.harvest_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return map;
  }, [harvests]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const monthHarvests = (harvests || []).filter((h) => {
    if (!h.harvest_date) return false;
    const d = new Date(h.harvest_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const monthYield = monthHarvests.reduce((s, h) => s + (h.total_quantity || 0), 0);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(null);
  };

  const formatDateKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const selectedHarvests = selectedDate ? (harvestsByDate[formatDateKey(year, month, selectedDate)] || []) : [];

  return (
    <div>
      {/* Calendar header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-heading text-lg font-bold">{MONTHS[month]} {year}</h3>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="ghost" size="sm" onClick={goToday}>Today</Button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Harvests: <strong className="text-foreground">{monthHarvests.length}</strong></span>
          <span className="text-muted-foreground">Yield: <strong className="text-foreground">{formatNumber(monthYield)} kg</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="grid grid-cols-7 border-b border-border bg-muted/50">
              {DAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={i} className="min-h-[84px] border-b border-r border-border bg-muted/20" />;
                const key = formatDateKey(year, month, day);
                const dayHarvests = harvestsByDate[key] || [];
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const isSelected = selectedDate === day;
                const dayYield = dayHarvests.reduce((s, h) => s + (h.total_quantity || 0), 0);

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={cn(
                      'min-h-[84px] border-b border-r border-border p-1.5 text-left align-top transition-colors hover:bg-accent/5',
                      isSelected && 'ring-2 ring-primary ring-inset',
                      isToday && !isSelected && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                        isToday ? 'bg-primary text-white' : 'text-muted-foreground'
                      )}>{day}</span>
                      {dayHarvests.length > 0 && (
                        <span className="text-[10px] font-bold text-primary">{dayHarvests.length}</span>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayHarvests.slice(0, 2).map((h) => (
                        <div key={h.id} className={cn('flex items-center gap-1 rounded border px-1 py-0.5 text-[10px] font-medium', statusColors[h.status] || 'bg-muted text-muted-foreground border-border')}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', gradeDots[h.quality_grade] || 'bg-gray-400')} />
                          <span className="truncate">{h.farm_name || 'Farm'}</span>
                        </div>
                      ))}
                      {dayHarvests.length > 2 && (
                        <div className="px-1 text-[10px] text-muted-foreground">+{dayHarvests.length - 2} more</div>
                      )}
                    </div>
                    {dayYield > 0 && (
                      <div className="mt-1 text-[10px] text-muted-foreground">{formatNumber(dayYield)} kg</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side panel - selected day or month summary */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          {selectedDate ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Sprout className="h-4 w-4 text-primary" />
                <h4 className="font-heading font-bold">{MONTHS[month]} {selectedDate}, {year}</h4>
              </div>
              {selectedHarvests.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No harvests scheduled for this day.</p>
              ) : (
                <div className="space-y-3">
                  {selectedHarvests.map((h) => (
                    <div key={h.id} onClick={() => onSelectHarvest?.(h)} className="cursor-pointer rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{h.harvest_code}</span>
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', statusColors[h.status])}>{h.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{h.farm_name || 'Unknown Farm'}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <span className={cn('h-2 w-2 rounded-full', gradeDots[h.quality_grade] || 'bg-gray-400')} />
                          {h.quality_grade?.replace('_', ' ')}
                        </span>
                        <span className="font-semibold text-primary">{formatNumber(h.total_quantity || 0)} kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Sprout className="h-4 w-4 text-primary" />
                <h4 className="font-heading font-bold">{MONTHS[month]} Summary</h4>
              </div>
              <div className="space-y-3">
                {['planned','in_progress','completed','cancelled'].map((st) => {
                  const items = monthHarvests.filter((h) => h.status === st);
                  if (items.length === 0) return null;
                  const yieldSum = items.reduce((s, h) => s + (h.total_quantity || 0), 0);
                  return (
                    <div key={st} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize', statusColors[st])}>{st.replace('_', ' ')}</span>
                        <span className="text-xs font-semibold">{items.length}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatNumber(yieldSum)} kg total</p>
                    </div>
                  );
                })}
                {monthHarvests.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No harvests this month.</p>
                )}
              </div>
            </>
          )}

          {/* Legend */}
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Grades</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(gradeDots).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={cn('h-2 w-2 rounded-full', v)} />
                  {k.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}