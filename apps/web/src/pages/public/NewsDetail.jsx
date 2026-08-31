import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import PageSkeleton from '@/components/shared/PageSkeleton';

export default function NewsDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.NewsPost.filter({ slug })
      .then((data) => { setPost(data?.[0] || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <PageSkeleton contentOnly />;
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Article not found.</p>
        <Link to="/news" className="mt-4 inline-block text-primary hover:underline">← Back to News</Link>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-amber-700 to-orange-600 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link to="/news" className="inline-flex items-center gap-1 text-sm text-amber-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All News
          </Link>
          <span className="mt-4 block text-xs font-semibold uppercase text-amber-200">{post.category?.replace('_', ' ')}</span>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-white md:text-4xl">{post.title}</h1>
          <div className="mt-4 flex items-center gap-4 text-sm text-amber-100">
            {post.author_name && <span className="flex items-center gap-1"><User className="h-4 w-4" /> {post.author_name}</span>}
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Recent'}</span>
          </div>
        </div>
      </section>

      <article className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {post.featured_image && (
            <img src={post.featured_image} alt={post.title} className="mb-8 aspect-video w-full rounded-2xl object-cover shadow-lg" />
          )}
          <div className="text-base leading-relaxed text-foreground/90">
            <ReactMarkdown components={{
              h1: ({node, ...props}) => <h1 className="mt-6 mb-3 font-heading text-2xl font-bold" {...props} />,
              h2: ({node, ...props}) => <h2 className="mt-6 mb-3 font-heading text-xl font-bold" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 text-muted-foreground" {...props} />,
              ul: ({node, ...props}) => <ul className="mb-4 list-disc pl-6 text-muted-foreground" {...props} />,
              ol: ({node, ...props}) => <ol className="mb-4 list-decimal pl-6 text-muted-foreground" {...props} />,
              a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground" {...props} />,
            }}>{post.body || post.excerpt || ''}</ReactMarkdown>
          </div>
        </div>
      </article>
    </div>
  );
}
