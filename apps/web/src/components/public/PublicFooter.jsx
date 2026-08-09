import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Facebook, Instagram, Leaf, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const companyLinks = [
  ['About Us', '/about'],
  ['Our Farms', '/farms'],
  ['Sustainability', '/sustainability'],
  ['Careers', '/careers'],
];

const businessLinks = [
  ['Products', '/products'],
  ['Export Operations', '/export'],
  ['Local Supply', '/local-supply'],
  ['News & Updates', '/news'],
];

const productLinks = [
  ['Dried Mango', '/products'],
  ['Juices & Drinks', '/products'],
  ['Jams & Pickles', '/products'],
  ['Gift Packs', '/products'],
];

const supportLinks = [
  ['FAQs', '/contact'],
  ['Shipping & Delivery', '/contact'],
  ['Returns', '/contact'],
  ['Contact Us', '/contact'],
];

function FooterLinks({ title, links }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-white">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(([label, path]) => (
          <li key={label}><Link to={path} className="transition-colors hover:text-[#e0a326]">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export default function PublicFooter() {
  const { pathname } = useLocation();
  const hasDetailedFooter = pathname === '/products' || pathname === '/farms' || pathname === '/export';

  return (
    <footer className="relative overflow-hidden bg-[#032e21] text-white/75">
      <Leaf className="pointer-events-none absolute -bottom-20 -right-14 h-80 w-80 rotate-[-22deg] text-white/[0.06]" strokeWidth={0.45} />
      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
        <div className={`grid gap-10 ${hasDetailedFooter ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div>
            <Link to="/" aria-label="JBA GreenGold Orchard Home">
              <img
                src="/brand/footer-logo-reference.webp"
                alt="JBA GreenGold Orchard"
                className="h-16 w-auto object-contain"
                loading="lazy"
              />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/65">
              Growing today, sustaining tomorrow — careful orchard, timeless mangoes from farm to appetite.
            </p>
            <div className="mt-5 flex gap-4">
              <a href="#" aria-label="Facebook" className="text-white/65 transition-colors hover:text-[#e0a326]"><Facebook className="h-5 w-5" /></a>
              <a href="#" aria-label="Instagram" className="text-white/65 transition-colors hover:text-[#e0a326]"><Instagram className="h-5 w-5" /></a>
              <a href="#" aria-label="LinkedIn" className="text-white/65 transition-colors hover:text-[#e0a326]"><Linkedin className="h-5 w-5" /></a>
            </div>
          </div>

          <FooterLinks title="Company" links={companyLinks} />
          <FooterLinks title={hasDetailedFooter ? 'Products' : 'Business'} links={hasDetailedFooter ? productLinks : businessLinks} />
          {hasDetailedFooter && <FooterLinks title="Support" links={supportLinks} />}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-white">Contact</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#e0a326]" /> Accra, Ghana</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#e0a326]" /> +233 59 354 9954</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#e0a326]" /> info@jbagreengold.com</li>
            </ul>
            <Link to="/contact" className="mt-4 inline-block text-sm font-semibold text-[#e0a326] hover:underline">
              Send us a message →
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[#d39a27]/45 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
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
