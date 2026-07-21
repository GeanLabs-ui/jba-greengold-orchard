import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function News() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.NewsPost.filter({ status: 'published' }, '-published_at')
      .then((data) => { setPosts(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-br from-amber-700 to-orange-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">News & Harvest Updates</h1>
          <p className="mt-2 text-amber-50">Stay up to date with the latest from our farms and business.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.id} to={`/news/${post.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {post.featured_image && <img src={post.featured_image} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold uppercase text-primary">{post.category?.replace('_', ' ')}</span>
                    <h3 className="mt-1 font-heading text-lg font-semibold group-hover:text-primary">{post.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                    <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No news posts yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
