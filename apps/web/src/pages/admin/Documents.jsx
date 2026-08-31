import React, { useEffect, useState } from 'react';
import { FolderOpen, FileText, Award, Download } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';

const certificationFields = [
  { name: 'name', label: 'Document Name', required: true },
  { name: 'issuer', label: 'Issuer' },
  { name: 'certificate_number', label: 'Certificate #' },
  { name: 'valid_from', label: 'Valid From', type: 'date' },
  { name: 'valid_to', label: 'Valid To', type: 'date' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'valid',
    options: [
      { value: 'valid', label: 'Valid' },
      { value: 'pending', label: 'Pending' },
      { value: 'expired', label: 'Expired' },
    ],
  },
];

export default function Documents() {
  const [certifications, setCertifications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Certification.list(),
      base44.entities.Notification.list('-created_date', 50),
    ]).then(([certs, notifs]) => {
      setCertifications(certs || []);
      setNotifications(notifs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader>
        <AdminCreateDialog
          title="Upload Document"
          description="Register a certification or business document record."
          buttonLabel="Upload Document"
          fields={certificationFields}
          onCreate={(payload) => base44.entities.Certification.create(payload)}
          onCreated={load}
          submitLabel="Save Document"
        />
      </PageHeader>

      <Tabs defaultValue="certifications">
        <TabsList>
          <TabsTrigger value="certifications"><Award className="mr-1 h-4 w-4" /> Certifications</TabsTrigger>
          <TabsTrigger value="notifications"><FileText className="mr-1 h-4 w-4" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="certifications" className="mt-4">
          {loading ? <PageSkeleton variant="table" contentOnly /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {certifications.length > 0 ? certifications.map((cert) => (
                <div key={cert.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Award className="h-5 w-5 text-primary" /></div>
                    <StatusBadge status={cert.status} />
                  </div>
                  <h3 className="mt-3 font-semibold">{cert.name}</h3>
                  <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                  <div className="mt-3 text-sm text-muted-foreground">
                    <p>Valid: {formatDate(cert.valid_from)} → {formatDate(cert.valid_to)}</p>
                    {cert.certificate_number && <p className="text-xs">#{cert.certificate_number}</p>}
                  </div>
                  {cert.document_url && (
                    <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                      <a href={cert.document_url} target="_blank" rel="noreferrer">
                        <Download className="mr-1 h-3 w-3" /> Download
                      </a>
                    </Button>
                  )}
                </div>
              )) : <div className="col-span-full text-center py-12 text-muted-foreground"><FolderOpen className="mx-auto h-12 w-12" /><p className="mt-3">No certifications registered.</p></div>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          {loading ? <PageSkeleton variant="table" contentOnly /> : (
            <DataTable items={notifications} columns={[
              { key: 'title', label: 'Title' },
              { key: 'channel', label: 'Channel' },
              { key: 'notification_type', label: 'Type' },
              { key: 'created_date', label: 'Created', format: formatDate },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            ]} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
