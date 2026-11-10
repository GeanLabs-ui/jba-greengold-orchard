import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { aggregateChartPeriods } from '@/lib/analytics-periods';
import { formatChartValue, numericChartAxis } from '@/lib/analytics-chart-scale';
import { websiteSales } from '@/lib/finance-data';
import PageHeader from '@/components/shared/PageHeader';
import MetricCard from '@/components/shared/MetricCard';
import { Button } from '@/components/ui/button';
import { Banknote, ShoppingCart } from 'lucide-react';

export default function Reports() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    let generation = 0;
    const load = async () => {
      const request = ++generation;
      try {
        const records = await base44.entities.Order.listAll('-order_date');
        if (request !== generation) return;
        setOrders(websiteSales(records));
        setError('');
      } catch (failure) {
        if (request === generation) setError(failure.message || 'Unable to load sales reports.');
      }
    };
    void load();
    const unsubscribe = subscribeToDataChanges(load, ['Order']);
    return () => { generation += 1; unsubscribe(); };
  }, []);

  const rows = useMemo(() => aggregateChartPeriods(
    (orders || []).map(order => ({
      date: order.order_date || order.created_date,
      revenue: order.total_amount,
      orders: 1,
    })).filter(row => {
      const day = String(row.date || '').slice(0, 10);
      return (!start || day >= start) && (!end || day <= end);
    }), period, ['revenue', 'orders'],
  ), [orders, period, start, end]);
  const revenue = rows.reduce((total, row) => total + (row.revenue ?? 0), 0);
  const count = rows.reduce((total, row) => total + row.orders, 0);

  const exportCsv = () => {
    const csv = ['Period start,Website revenue (GHS),Website orders', ...rows.map(
      ({ key, revenue, orders }) => [key, revenue ?? '', orders].join(','),
    )].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'website-sales-report.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(15);
    doc.text('Website sales report', 14, 16);
    doc.setFontSize(10);
    let y = 28;
    for (const row of rows) {
      if (y > 278) {
        doc.addPage();
        y = 18;
      }
      doc.text(row.label, 14, y);
      doc.text(row.revenue == null ? 'Unavailable' : 'GHS ' + formatChartValue(row.revenue), 80, y);
      doc.text(formatChartValue(row.orders, 'orders'), 150, y);
      y += 7;
    }
    doc.save('website-sales-report.pdf');
  };

  return (
    <div>
      <PageHeader title="Reports">
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
        <Button variant="outline" size="sm" onClick={exportPdf} disabled={!rows.length}>Export PDF</Button>
      </PageHeader>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Recorded website orders" value={orders ? formatChartValue(count) : '—'} icon={ShoppingCart} />
        <MetricCard title="Website revenue" value={rows.some(row => row.revenue != null) ? formatChartValue(revenue, 'GHS') : '—'} icon={Banknote} />
      </div>
      <div className="my-4 flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-3">
        Group by
        <select className="rounded-md border bg-card px-3 py-2" value={period} onChange={(event) => setPeriod(event.target.value)}>
          {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(option => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}
        </select>
      </label>
        <label className="flex items-center gap-2">From <input type="date" className="rounded-md border bg-card px-2 py-1" value={start} onChange={event => setStart(event.target.value)} /></label>
        <label className="flex items-center gap-2">To <input type="date" className="rounded-md border bg-card px-2 py-1" value={end} onChange={event => setEnd(event.target.value)} /></label>
      </div>
      {!orders && !error ? <p role="status">Loading report data…</p> : orders && !rows.length ? (
        <p role="status" className="rounded-xl border bg-card p-6">No dated website orders match this selection.</p>
      ) : rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { key: 'revenue', title: 'Website revenue', unit: 'GHS', Chart: BarChart, Mark: Bar, color: '#16834e' },
            { key: 'orders', title: 'Website orders', unit: 'orders', Chart: LineChart, Mark: Line, color: '#2563eb' },
          ].map(({ key, title, unit, Chart, Mark, color }) => (
            <section key={key} className="min-w-0 rounded-xl border bg-card p-4">
              <h2 className="mb-3 text-section-title">{title}</h2>
              {rows.some(row => row[key] != null) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <Chart data={rows}>
                    <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#dce6df" />
                    <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={18} tickLine={false} />
                    <YAxis {...numericChartAxis(rows, [key])} tickLine={false} tickFormatter={value => formatChartValue(value, key === 'revenue' ? unit : '', { compact: true })} />
                    <Tooltip formatter={value => [formatChartValue(value, unit), title]} />
                    <Mark dataKey={key} stroke={color} fill={color} isAnimationActive={false} />
                  </Chart>
                </ResponsiveContainer>
              ) : <p role="status" className="py-8 text-sm text-muted-foreground">No recorded values for this metric.</p>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
