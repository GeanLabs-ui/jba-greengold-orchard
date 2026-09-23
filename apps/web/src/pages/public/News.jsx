import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, FileText, Image as ImageIcon, UsersRound, Mail, Linkedin, Facebook, Instagram, Youtube } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import './newsroom.css';

const reference = '/pages/news/newsroom-reference.png';
const mediaEmail = 'media@jbagreengold.com';
const coverage = [
  { name: 'Reuters', crop: [61, 486, 131, 54], quote: 'Ghana’s mango exports gain global momentum with JBA GreenGold Orchard.' },
  { name: 'Financial Times', crop: [250, 488, 132, 51], quote: 'How African agribusiness is putting Ghanaian mangoes on the world stage.' },
  { name: 'AgFunder', crop: [429, 488, 125, 51], quote: 'JBA GreenGold Orchard shows how sustainable farming can drive inclusive growth.' },
  { name: 'FoodBev Media', crop: [617, 490, 111, 48], quote: 'Premium Ghanaian mangoes meet rising global demand.' },
];
// Editorial previews supplied in the approved newsroom reference. They do not
// create or overwrite database posts; CMS publications remain available below.
const referenceReleases = [
  { id: 'reference-export', crop: [51, 800, 214, 146], title: 'JBA GreenGold Expands Export Operations to Meet Growing Global Demand', published_at: '2024-04-10', excerpt: 'New facilities and increased farmer partnerships will boost supply of premium Ghanaian mangoes.' },
  { id: 'reference-dried-mango', crop: [293, 799, 209, 150], title: 'JBA GreenGold Launches Premium Dried Mango Range for Global Markets', published_at: '2024-03-18', excerpt: 'A naturally delicious way to enjoy the taste of Ghana, now available internationally.' },
  { id: 'reference-community', crop: [532, 800, 211, 149], title: 'Investing in People: JBA GreenGold Expands Community Development Initiatives', published_at: '2024-02-08', excerpt: 'New programs support education, farmer training and women in agriculture across our growing communities.' },
];
const socials = [[Linkedin, 'LinkedIn'], [Facebook, 'Facebook'], [Instagram, 'Instagram'], [Youtube, 'YouTube']];
const mediaKits = [
  { icon: FileText, title: 'Company Profile', copy: 'Our story, key facts and brand information.', href: '/pages/news/company-profile.html', file: 'JBA-GreenGold-Company-Profile.html' },
  { icon: ImageIcon, title: 'Product Photos', copy: 'High-resolution product, farm and lifestyle images.', href: '/pages/news/product-photos.zip', file: 'JBA-GreenGold-Product-Photos.zip' },
  { icon: UsersRound, title: 'Leadership Bio & Photos', copy: 'Executive bios and leadership photos.', href: '/pages/news/leadership-bios-and-photos.zip', file: 'JBA-GreenGold-Leadership.zip' },
];

function ReferenceImage({ crop, alt = '', className = '' }) {
  const [x, y, width, height] = crop;
  return <div className={`nr-reference-image ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
    <img src={reference} alt={alt} loading="lazy" draggable="false" style={{ width: `${793 / width * 100}%`, maxWidth: 'none', left: `${-x / width * 100}%`, top: 0, transform: `translateY(${-y / 1983 * 100}%)` }} />
  </div>;
}
function Dots({ count, selected, onSelect, label }) {
  if (count < 2) return null;
  return <div className="nr-dots" aria-label={label}>{Array.from({ length: count }, (_, index) => <button key={index} type="button" aria-label={`Show ${label} ${index + 1} first`} aria-pressed={selected === index} onClick={() => onSelect(index)}><span /></button>)}</div>;
}
function dateLabel(value) {
  if (!value) return 'Latest news';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Latest news' : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}
function rotate(items, start) { return [...items.slice(start), ...items.slice(0, start)]; }

export default function News() {
  const [posts, setPosts] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [releaseIndex, setReleaseIndex] = useState(0);
  const [dialog, setDialog] = useState(null);
  useEffect(() => {
    let active = true;
    base44.entities.NewsPost.filter({ status: 'published' }, '-published_at')
      .then((data) => { if (active) setPosts(data || []); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);
  const releases = [...referenceReleases, ...posts.filter((post) => !referenceReleases.some((release) => release.title === post.title))];
  const releaseCards = (items) => items.map((post) => <article key={post.id || post.slug} className="nr-release-card">
    {post.crop ? <ReferenceImage crop={post.crop} alt={post.title} /> : post.featured_image ? <img className="nr-post-image" src={post.featured_image} alt={post.title} loading="lazy" /> : <div className="nr-post-placeholder"><ImageIcon aria-hidden="true" /></div>}
    <div className="nr-release-copy"><time dateTime={post.published_at || undefined}>{dateLabel(post.published_at)}</time><h3>{post.title}</h3><p>{post.excerpt}</p>
      {post.slug ? <Link className="nr-button" to={`/news/${encodeURIComponent(post.slug)}`}>Read More <ArrowRight /></Link> : <button type="button" className="nr-button" onClick={() => setDialog({ type: 'release', post })}>Read More <ArrowRight /></button>}
    </div>
  </article>);
  return <div className="newsroom-page">
    <section className="nr-hero" aria-labelledby="newsroom-title">
      <div className="nr-hero-art" aria-hidden="true" />
      <div className="nr-hero-copy"><p className="nr-eyebrow">Newsroom</p><h1 id="newsroom-title">Discover the latest news <br />from JBA GreenGold <br />Orchard.</h1><p>Explore our newsroom for press releases, <br />company updates, harvest stories, export <br />milestones, and community impact across <br />Ghana and beyond.</p></div>
      <aside className="nr-media-contact" aria-label="Media contact"><h2>Media Contact</h2><div className="nr-contact-team"><span><UsersRound /></span><div><b>Communications Team</b><small>Media &amp; Brand Communications</small></div></div><a className="nr-email" href={`mailto:${mediaEmail}`}><Mail />{mediaEmail}</a><div className="nr-socials"><h3>Follow Us</h3><div>{socials.map(([Icon, name]) => <button key={name} type="button" aria-label={`Connect on ${name}`} title={`Connect on ${name}`} onClick={() => setDialog({ type: 'social', name })}><Icon /></button>)}</div></div></aside>
    </section>

    <section className="nr-section nr-spotlight" id="media-coverage" aria-labelledby="nr-media-title"><div className="nr-container">
      <div className="nr-section-head"><div><p className="nr-eyebrow">In the spotlight</p><h2 id="nr-media-title">JBA In Media</h2></div><button className="nr-text-link" onClick={() => setDialog({ type: 'coverage' })}>View all media coverage <ArrowRight /></button></div>
      <div className="nr-coverage-grid" aria-live="polite">{rotate(coverage, mediaIndex).map((item) => <figure key={item.name}><ReferenceImage crop={item.crop} alt={item.name} className="nr-media-logo" /><blockquote>“{item.quote}”</blockquote></figure>)}</div>
      <Dots count={coverage.length} selected={mediaIndex} onSelect={setMediaIndex} label="media item" />
    </div></section>

    <section className="nr-section nr-press" id="press-releases" aria-labelledby="nr-press-title"><div className="nr-container">
      <div className="nr-section-head"><h2 id="nr-press-title">Press Releases</h2><button className="nr-text-link" onClick={() => setDialog({ type: 'all-releases' })}>View all press releases <ArrowRight /></button></div>
      <div className="nr-release-grid" aria-live="polite">{releaseCards(rotate(releases, releaseIndex).slice(0, 3))}</div>
      {loadError && <p className="nr-load-note" role="status">Additional news updates are temporarily unavailable. Please try again later.</p>}
      <Dots count={releases.length} selected={releaseIndex} onSelect={setReleaseIndex} label="press release" />
    </div></section>

    <section className="nr-section nr-kit" aria-labelledby="nr-kit-title"><div className="nr-container"><div className="nr-section-head"><h2 id="nr-kit-title">Media Kit</h2></div><div className="nr-kit-grid">{mediaKits.map(({ icon: Icon, title, copy, href, file }) => <article key={title}><span className="nr-kit-icon"><Icon /></span><h3>{title}</h3><p>{copy}</p><a className="nr-button" href={href} download={file} aria-label={`Download ${title}`}><Download />Download</a></article>)}</div></div></section>

    <section className="nr-explore" aria-labelledby="nr-explore-title"><div className="nr-explore-art" aria-hidden="true" /><div className="nr-explore-copy"><p className="nr-eyebrow">Explore more</p><h2 id="nr-explore-title">Explore the latest stories from <br />JBA GreenGold Orchard.</h2><p>Updates, insights and impact from our farms to the world.</p></div><Link className="nr-explore-link" to="/about">Learn More <ArrowRight /></Link><p className="nr-explore-motto">Good People. <br />Brighter <br />Tomorrows.</p></section>

    <Dialog open={Boolean(dialog)} onOpenChange={(open) => { if (!open) setDialog(null); }}><DialogContent className="nr-dialog">
      <DialogTitle>{dialog?.type === 'release' ? dialog.post.title : dialog?.type === 'coverage' ? 'JBA In Media' : dialog?.type === 'all-releases' ? 'All Press Releases' : `Connect on ${dialog?.name || 'social media'}`}</DialogTitle>
      <DialogDescription>{dialog?.type === 'release' ? dateLabel(dialog.post.published_at) : dialog?.type === 'social' ? 'Contact our communications team for our official social profile and the latest updates.' : 'News and media enquiries from JBA GreenGold Orchard.'}</DialogDescription>
      {dialog?.type === 'release' && <><ReferenceImage crop={dialog.post.crop} alt={dialog.post.title} /><p>{dialog.post.excerpt}</p><a className="nr-button" href={`mailto:${mediaEmail}?subject=${encodeURIComponent(`Press release request: ${dialog.post.title}`)}`}>Request full press release <ArrowRight /></a></>}
      {dialog?.type === 'coverage' && <><div className="nr-coverage-list">{coverage.map((item) => <div key={item.name}><h3>{item.name}</h3><p>“{item.quote}”</p></div>)}</div><a className="nr-button" href={`mailto:${mediaEmail}?subject=Media%20coverage%20enquiry`}>Request coverage links <ArrowRight /></a></>}
      {dialog?.type === 'all-releases' && <div className="nr-release-grid">{releaseCards(releases)}</div>}
      {dialog?.type === 'social' && <a className="nr-button" href={`mailto:${mediaEmail}?subject=${encodeURIComponent(`Official ${dialog.name} profile`)}`}><Mail />Email Communications Team</a>}
    </DialogContent></Dialog>
  </div>;
}
