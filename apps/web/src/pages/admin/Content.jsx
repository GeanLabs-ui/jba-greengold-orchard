import React, { useEffect, useState } from 'react';
import { FileText, Newspaper } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate, timeAgo } from '@/components/shared/format';
import DataTable from '@/components/shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const postFields = [
  { name: 'title', label: 'Title', required: true, wide: true },
  { name: 'category', label: 'Category', required: true },
  { name: 'author_name', label: 'Author' },
  { name: 'published_at', label: 'Published At', type: 'datetime-local' },
  {
    name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: [
      { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' },
    ],
  },
  { name: 'excerpt', label: 'Excerpt', type: 'textarea', wide: true },
];

const slugify = (value) => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function Content() {
  const [pages, setPages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.ContentPage.list('-updated_date', 50),
      base44.entities.NewsPost.list('-published_at', 50),
    ]).then(([pageRecords, postRecords]) => {
      setPages(pageRecords || []);
      setPosts(postRecords || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return subscribeToDataChanges(load, ['ContentPage', 'NewsPost']);
  }, []);

  const createPost = (payload) => base44.entities.NewsPost.create({
    ...payload,
    slug: `${slugify(payload.title)}-${Date.now().toString().slice(-4)}`,
    content: payload.excerpt || '',
  });

  return (
    <div>
      <PageHeader>
        <AdminCreateDialog title="New Post" description="Create a news post for the public site." buttonLabel="New Post" fields={postFields} onCreate={createPost} onCreated={load} submitLabel="Create Post" />
      </PageHeader>
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts"><Newspaper className="mr-1 h-4 w-4" /> News Posts</TabsTrigger>
          <TabsTrigger value="pages"><FileText className="mr-1 h-4 w-4" /> Pages</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-4">
          {loading ? <PageSkeleton variant="table" contentOnly /> : <DataTable items={posts} columns={[
            { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' }, { key: 'author_name', label: 'Author' },
            { key: 'published_at', label: 'Published', format: formatDate }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
          ]} />}
        </TabsContent>
        <TabsContent value="pages" className="mt-4">
          {loading ? <PageSkeleton variant="table" contentOnly /> : <DataTable items={pages} columns={[
            { key: 'title', label: 'Title' }, { key: 'page_type', label: 'Type' }, { key: 'slug', label: 'Slug' },
            { key: 'updated_date', label: 'Updated', format: timeAgo }, { key: 'is_published', label: 'Published', render: (value) => value ? <StatusBadge status="published" /> : <StatusBadge status="draft" /> },
          ]} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
