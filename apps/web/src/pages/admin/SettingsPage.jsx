import React, { useState } from 'react';
import { Shield, Bell, Database, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const roles = ['Admin', 'Sales/CRM', 'Operations', 'Finance', 'HR', 'Logistics', 'Farm Operations', 'Export', 'Content Editor', 'Customer Portal'];

export default function SettingsPage() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState('Admin');

  const manageRole = (role) => {
    setSelectedRole(role);
    toast({ title: `${role} permissions selected` });
  };

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /><h3 className="font-heading font-semibold">Company Information</h3></div>
          <div className="mt-4 space-y-4">
            <div><Label>Company Name</Label><Input defaultValue="MangoOps Ltd" /></div>
            <div><Label>Support Email</Label><Input defaultValue="info@mangoops.com" /></div>
            <div><Label>Phone</Label><Input defaultValue="+256 700 000 000" /></div>
            <div><Label>Currency</Label><Input defaultValue="UGX" /></div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h3 className="font-heading font-semibold">Notification Channels</h3></div>
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
          <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><h3 className="font-heading font-semibold">Role-Based Access Control</h3></div>
          <p className="mt-2 text-sm text-muted-foreground">Admin-user RBAC model with permissions for view, create, edit, approve, and delete actions per module.</p>
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <p className="font-medium">{selectedRole}</p>
            <p className="text-xs text-muted-foreground">Permissions: view, create, edit, approve, and delete according to assigned module scope.</p>
          </div>
          <div className="mt-4 space-y-2">
            {roles.map((role) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm font-medium">{role}</span>
                <Button variant="ghost" size="sm" onClick={() => manageRole(role)}>Manage</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /><h3 className="font-heading font-semibold">Storage & Data</h3></div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Storage Convention</span><code className="rounded bg-muted px-2 py-1 text-xs">/var/www/storage/uploads/...</code></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Database</span><span className="font-medium">PostgreSQL</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Auth Mode</span><span className="font-medium">JWT</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">API Style</span><span className="font-medium">Token-based</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Product Table</span><code className="rounded bg-muted px-2 py-1 text-xs">products</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
