import React, { useState, useRef } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Wallet,
  X,
  Building2,
  Sparkles,
  Award,
  Grid3X3,
  SlidersHorizontal,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface PublicWebsiteViewProps {
  onOpenWebApp?: () => void;
  onLaunchWebApp?: () => void;
}

const capabilities = [
  {
    icon: Store,
    title: 'Multi-business management',
    description: 'Manage multiple businesses, branches, or outlets from one clear workspace.',
  },
  {
    icon: ShoppingCart,
    title: 'Point of sale',
    description: 'Keep checkout organized with a focused, efficient sales workflow.',
  },
  {
    icon: Package,
    title: 'Inventory management',
    description: 'See product availability, stock levels, and inventory movements together.',
  },
  {
    icon: Wallet,
    title: 'Sales & financial tracking',
    description: 'Bring revenue, expenses, payments, and operations into view.',
  },
  {
    icon: BarChart3,
    title: 'Reports & analytics',
    description: 'Review business performance and trends over selected periods.',
  },
  {
    icon: ShieldCheck,
    title: 'User & access management',
    description: 'Manage staff and keep access aligned with assigned permissions.',
  },
];

const businessTypes = [
  'Retail shops & supermarkets',
  'Restaurants & cafés',
  'Pharmacies & eligible retail',
  'Wholesale & distribution',
  'Clothing & fashion stores',
  'Multi-branch businesses',
];

const workflow = [
  {
    number: '01',
    title: 'Set up your business',
    description: 'Configure your business profile and available branches.',
    icon: Store,
  },
  {
    number: '02',
    title: 'Manage daily operations',
    description: 'Handle sales, inventory, and authorized business activities.',
    icon: ClipboardList,
  },
  {
    number: '03',
    title: 'Track your performance',
    description: 'Review reports and monitor performance using your system data.',
    icon: BarChart3,
  },
];

const navLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'About us', href: '#about' },
  { label: 'Trusted By', href: '#trusted' },
  { label: 'Contact', href: '#contact' },
];

interface TrustedCompany {
  id: string;
  name: string;
  category: string;
  location: string;
  branches: string;
  gradient: string;
  initials: string;
  badge: string;
}

const TRUSTED_COMPANIES: TrustedCompany[] = [
  {
    id: 'fms',
    name: 'Fresh & More Supermarket',
    category: 'Grocery & Fresh Retail Chain',
    location: 'Kimironko • Kigali',
    branches: '3 Branches',
    gradient: 'from-emerald-700 to-green-600',
    initials: 'F&M',
    badge: 'Enterprise M-POS',
  },
  {
    id: 'kfm',
    name: 'Kigali Fresh Mart',
    category: 'City Center Fresh Foods & Groceries',
    location: 'Nyarugenge Downtown',
    branches: 'Downtown Express',
    gradient: 'from-teal-700 to-emerald-600',
    initials: 'KFM',
    badge: 'Active Focus',
  },
  {
    id: 'iny',
    name: 'Inyange Distribution Hub',
    category: 'Dairy, Juices & FMCG Wholesale',
    location: 'Masaka Industrial Park',
    branches: 'National Logistics',
    gradient: 'from-blue-700 to-cyan-600',
    initials: 'INY',
    badge: 'High-Volume Partner',
  },
  {
    id: 'ssg',
    name: 'Simba Supermarket Group',
    category: 'Retail Chain & Gourmet Bakery',
    location: 'Kigali Central & Remera',
    branches: '6 Superstores',
    gradient: 'from-amber-600 to-orange-600',
    initials: 'SSG',
    badge: 'Multi-Lane POS',
  },
  {
    id: 'kfc',
    name: 'Kigali Farmers Cooperative',
    category: 'Farm-to-Shelf Organic Groceries',
    location: 'Gahanga & Musanze Supply',
    branches: '120+ Farm Partners',
    gradient: 'from-green-700 to-emerald-500',
    initials: 'KFC',
    badge: 'Direct Source',
  },
  {
    id: 'gmx',
    name: 'Gorillas Minimarket Express',
    category: 'Urban 24/7 Convenience Stores',
    location: 'Kacyiru & Kiyovu Outlets',
    branches: '4 Outlets',
    gradient: 'from-purple-700 to-indigo-600',
    initials: 'GMX',
    badge: 'Rapid Checkout',
  },
  {
    id: 'sc',
    name: 'Sawa City Retail Outlets',
    category: 'Neighborhood Convenience & Deli',
    location: 'Gishushu & Remera',
    branches: '4 Locations',
    gradient: 'from-indigo-700 to-blue-600',
    initials: 'SC',
    badge: 'Barcode Certified',
  },
  {
    id: 'brh',
    name: 'Bakhresa Grain & Consumer Hub',
    category: 'Flour, Staples & FMCG Distro',
    location: 'Prime Economic Zone',
    branches: 'Regional Depot',
    gradient: 'from-rose-700 to-red-600',
    initials: 'BRH',
    badge: 'Wholesale Depot',
  },
  {
    id: 'ndl',
    name: 'Ndoli Supermarket & Pantry',
    category: 'Everyday Household Grocers',
    location: 'Kabeza & Kanombe',
    branches: '2 Supermarkets',
    gradient: 'from-sky-700 to-blue-700',
    initials: 'NDL',
    badge: 'Live Stock Sync',
  },
  {
    id: 'nyu',
    name: 'Nyungwe Specialty Organics',
    category: 'Specialty Teas, Honey & Spices',
    location: 'Kigali Heights & Nyarutarama',
    branches: 'Retail & Tasting Hub',
    gradient: 'from-emerald-800 to-teal-700',
    initials: 'NYU',
    badge: 'Specialty Retail',
  },
];

export const PublicWebsiteView: React.FC<PublicWebsiteViewProps> = ({
  onOpenWebApp,
  onLaunchWebApp,
}) => {
  const openApp = onLaunchWebApp || onOpenWebApp || (() => {});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trustedViewMode, setTrustedViewMode] = useState<'slider' | 'grid'>('slider');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9f7] text-slate-900 [font-family:'Google_Sans','Product_Sans',Arial,sans-serif] selection:bg-emerald-100 selection:text-[#0c4a26]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <a
            href="#hero"
            className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0c4a26]"
            aria-label="Fresh & More M-POS home"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0c4a26] text-emerald-100 shadow-lg shadow-emerald-950/15">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold tracking-tight text-slate-900 sm:text-base">
                Fresh <span className="text-[#0c4a26]">&amp; More</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.16em] text-slate-500">
                MULTI-BUSINESS M-POS
              </span>
            </span>
          </a>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md text-[13px] font-semibold text-slate-600 transition-colors hover:text-[#0c4a26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0c4a26]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={openApp}
              className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c4a26]"
            >
              Login
            </button>
            <button
              type="button"
              onClick={openApp}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0c4a26] px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-emerald-950/15 transition hover:bg-[#093a1d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c4a26]"
            >
              Get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c4a26] sm:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-4 shadow-lg sm:hidden">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={handleNavClick}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#0c4a26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0c4a26]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    handleNavClick();
                    openApp();
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleNavClick();
                    openApp();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c4a26] px-3 py-3 text-sm font-bold text-white"
                >
                  Get started <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <section id="hero" className="relative isolate">
        <div className="pointer-events-none absolute -right-48 -top-52 -z-10 h-[550px] w-[550px] rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10 lg:py-24">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-2 text-[11px] font-bold tracking-wide text-[#0c4a26] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              ONE PLATFORM. MULTIPLE BUSINESSES.
            </div>
            <h1 className="max-w-[690px] text-[43px] font-extrabold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[66px]">
              Manage every business.{' '}
              <span className="text-[#0c4a26]">From one powerful POS.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Take control of sales, inventory, finances, and business performance from one
              centralized platform built for modern business owners.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openApp}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0c4a26] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#093a1d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c4a26]"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={openApp}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 transition hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c4a26]"
              >
                Login to your account <ArrowDownRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex -space-x-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f7f9f7] bg-emerald-100 text-[#0c4a26]">
                  <Store className="h-3.5 w-3.5" />
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f7f9f7] bg-amber-100 text-amber-800">
                  <Boxes className="h-3.5 w-3.5" />
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f7f9f7] bg-slate-200 text-slate-700">
                  <BarChart3 className="h-3.5 w-3.5" />
                </span>
              </span>
              One platform. Multiple businesses. Complete control.
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px] lg:ml-auto">
            <div className="absolute -inset-5 -z-10 rounded-[34px] bg-gradient-to-br from-emerald-100 via-white to-amber-50 blur-xl" />
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_90px_-38px_rgba(15,55,31,0.36)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0c4a26] text-white">
                    <LayoutDashboard className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 sm:text-sm">Business overview</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">Workspace preview</p>
                  </div>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                  Illustrative preview
                </span>
              </div>

              <div className="grid grid-cols-[150px_1fr] sm:grid-cols-[176px_1fr]">
                <aside className="hidden min-h-[352px] border-r border-slate-100 bg-slate-50/70 p-4 sm:block">
                  <p className="mb-3 px-2 text-[9px] font-extrabold tracking-[0.16em] text-slate-400">
                    WORKSPACES
                  </p>
                  {[
                    { name: 'All businesses', active: true, icon: LayoutDashboard },
                    { name: 'Retail store', active: false, icon: Store },
                    { name: 'Cafe & dining', active: false, icon: Store },
                    { name: 'Distribution', active: false, icon: Boxes },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-semibold ${
                        item.active ? 'bg-emerald-100/80 text-[#0c4a26]' : 'text-slate-500'
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.name}
                    </div>
                  ))}
                  <div className="mt-7 rounded-xl border border-emerald-100 bg-white p-3">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-slate-700">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                      Access by role
                    </div>
                    <p className="text-[9px] leading-4 text-slate-500">
                      Staff access follows assigned permissions.
                    </p>
                  </div>
                </aside>

                <div className="min-w-0 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Your workspace
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-slate-900">All businesses</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[9px] font-semibold text-slate-600"
                    >
                      Select business <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'Sales overview', value: '—', icon: CircleDollarSign, tint: 'bg-emerald-50 text-emerald-700' },
                      { label: 'Inventory status', value: '—', icon: Package, tint: 'bg-sky-50 text-sky-700' },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-semibold text-slate-500">{metric.label}</span>
                          <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${metric.tint}`}>
                            <metric.icon className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <p className="mt-3 text-xl font-extrabold tracking-tight text-slate-800">{metric.value}</p>
                        <p className="mt-0.5 text-[9px] text-slate-400">Connect your business data</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-100 p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-800">Performance at a glance</p>
                        <p className="mt-0.5 text-[9px] text-slate-400">Reports for your selected period</p>
                      </div>
                      <BarChart3 className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div className="mt-4 flex h-[74px] items-end gap-2 border-b border-l border-slate-100 px-2">
                      {[25, 43, 34, 62, 48, 72, 55, 88, 65, 77, 58, 94].map((height, index) => (
                        <span
                          key={`${height}-${index}`}
                          className={`w-full rounded-t-sm ${index === 11 ? 'bg-[#0c4a26]' : 'bg-emerald-200'}`}
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[8px] font-medium text-slate-400">
                      <span>Period start</span>
                      <span>Period end</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-[#0c4a26] px-3.5 py-3 text-white">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                        <Check className="h-4 w-4 text-emerald-200" />
                      </span>
                      <span>
                        <span className="block text-[10px] font-bold">Your operations, connected</span>
                        <span className="mt-0.5 block text-[9px] text-emerald-100/75">
                          One place to manage with clarity
                        </span>
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-emerald-100" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                <Users className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[10px] font-bold text-slate-800">Teams &amp; permissions</span>
                <span className="block text-[9px] text-slate-500">Access that fits each role</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-slate-200/80 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#0c4a26]">ONE CLEAR VIEW</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              The tools to run your business, together.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              Bring everyday operations into one practical workspace, with access shaped around your team.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item, index) => (
              <article
                key={item.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#0c4a26] transition-colors group-hover:bg-[#0c4a26] group-hover:text-white">
                  <item.icon className="h-5 w-5" />
                </span>
                <p className="mt-5 text-[10px] font-extrabold tracking-[0.14em] text-slate-400">
                  0{index + 1}
                </p>
                <h3 className="mt-1 text-base font-extrabold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#0c4a26]">FLEXIBLE BY DESIGN</p>
            <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl">
              Everything your businesses need, in one place.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">
              A centralized platform for a range of business operations. Choose the workspaces and
              capabilities that fit your business.
            </p>
            <button
              type="button"
              onClick={openApp}
              className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#0c4a26] hover:gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0c4a26]"
            >
              Explore the platform <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {businessTypes.map((type, index) => (
              <div
                key={type}
                className={`flex min-h-[92px] items-center gap-4 rounded-2xl border p-5 ${
                  index % 3 === 0
                    ? 'border-emerald-100 bg-emerald-50/70'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0c4a26] shadow-sm">
                  {index === 4 ? <Package className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                </span>
                <span className="text-sm font-bold text-slate-800">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-y border-slate-200/80 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#0c4a26]">A SIMPLE WORKFLOW</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              From setup to a clearer view.
            </h2>
          </div>
          <div className="relative mt-12 grid gap-5 md:grid-cols-3">
            <div className="absolute left-[17%] right-[17%] top-8 hidden border-t border-dashed border-emerald-200 md:block" />
            {workflow.map((step) => (
              <article key={step.number} className="relative rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-[#0c4a26]">
                    <step.icon className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-extrabold tracking-[0.14em] text-emerald-800">{step.number}</span>
                </div>
                <h3 className="mt-6 text-base font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#0c4a26] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-40 -left-10 h-80 w-80 rounded-full border border-white/10" />
          <div className="relative mx-auto max-w-2xl">
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-emerald-200">READY WHEN YOU ARE</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Your businesses. One smarter way to manage.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-emerald-50/80 sm:text-base">
              Bring your business operations together and make more informed decisions with a centralized
              management platform.
            </p>
            <button
              type="button"
              onClick={openApp}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-[#0c4a26] shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Get started today <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TRUSTED BY LEADING COMPANIES / LOGO SLIDER SECTION           */}
      {/* Positioned directly above the footer                          */}
      {/* ============================================================ */}
      <section id="trusted" className="border-t border-slate-200/90 bg-white py-16 sm:py-20 overflow-hidden relative">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-10 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-extrabold text-[#0c4a26] tracking-[0.14em] uppercase">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Companies Trusted Us</span>
              </div>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
                Trusted by leading businesses &amp; supermarkets
              </h2>
              <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                From bustling neighborhood minimarkets to multi-branch supermarket chains across Rwanda, retail teams rely on Fresh &amp; More M-POS for fast barcode checkouts, accurate stock tracking, and unified business operations.
              </p>
            </div>

            {/* Interactive Mode & Scroll Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setTrustedViewMode('slider')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    trustedViewMode === 'slider'
                      ? 'bg-white text-[#0c4a26] shadow-xs font-black'
                      : 'hover:text-slate-900'
                  }`}
                  title="Continuous smooth marquee flow"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Logo Slider</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrustedViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    trustedViewMode === 'grid'
                      ? 'bg-white text-[#0c4a26] shadow-xs font-black'
                      : 'hover:text-slate-900'
                  }`}
                  title="Evenly spaced grid view"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span>Grid View</span>
                </button>
              </div>

              {trustedViewMode === 'slider' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={scrollLeft}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 transition-colors shadow-2xs cursor-pointer"
                    aria-label="Scroll left"
                    title="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={scrollRight}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 transition-colors shadow-2xs cursor-pointer"
                    aria-label="Scroll right"
                    title="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LOGO PRESENTATION: SLIDER (MARQUEE) OR RESPONSIVE GRID */}
        {trustedViewMode === 'slider' ? (
          <div className="relative mt-8">
            {/* Left and right gradient fade edges */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10" />

            {/* Marquee Track */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto no-scrollbar scroll-smooth py-3"
            >
              <div className="animate-marquee flex items-center gap-5 px-6">
                {/* Loop 1 */}
                {TRUSTED_COMPANIES.map((company) => (
                  <div
                    key={`track-1-${company.id}`}
                    className="group relative flex w-72 sm:w-80 shrink-0 items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs hover:shadow-md hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-200 cursor-default"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${company.gradient} text-white font-black text-sm shadow-md shadow-emerald-950/10 tracking-wider`}
                    >
                      {company.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-[#0c4a26] transition-colors">
                          {company.name}
                        </h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <p className="text-[11.5px] text-slate-500 font-medium truncate mt-0.5">
                        {company.category}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10.5px]">
                        <span className="font-semibold text-slate-500 truncate max-w-[140px]">
                          {company.location}
                        </span>
                        <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[9.5px] bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          {company.branches}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loop 2 (seamless infinite scroll duplicate) */}
                {TRUSTED_COMPANIES.map((company) => (
                  <div
                    key={`track-2-${company.id}`}
                    className="group relative flex w-72 sm:w-80 shrink-0 items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs hover:shadow-md hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-200 cursor-default"
                    aria-hidden="true"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${company.gradient} text-white font-black text-sm shadow-md shadow-emerald-950/10 tracking-wider`}
                    >
                      {company.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-[#0c4a26] transition-colors">
                          {company.name}
                        </h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <p className="text-[11.5px] text-slate-500 font-medium truncate mt-0.5">
                        {company.category}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10.5px]">
                        <span className="font-semibold text-slate-500 truncate max-w-[140px]">
                          {company.location}
                        </span>
                        <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[9.5px] bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          {company.branches}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hover logo card to pause marquee • Use arrows to scroll manually
              </span>
            </div>
          </div>
        ) : (
          /* RESPONSIVE GRID VIEW */
          <div className="mx-auto max-w-7xl px-5 sm:px-8 mt-8">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {TRUSTED_COMPANIES.map((company) => (
                <div
                  key={`grid-${company.id}`}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${company.gradient} text-white font-black text-xs shadow-md shadow-emerald-950/10 tracking-wider`}
                      >
                        {company.initials}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-[#0c4a26] border border-emerald-200/60">
                        {company.branches}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-[#0c4a26] transition-colors leading-snug">
                      {company.name}
                    </h4>
                    <p className="text-[11.5px] text-slate-500 font-medium mt-1 leading-relaxed">
                      {company.category}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                    <span className="font-medium text-slate-400">{company.location}</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOTTOM METRICS BADGE ROW */}
        <div className="mx-auto max-w-7xl px-5 sm:px-8 mt-12 pt-8 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">100+</p>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Active Checkout Lanes</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">99.98%</p>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Uptime &amp; Cloud Reliability</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">&lt; 0.2s</p>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Barcode Scan Speed</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">100%</p>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Offline Checkout Ready</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-sm items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0c4a26] text-emerald-100">
              <Store className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-extrabold text-slate-900">Fresh &amp; More M-POS</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                A centralized platform for managing sales and business operations.
              </span>
            </span>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-600">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-[#0c4a26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0c4a26]">
                {link.label}
              </a>
            ))}
            <a href="#features" className="hover:text-[#0c4a26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0c4a26]">
              Platform features
            </a>
          </nav>
        </div>
        <div className="border-t border-slate-100">
          <p className="mx-auto max-w-7xl px-5 py-4 text-[11px] text-slate-500 sm:px-8">
            © {new Date().getFullYear()} Fresh &amp; More M-POS. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
};
