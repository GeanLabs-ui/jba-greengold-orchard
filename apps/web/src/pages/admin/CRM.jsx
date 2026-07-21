import React, { useEffect, useState } from 'react';
import { Plus, Search, Users, Mail, Phone, Building2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function CRM() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_type: 'local', code: '', first_name: '', last_name: '', company_name: '', email: '', phone: '', country: 'Ghana', region: '', city: '', address_line1: '', notes: '' });

  const load = () => {
    base44.entities.Customer.list('-created_date')
      .then((data) => { setCustomers(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter((c) => {
    const matchSearch = !search || c.first_name?.toLowerCase().includes(search.toLowerCase()) || c.last_name?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || c.customer_type === filterType;
    return matchSearch && matchType;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Customer.create({
        ...form,
        code: form.code || `CUS-${Date.now().toString().slice(-6)}`,
      });
      toast({ title: 'Customer created successfully' });
      setOpen(false);
      setForm({ customer_type: 'local', code: '', first_name: '', last_name: '', company_name: '', email: '', phone: '', country: 'Ghana', region: '', city: '', address_line1: '', notes: '' });
      load();
    } catch {
      toast({ title: 'Error creating customer', variant: 'destructive' });
    }
  };

  return (
    <div>
      <PageHeader title="Customer Relationship Management" description="Manage local, corporate, export, and walk-in customers.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-mango text-white"><Plus className="mr-2 h-4 w-4" /> New Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Customer Type</Label>
                  <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Customer Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Auto-generated if empty" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>First Name *</Label><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label>Last Name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div><Label>Company Name</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div><Label>Region</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full gradient-mango text-white">Create Customer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="export">Export</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />)
        ) : filtered.length > 0 ? (
          filtered.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-mango text-white font-semibold">
                    {(c.first_name || c.company_name || '?')[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-muted-foreground">{c.code}</p>
                  </div>
                </div>
                <StatusBadge status={c.customer_type} />
              </div>
              {c.company_name && <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><Building2 className="h-3 w-3" /> {c.company_name}</p>}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {c.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</p>}
                {c.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</p>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-semibold text-sm">{formatCurrency(c.balance)}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">No customers found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
