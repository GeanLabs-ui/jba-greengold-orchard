import React, { useState } from 'react';
import BrandLogo from '@/components/shared/BrandLogo';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Menu, PackageSearch, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { useCart } from '@/lib/CartContext';

const navGroups = [
  {
    label: 'Products & Supply',
    links: [
      { label: 'Mango Products', description: 'Fresh and processed mango products', path: '/products' },
      { label: 'Supply', description: 'Choose local delivery or international export', path: '/supply' },
    ],
  },
  {
    label: 'Our Farm',
    links: [
      { label: 'Our Farms', description: 'Orchards, growing practices, and quality', path: '/farms' },
      { label: 'Sustainability', description: 'Responsible growing for generations', path: '/sustainability' },
      { label: 'News', description: 'Company news and harvest updates', path: '/news' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About JBA GreenGold', description: 'Our story, mission, and values', path: '/about' },
      { label: 'Careers', description: 'Grow your career with our team', path: '/careers' },
      { label: 'Contact Us', description: 'Reach our team for inquiries and support', path: '/contact' },
    ],
  },
];

const isCurrentPath = (pathname, path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

function ShoppingDropdown({ itemCount, openCart }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="company-header-control relative inline-flex h-11 items-center gap-1 rounded border border-[#2e7d32]/20 px-3 text-[#2e7d32] transition-colors hover:bg-[#c8e6c9]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8e6c9]"
          aria-label={`Open shopping menu; basket has ${itemCount} items`}
        >
          <ShoppingBag className="h-5 w-5" />
          <ChevronDown className="h-3.5 w-3.5" />
          <AnimatePresence>
            {itemCount > 0 && (
              <motion.span
                key={itemCount}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#2e7d32] px-1 text-[10px] font-bold text-white"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-lg border border-[#123524]/10 bg-white p-1.5 shadow-xl">
        <DropdownMenuLabel className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2e7d32]">Shopping</DropdownMenuLabel>
        <DropdownMenuItem onSelect={openCart} className="cursor-pointer rounded-md px-3 py-2.5 text-[#123524] focus:bg-[#c8e6c9]/15 focus:text-[#123524]">
          <ShoppingBag className="h-4 w-4 text-[#2e7d32]" />
          <span className="min-w-0 text-sm font-bold">View basket <span className="font-medium text-[#5f7565]">({itemCount})</span></span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-[#123524]/10" />
        <DropdownMenuItem asChild className="cursor-pointer rounded-md px-3 py-2.5 text-[#123524] focus:bg-[#c8e6c9]/15 focus:text-[#123524]">
          <Link to="/my-orders">
            <PackageSearch className="h-4 w-4 text-[#2e7d32]" />
            <span className="text-sm font-bold">Track an order</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { itemCount, openCart } = useCart();

  return (
    <header className="company-navbar sticky top-0 z-50 border-b border-[#355e3b] bg-[#123524] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex h-[4.5rem] items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="JBA GreenGold Orchard Home">
            <BrandLogo light className="company-header-logo h-[60px] w-[150px]" />
          </Link>

          <NavigationMenu className="hidden lg:flex" aria-label="Primary navigation">
            <NavigationMenuList className="gap-0.5">
              {navGroups.map((group) => {
                const groupIsCurrent = group.links.some((link) => isCurrentPath(location.pathname, link.path));

                return (
                  <NavigationMenuItem key={group.label}>
                    <NavigationMenuTrigger
                      data-slot="nav-trigger"
                      data-current={groupIsCurrent}
                      className={`!h-11 !rounded !bg-transparent !px-3 !text-[15px] !font-bold hover:!bg-[#c8e6c9]/15 hover:!text-[#2e7d32] focus:!bg-[#c8e6c9]/15 focus:!text-[#2e7d32] data-[state=open]:!bg-[#c8e6c9]/15 data-[state=open]:!text-[#2e7d32] ${
                        groupIsCurrent ? '!text-[#2e7d32]' : '!text-[#123524]'
                      }`}
                    >
                      {group.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="!w-[15rem] overflow-hidden rounded-lg border border-[#123524]/10 bg-white p-1.5 shadow-xl">
                      <div className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2e7d32]">
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.links.map((link) => (
                          <NavigationMenuLink key={link.path} asChild>
                            <Link
                              to={link.path}
                              className={`block rounded-md px-3 py-2.5 transition-colors ${
                                isCurrentPath(location.pathname, link.path)
                                  ? 'bg-[#c8e6c9]/20 text-[#123524]'
                                  : 'text-[#123524] hover:bg-[#c8e6c9]/15'
                              }`}
                            >
                              <span className="block text-sm font-bold">{link.label}</span>
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="hidden items-center gap-2 lg:flex">
            <ShoppingDropdown itemCount={itemCount} openCart={openCart} />
            <Button size="sm" className="h-11 rounded bg-[#2e7d32] px-5 text-white hover:bg-[#c8e6c9] hover:text-[#123524]" asChild>
              <Link to="/portal">Customer Portal <ArrowRight className="ml-3 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ShoppingDropdown itemCount={itemCount} openCart={openCart} />
            <button className="company-header-control grid h-11 w-11 place-items-center rounded text-[#2e7d32] transition-colors hover:bg-[#c8e6c9]/20" onClick={() => setOpen(true)} aria-label="Open website menu" aria-expanded={open}>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="company-mobile-menu w-[min(20rem,88vw)] border-0 bg-[#123524] p-0 text-white">
          <div className="flex h-[4.5rem] items-center border-b border-white/10 px-5">
            <SheetTitle className="text-left text-base text-white">Explore JBA GreenGold</SheetTitle>
          </div>
          <nav className="flex flex-col gap-1 px-4 py-5" aria-label="Website navigation">
            {navGroups.map((group) => (
              <section key={group.label} className="border-b border-white/10 pb-3 pt-1 last:border-b-0">
                <h2 className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c8e6c9]">{group.label}</h2>
                {group.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isCurrentPath(location.pathname, link.path)
                        ? 'bg-[#c8e6c9] text-[#123524]'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </section>
            ))}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" size="sm" className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                <Link to="/my-orders" onClick={() => setOpen(false)}>Track orders</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => { setOpen(false); openCart(); }}
              >
                <ShoppingBag className="mr-2 h-4 w-4" /> Basket ({itemCount})
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-[#c8e6c9] text-[#123524] hover:bg-[#c8e6c9]" asChild>
                <Link to="/portal" onClick={() => setOpen(false)}>Portal</Link>
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
