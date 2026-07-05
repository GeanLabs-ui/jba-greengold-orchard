import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/shared/BrandLogo';

const navLinks = [
  { label: 'Home', path: '/' },
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
    <header className="sticky top-0 z-50 glass border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="JBA GreenGold Orchard — Home">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portal">Customer Portal</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin">Dashboard</Link>
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
              <Button size="sm" className="flex-1" asChild>
                <Link to="/admin" onClick={() => setOpen(false)}>Dashboard</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}