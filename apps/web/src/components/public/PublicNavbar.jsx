import React, { useState } from 'react';
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
  {
    label: 'Newsroom',
    links: [
      { label: 'Latest News', description: 'Company news and harvest updates', path: '/news' },
      { label: 'Media', description: 'Photos and stories from the orchard', path: '/media' },
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
          className="relative inline-flex h-11 items-center gap-1 rounded border border-[#2E7D32]/20 px-3 text-[#2E7D32] transition-colors hover:bg-[#9ACD32]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ACD32]"
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
                className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#2E7D32] px-1 text-[10px] font-bold text-white"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-lg border border-[#173d24]/10 bg-white p-2 shadow-xl">
        <DropdownMenuLabel className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2E7D32]">Shopping</DropdownMenuLabel>
        <DropdownMenuItem onSelect={openCart} className="cursor-pointer rounded-md px-3 py-3 text-[#173d24] focus:bg-[#9ACD32]/15 focus:text-[#173d24]">
          <ShoppingBag className="h-4 w-4 text-[#2E7D32]" />
          <span className="min-w-0"><span className="block text-sm font-bold">View basket <span className="font-medium text-[#68756e]">({itemCount})</span></span><span className="mt-0.5 block text-xs text-[#68756e]">Review products and continue to checkout</span></span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-[#173d24]/10" />
        <DropdownMenuItem asChild className="cursor-pointer rounded-md px-3 py-3 text-[#173d24] focus:bg-[#9ACD32]/15 focus:text-[#173d24]">
          <Link to="/my-orders">
            <PackageSearch className="h-4 w-4 text-[#2E7D32]" />
            <span><span className="block text-sm font-bold">Track an order</span><span className="mt-0.5 block text-xs text-[#68756e]">No login required</span></span>
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
    <header className="sticky top-0 z-50 border-b border-[#343434]/10 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex h-[4.5rem] items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="JBA GreenGold Orchard Home">
            <img
              src="/brand/header-logo-reference.webp"
              alt="JBA GreenGold Orchard"
              className="h-11 w-auto object-contain"
            />
          </Link>

          <NavigationMenu className="hidden lg:flex" aria-label="Primary navigation">
            <NavigationMenuList className="gap-0.5">
              {navGroups.map((group) => {
                const groupIsCurrent = group.links.some((link) => isCurrentPath(location.pathname, link.path));

                return (
                  <NavigationMenuItem key={group.label}>
                    <NavigationMenuTrigger
                      className={`!h-11 !rounded !bg-transparent !px-3 !text-[15px] !font-bold hover:!bg-[#9ACD32]/15 hover:!text-[#2E7D32] focus:!bg-[#9ACD32]/15 focus:!text-[#2E7D32] data-[state=open]:!bg-[#9ACD32]/15 data-[state=open]:!text-[#2E7D32] ${
                        groupIsCurrent ? '!text-[#2E7D32]' : '!text-[#343434]'
                      }`}
                    >
                      {group.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="!w-[21rem] overflow-hidden rounded-lg border border-[#173d24]/10 bg-white p-2 shadow-xl">
                      <div className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2E7D32]">
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.links.map((link) => (
                          <NavigationMenuLink key={link.path} asChild>
                            <Link
                              to={link.path}
                              className={`block rounded-md px-3 py-2.5 transition-colors ${
                                isCurrentPath(location.pathname, link.path)
                                  ? 'bg-[#9ACD32]/20 text-[#173d24]'
                                  : 'text-[#173d24] hover:bg-[#9ACD32]/15'
                              }`}
                            >
                              <span className="block text-sm font-bold">{link.label}</span>
                              <span className="mt-0.5 block text-xs leading-5 text-[#5f6e62]">{link.description}</span>
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
            <Button size="sm" className="h-11 rounded bg-[#2E7D32] px-5 text-white hover:bg-[#9ACD32] hover:text-[#173d24]" asChild>
              <Link to="/portal">Customer Portal <ArrowRight className="ml-3 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ShoppingDropdown itemCount={itemCount} openCart={openCart} />
            <button className="grid h-11 w-11 place-items-center rounded text-[#2E7D32] transition-colors hover:bg-[#9ACD32]/20" onClick={() => setOpen(true)} aria-label="Open website menu" aria-expanded={open}>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[min(20rem,88vw)] border-0 bg-[#0b432f] p-0 text-white">
          <div className="flex h-[4.5rem] items-center border-b border-white/10 px-5">
            <SheetTitle className="text-left text-base text-white">Explore JBA GreenGold</SheetTitle>
          </div>
          <nav className="flex flex-col gap-1 px-4 py-5" aria-label="Website navigation">
            {navGroups.map((group) => (
              <section key={group.label} className="border-b border-white/10 pb-3 pt-1 last:border-b-0">
                <h2 className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d4a017]">{group.label}</h2>
                {group.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isCurrentPath(location.pathname, link.path)
                        ? 'bg-[#d4a017] text-[#173d24]'
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
              <Button size="sm" className="flex-1 bg-[#d4a017] text-[#173d24] hover:bg-[#e1b335]" asChild>
                <Link to="/portal" onClick={() => setOpen(false)}>Portal</Link>
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
