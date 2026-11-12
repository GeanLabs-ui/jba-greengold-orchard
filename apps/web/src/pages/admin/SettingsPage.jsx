import React, { useState } from 'react';
import { Shield, Bell, Database, Globe, Mail } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { companyOutlook, companySettings } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { STAFF_ROLES, canAccessAdminPath, canManageHumanResources } from '@/lib/access-control';

const profileDefaults = { name: 'JBA GreenGold Orchard', email: 'info@jbagreengold.com', phone: '+233 59 354 9954', currency: 'GHS' };
const currencyNames = new Intl.DisplayNames(['en-GH'], { type: 'currency' });
const currencies = Intl.supportedValuesOf('currency');
const selectStyle = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const queryOptions = { retry: false, gcTime: 0 };

function CompanyInformation({ userId }) {
  const client = useQueryClient();
  const key = ['company-settings', userId, 'profile'];
  const query = useQuery({ ...queryOptions, queryKey: key, queryFn: ({ signal }) => companySettings.get(signal) });
  const [draft, setDraft] = useState(null);
  const fields = draft || query.data || profileDefaults;
  const save = useMutation({
    mutationFn: () => companySettings.save(fields, userId),
    onSuccess: (data) => { client.setQueryData(key, data); client.invalidateQueries({ queryKey: ['company-settings', userId, 'currency'] }); setDraft(null); },
  });
  const change = (field, value) => { save.reset(); setDraft({ ...fields, [field]: value }); };
  const disabled = !query.data || save.isPending;

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /><h2 className="text-card-title">Company Information</h2></div>
      <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); if (draft && !disabled) save.mutate(); }}>
        <div><Label htmlFor="company-name">Company name</Label><Input id="company-name" required maxLength={150} disabled={disabled} value={fields.name} onChange={event => change('name', event.target.value)} /></div>
        <div><Label htmlFor="company-email">Support email</Label><Input id="company-email" type="email" required maxLength={254} disabled={disabled} value={fields.email} onChange={event => change('email', event.target.value)} /></div>
        <div><Label htmlFor="company-phone">Phone</Label><Input id="company-phone" type="tel" maxLength={40} disabled={disabled} value={fields.phone} onChange={event => change('phone', event.target.value)} /></div>
        <div><Label htmlFor="company-currency">Default currency</Label><select id="company-currency" className={selectStyle} disabled={disabled} value={fields.currency} onChange={event => change('currency', event.target.value)}>{currencies.map(code => <option key={code} value={code}>{code} · {currencyNames.of(code)}</option>)}</select></div>
        <p className="text-xs text-muted-foreground">New export shipments start in this currency. Each shipment can use its own currency.</p>
        {query.isError && <div role="alert" className="text-sm text-destructive">{query.error.message} <Button type="button" size="sm" variant="outline" onClick={() => query.refetch()}>Retry</Button></div>}
        {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
        {save.isSuccess && <p role="status" className="text-sm text-muted-foreground">Company information saved.</p>}
        <Button type="submit" disabled={disabled || !draft}>{save.isPending ? 'Saving…' : 'Save company information'}</Button>
      </form>
    </section>
  );
}

const outlookMessages = {
  setup_required: 'Add the missing Microsoft 365 bindings in the API Worker, then check again.',
  credentials_rejected: 'Microsoft rejected the credentials. Check the tenant ID, application ID, and client secret value in the API Worker.',
  access_denied: 'Exchange denied access. Check the application role assignment and mailbox scope.',
  mailbox_missing: 'Microsoft could not find this mailbox or calendar. Check the Exchange mailbox object ID.',
  unavailable: 'Microsoft 365 is temporarily unavailable. Check again shortly.',
  connected: 'Connected',
};

function OutlookConnection({ userId }) {
  const query = useQuery({ ...queryOptions, queryKey: ['company-outlook', userId, 'connection'], queryFn: ({ signal }) => companyOutlook.connection(signal) });
  const connection = query.data;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /><h2 className="text-card-title">Microsoft 365 connection</h2></div>
      <p className="mt-2 text-sm text-muted-foreground">{profileDefaults.email}</p>
      <div className="my-4 space-y-2 text-sm" aria-live="polite">
        {query.isError ? <p>{query.error.message}</p> : !connection ? <p>Checking Microsoft 365…</p> : connection.status === 'checked' ? (
          <dl className="space-y-2">
            <div><dt className="font-medium">Inbox</dt><dd>{outlookMessages[connection.inbox]}</dd></div>
            <div><dt className="font-medium">Calendar</dt><dd>{outlookMessages[connection.calendar]}</dd></div>
          </dl>
        ) : <p>{outlookMessages[connection.status]}</p>}
        {connection?.missing?.length > 0 && <ul className="space-y-1 text-xs">{connection.missing.map(name => <li key={name}><code>{name}</code></li>)}</ul>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>Check connection</Button>
        <Button size="sm" variant="outline" asChild><a href="https://admin.microsoft.com/" target="_blank" rel="noopener noreferrer">Microsoft 365 admin center</a></Button>
        <Button size="sm" variant="ghost" asChild><Link to="/admin/calendar">Open calendar</Link></Button>
      </div>
    </section>
  );
}

function DepartmentMailboxForm({ id, userId, saved, staff, onSave }) {
  const [draft, setDraft] = useState(null);
  const fields = draft || (saved && { ...saved, members: saved.members.filter(id => staff.some(person => person.id === id)) }) || { email: '', mailboxId: '', members: [] };
  const save = useMutation({ mutationFn: () => companySettings.saveDepartment(id, { email: fields.email, mailboxId: fields.mailboxId, members: fields.members }, userId), onSuccess: onSave });
  const change = (field, value) => { save.reset(); setDraft({ ...fields, [field]: value }); };
  return (
    <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); if (!save.isPending) save.mutate(); }}>
      <fieldset disabled={save.isPending} className="space-y-3">
        <div><Label htmlFor="department-address">Department address</Label><Input id="department-address" type="email" placeholder="exports@jbagreengold.com" required value={fields.email} onChange={event => change('email', event.target.value)} /></div>
        <div><Label htmlFor="department-mailbox-id">Exchange mailbox object ID</Label><Input id="department-mailbox-id" required value={fields.mailboxId} onChange={event => change('mailboxId', event.target.value)} /></div>
        <fieldset className="max-h-48 space-y-2 overflow-auto rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Staff with inbox access</legend>
          {staff.length === 0 && <p className="text-sm text-muted-foreground">No active staff accounts available.</p>}
          {staff.map(person => <label key={person.id} className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={fields.members.includes(person.id)} onChange={event => change('members', event.target.checked ? [...fields.members, person.id] : fields.members.filter(member => member !== person.id))} /><span>{person.full_name || person.email}{person.full_name && <span className="block text-xs text-muted-foreground">{person.email}</span>}</span></label>)}
        </fieldset>
      </fieldset>
      <p className="text-xs text-muted-foreground">Assigned staff also need Calendar page access in their staff permissions.</p>
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
      {save.isSuccess && <p role="status" className="text-sm text-muted-foreground">Department inbox settings saved.</p>}
      <Button size="sm" type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save department inbox'}</Button>
    </form>
  );
}

function DepartmentMailboxes({ userId }) {
  const [selected, setSelected] = useState('');
  const client = useQueryClient();
  const query = useQuery({ ...queryOptions, queryKey: ['company-settings', userId, 'departments'], queryFn: ({ signal }) => companySettings.departments(signal) });
  const data = query.data;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-card-title">Department inboxes</h2>
      <p className="mt-2 text-sm text-muted-foreground">Create the department’s shared mailbox in Exchange first. Then link it here and choose which staff can use it.</p>
      <Button className="mt-3" size="sm" variant="outline" asChild><a href="https://admin.exchange.microsoft.com/" target="_blank" rel="noopener noreferrer">Open Exchange admin center</a></Button>
      {query.isError && <p role="alert" className="mt-3 text-sm text-destructive">{query.error.message}</p>}
      {query.isPending && <p role="status" className="mt-3 text-sm text-muted-foreground">Loading departments…</p>}
      {data && <div className="mt-4"><Label htmlFor="mail-department">Department</Label><select id="mail-department" className={selectStyle} value={selected} onChange={event => setSelected(event.target.value)}><option value="">Choose a department</option>{data.departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
      {data && selected && <DepartmentMailboxForm key={selected} id={selected} userId={userId} saved={data.mailboxes.find(item => item.id === selected)} staff={data.staff} onSave={() => {
        client.invalidateQueries({ queryKey: ['company-settings', userId, 'departments'] });
        client.invalidateQueries({ queryKey: ['company-outlook', userId, 'mailboxes'] });
      }} />}
    </section>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const canManageAccess = canManageHumanResources(user) && canAccessAdminPath(user, '/admin/hr');

  return (
    <div>
      <h1 className="mb-6 text-page-title">Settings</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <CompanyInformation key={user?.id} userId={user?.id} />
        {user?.role === 'super_admin' && <><OutlookConnection userId={user.id} /><DepartmentMailboxes key={user.id} userId={user.id} /></>}

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h3 className="text-card-title">Notification Channels</h3></div>
          <div className="mt-4 space-y-4">
            {[
              { label: 'Email Notifications', desc: 'Send order, payment, and delivery updates via email', enabled: true },
              { label: 'SMS Notifications', desc: 'Send alerts via SMS gateway', enabled: true },
              { label: 'WhatsApp Business', desc: 'Send notifications through WhatsApp Business API', enabled: false },
              { label: 'In-App Notifications', desc: 'Show notifications within the dashboard', enabled: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                <Switch defaultChecked={item.enabled} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><h3 className="text-card-title">Role-Based Access Control</h3></div>
          <p className="mt-2 text-sm text-muted-foreground">{canManageAccess ? 'Choose a role to manage individual staff accounts and their page access in HR.' : 'Staff access is managed in HR by Super Admins and authorized HR Officers.'}</p>
          <div className="mt-4 space-y-2">
            {STAFF_ROLES.map(([role, label]) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm font-medium">{label}</span>
                {canManageAccess && (role !== 'admin' || user.role === 'super_admin') && (
                  <Button variant="ghost" size="sm" asChild><Link to={`/admin/hr?tab=access&role=${role}`} aria-label={`Manage ${label} access`}>Manage</Link></Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /><h3 className="text-card-title">Storage & Data</h3></div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">File storage</span><span className="font-medium">Cloudflare R2</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Database</span><span className="font-medium">PostgreSQL</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Authentication</span><span className="font-medium">Session cookie</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">API</span><span className="font-medium">REST</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Product Table</span><code className="rounded bg-muted px-2 py-1 text-xs">products</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
