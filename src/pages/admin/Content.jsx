import React, { useEffect, useState } from 'react';
import { Plus, Newspaper, FileText, Inbox } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate, timeAgo } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';

export default function Content() {
  const [pages, setPages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ContentPage.list('-updated_date', 50),
      base44.entities.NewsPost.list('-published_at', 50),
      base44.entities.Inquiry.list('-created_date', 50),
    ]).then(([pgs, nps, inqs]) => {
      setPages(pgs || []);
      setPosts(nps || []);
      setInquiries(inqs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Content Management" description="Manage website pages, news posts, and customer inquiries.">
        <Button className="gradient-mango text-white"><Plus className="mr-2 h-4 w-4" /> New Post</Button>
      </PageHeader>

      <Tabs defaultValue="inquiries">
        <TabsList>
          <TabsTrigger value="inquiries"><Inbox className="mr-1 h-4 w-4" /> Inquiries</TabsTrigger>
          <TabsTrigger value="posts"><Newspaper className="mr-1 h-4 w-4" /> News Posts</TabsTrigger>
          <TabsTrigger value="pages"><FileText className="mr-1 h-4 w-4" /> Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="inquiries" className="mt-4">
          {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inquiries.length > 0 ? inquiries.map((inq) => (
                <div key={inq.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary capitalize">{inq.inquiry_type?.replace('_', ' ')}</span>
                    <StatusBadge status={inq.status} />
                  </div>
                  <p className="mt-2 font-semibold">{inq.name}</p>
                  <p className="text-xs text-muted-foreground">{inq.email}{inq.phone ? ` • ${inq.phone}` : ''}</p>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{inq.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{timeAgo(inq.created_date)}</p>
                </div>
              )) : <div className="col-span-full text-center py-12 text-muted-foreground">No inquiries yet.</div>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
            <DataTable items={posts} columns={[
              { key: 'title', label: 'Title' },
              { key: 'category', label: 'Category' },
              { key: 'author_name', label: 'Author' },
              { key: 'published_at', label: 'Published', format: formatDate },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            ]} />
          )}
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
            <DataTable items={pages} columns={[
              { key: 'title', label: 'Title' },
              { key: 'page_type', label: 'Type' },
              { key: 'slug', label: 'Slug' },
              { key: 'updated_date', label: 'Updated', format: timeAgo },
              { key: 'is_published', label: 'Published', render: (v) => v ? <StatusBadge status="published" /> : <StatusBadge status="draft" /> },
            ]} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}