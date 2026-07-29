import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'About', path: '/about' },
  { label: 'Products', path: '/products' },
  { label: 'Farms', path: '/farms' },
  { label: 'Sustainability', path: '/sustainability' },
  { label: 'Export', path: '/export' },
  { label: 'Local Supply', path: '/local-supply' },
  { label: 'Media', path: '/media' },
  { label: 'News', path: '/news' },
  { label: 'Careers', path: '/careers' },
  { label: 'Contact', path: '/contact' },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-[#0b432f]/10 bg-[#fffdf7]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex h-[4.5rem] items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="JBA GreenGold Orchard Home">
            <img
              src="/brand/header-logo-reference.webp"
              alt="JBA GreenGold Orchard"
              className="h-11 w-auto object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-[#b77708] after:absolute after:inset-x-2.5 after:-bottom-1 after:h-px after:bg-[#d39a27]'
                    : 'text-[#253a31] hover:text-[#b77708]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button size="sm" className="h-11 rounded-md bg-[#063c2b] px-5 text-white hover:bg-[#0a5039]" asChild>
              <Link to="/portal">Customer Portal <ArrowRight className="ml-3 h-4 w-4" /></Link>
            </Button>
          </div>

          <button className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border lg:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  location.pathname === link.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link to="/portal" onClick={() => setOpen(false)}>Portal</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
