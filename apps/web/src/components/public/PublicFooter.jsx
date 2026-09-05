import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, Leaf, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const supplyLinks = [
  ['Supply', '/supply'],
  ['Quality & Certifications', '/supply#supply-options'],
  ['Delivery & Logistics', '/supply'],
  ['Request a Quote', '/contact?topic=supply'],
];

const supplyQuickLinks = [
  ['Products & Supply', '/supply'],
  ['Our Farm', '/farms'],
  ['Sustainability', '/sustainability'],
  ['Newsroom', '/news'],
  ['Contact', '/contact'],
];

function FooterLinks({ title, links }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-white">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(([label, path]) => (
          <li key={label}><Link to={path} className="transition-colors hover:text-[#9ACD32]">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

function ContactColumn() {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-white">Contact</h4>
      <ul className="mt-4 space-y-2.5 text-sm">
        <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#9ACD32]" /> Accra, Ghana</li>
        <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#9ACD32]" /> +233 59 354 9954</li>
        <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#9ACD32]" /> info@jbagreengold.com</li>
      </ul>
      <Link to="/contact" className="mt-4 inline-block text-sm font-semibold text-[#9ACD32] hover:underline">Send us a message →</Link>
    </div>
  );
}

function NewsletterColumn() {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-white">Subscribe to Updates</h4>
      <p className="mt-4 text-xs leading-5 text-white/70">Get the latest news, harvest updates and special offers.</p>
      <form className="mt-3" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="footer-email" className="sr-only">Email address</label>
        <div className="flex overflow-hidden rounded bg-white">
          <input id="footer-email" type="email" placeholder="Your email address" className="h-10 min-w-0 flex-1 border-0 bg-white px-3 text-xs text-[#173d24] outline-none" />
          <button type="submit" className="grid h-10 w-10 place-items-center bg-[#9ACD32] text-[#173d24] hover:bg-white" aria-label="Subscribe"><ArrowRight className="h-4 w-4" /></button>
        </div>
        <label className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-white/65"><input type="checkbox" className="mt-0.5" /> I agree to receive updates from JBA GreenGold Orchard.</label>
      </form>
    </div>
  );
}

export default function PublicFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#00513a] text-white/75">
      <Leaf className="pointer-events-none absolute -bottom-20 -right-14 h-80 w-80 rotate-[-22deg] text-white/[0.06]" strokeWidth={0.45} />
      <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10 lg:py-8">
        <div className="grid gap-6 md:grid-cols-5">
          <div>
            <Link to="/" aria-label="JBA GreenGold Orchard Home">
              <img
                src="/brand/footer-logo-reference.webp"
                alt="JBA GreenGold Orchard"
                className="h-12 w-auto object-contain"
                loading="lazy"
              />
            </Link>
            <p className="mt-2 max-w-xs text-[11px] leading-4 text-white/65">
              Growing today, sustaining tomorrow — careful orchard, timeless mangoes from farm to appetite.
            </p>
            <div className="mt-3 flex gap-4">
              <a href="#" aria-label="Facebook" className="text-white/65 transition-colors hover:text-[#9ACD32]"><Facebook className="h-5 w-5" /></a>
              <a href="#" aria-label="Instagram" className="text-white/65 transition-colors hover:text-[#9ACD32]"><Instagram className="h-5 w-5" /></a>
              <a href="#" aria-label="LinkedIn" className="text-white/65 transition-colors hover:text-[#9ACD32]"><Linkedin className="h-5 w-5" /></a>
            </div>
          </div>

          <FooterLinks title="Quick Links" links={supplyQuickLinks} />
          <FooterLinks title="Supply Options" links={supplyLinks} />
          <ContactColumn />
          <NewsletterColumn />
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/20 pt-4 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} JBA GreenGold Orchard. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <span aria-hidden="true">|</span>
            <Link to="/terms" className="hover:text-white">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
