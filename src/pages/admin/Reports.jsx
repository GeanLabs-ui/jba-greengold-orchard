import React from 'react';
import { FileText, BarChart3, FileSpreadsheet, FileBarChart, TrendingUp, Package, Users, Truck } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import MetricCard from '@/components/shared/MetricCard';
import { useToast } from '@/components/ui/use-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

const salesData = [
  { month: 'Jan', sales: 42, orders: 28 },
  { month: 'Feb', sales: 55, orders: 35 },
  { month: 'Mar', sales: 48, orders: 30 },
  { month: 'Apr', sales: 67, orders: 42 },
  { month: 'May', sales: 79, orders: 51 },
  { month: 'Jun', sales: 92, orders: 58 },
];

const reportTypes = [
  { icon: TrendingUp, title: 'Sales Report', desc: 'Revenue, invoices, payments, and outstanding balances', color: 'bg-amber-500' },
  { icon: Package, title: 'Inventory Report', desc: 'Stock levels, movements, and low-stock alerts', color: 'bg-blue-500' },
  { icon: Users, title: 'Customer Report', desc: 'Customer profiles, segments, and purchase history', color: 'bg-emerald-500' },
  { icon: Truck, title: 'Logistics Report', desc: 'Deliveries, dispatch performance, and routes', color: 'bg-violet-500' },
  { icon: BarChart3, title: 'Harvest Report', desc: 'Harvest volumes, quality grades, and farm performance', color: 'bg-green-500' },
  { icon: FileText, title: 'Finance Report', desc: 'Expenses, profit/loss, and financial summaries', color: 'bg-red-500' },
];

export default function Reports() {
  const { toast } = useToast();

  const downloadExcel = (reportTitle = 'Business Report') => {
    const rows = [
      ['Report', reportTitle],
      ['Avg. Order Value', 'UGX 1.2M'],
      ['On-time Delivery', '94%'],
      ['Customer Retention', '87%'],
      ['Stock Turnover', '3.2x'],
    ];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: `${reportTitle} spreadsheet exported` });
  };

  const downloadPdf = async (reportTitle = 'Business Report') => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(reportTitle, 14, 18);
    doc.setFontSize(11);
    doc.text('Avg. Order Value: UGX 1.2M', 14, 34);
    doc.text('On-time Delivery: 94%', 14, 44);
    doc.text('Customer Retention: 87%', 14, 54);
    doc.text('Stock Turnover: 3.2x', 14, 64);
    doc.save(`${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
    toast({ title: `${reportTitle} PDF exported` });
  };

  return (
    <div>
      <PageHeader title="Analytics & Reporting" description="Generate and export business reports.">
        <Button variant="outline" size="sm" onClick={() => downloadExcel()}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel</Button>
        <Button size="sm" className="gradient-mango text-white" onClick={() => downloadPdf()}><FileBarChart className="mr-2 h-4 w-4" /> Export PDF</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Avg. Order Value" value="UGX 1.2M" icon={TrendingUp} color="primary" />
        <MetricCard title="On-time Delivery" value="94%" icon={Truck} color="green" />
        <MetricCard title="Customer Retention" value="87%" icon={Users} color="blue" />
        <MetricCard title="Stock Turnover" value="3.2x" icon={Package} color="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-heading font-semibold">Sales & Orders Trend</h3>
          <ResponsiveContainer width="100%" height={260} className="mt-4">
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="sales" fill="hsl(33 95% 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-heading font-semibold">Orders Over Time</h3>
          <ResponsiveContainer width="100%" height={260} className="mt-4">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="orders" stroke="hsl(150 45% 42%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-4 font-heading font-semibold">Report Categories</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((r) => (
            <div key={r.title} className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md cursor-pointer">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${r.color}`}>
                <r.icon className="h-6 w-6 text-white" />
              </div>
              <h4 className="mt-3 font-semibold">{r.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadExcel(r.title)}><FileSpreadsheet className="mr-1 h-3 w-3" /> Excel</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadPdf(r.title)}><FileBarChart className="mr-1 h-3 w-3" /> PDF</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
