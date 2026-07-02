import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-mango">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <span className="font-heading text-xl font-bold text-white">MangoOps</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Centralized mango business management — from farm to export, all in one platform.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Linkedin className="h-5 w-5" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/farms" className="hover:text-primary transition-colors">Our Farms</Link></li>
              <li><Link to="/sustainability" className="hover:text-primary transition-colors">Sustainability</Link></li>
              <li><Link to="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white">Business</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-primary transition-colors">Products</Link></li>
              <li><Link to="/export" className="hover:text-primary transition-colors">Export Operations</Link></li>
              <li><Link to="/local-supply" className="hover:text-primary transition-colors">Local Supply</Link></li>
              <li><Link to="/news" className="hover:text-primary transition-colors">News & Updates</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Kampala, Uganda</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +256 700 000 000</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> info@mangoops.com</li>
            </ul>
            <Link to="/contact" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Send us a message →
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} MangoOps. All rights reserved.
        </div>
      </div>
    </footer>
  );
}