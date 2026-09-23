import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/components/shared/format';
import DataTable from '@/components/shared/DataTable';
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

export default function NewsPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.NewsPost.list('-published_at', 50).then((postRecords) => {
      setPosts(postRecords || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return subscribeToDataChanges(load, ['NewsPost']);
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
          {loading ? <PageSkeleton variant="table" contentOnly /> : <DataTable items={posts} columns={[
            { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' }, { key: 'author_name', label: 'Author' },
            { key: 'published_at', label: 'Published', format: formatDate }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
          ]} />}
    </div>
  );
}
