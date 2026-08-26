import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { groupYieldRecords } from '@/lib/farm-management';

const chartConfig = {
  actual: { label: 'Actual yield', color: '#198f3c' },
  forecast: { label: 'Forecast yield', color: '#72bd48' },
};

const labelForDate = (value, granularity) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (granularity === 'yearly') return String(date.getUTCFullYear());
  if (granularity === 'monthly') return date.toLocaleDateString('en-GH', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export default function YieldChart({ records = [], title = 'Yield trend' }) {
  const [granularity, setGranularity] = useState('monthly');
  const data = useMemo(() => groupYieldRecords(records, granularity), [records, granularity]);

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="yield-chart-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="yield-chart-title" className="font-heading text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Actual and forecast harvest weight in kilograms.</p>
        </div>
        <Select value={granularity} onValueChange={setGranularity}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Yield chart interval"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {data.length ? (
        <ChartContainer config={chartConfig} className="mt-5 h-[280px] w-full aspect-auto">
          <ComposedChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="actualYieldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.24} />
                <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(value) => labelForDate(value, granularity)} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={42} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => labelForDate(value, granularity)} />} />
            <Area type="monotone" dataKey="actual" stroke="var(--color-actual)" fill="url(#actualYieldFill)" strokeWidth={2.5} />
            <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </ComposedChart>
        </ChartContainer>
      ) : (
        <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No yield data for this period</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Once block yield records are added, actual and forecast trends will appear here.</p>
        </div>
      )}
    </section>
  );
}
