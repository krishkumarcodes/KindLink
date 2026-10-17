'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ChevronDown,
  Droplet,
  Stethoscope,
  HeartHandshake,
  BookOpen,
  Car,
  Atom,
  ShieldCheck,
  HelpCircle,
  Info,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useTheme } from 'next-themes';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'How it Works', href: '/how-it-works' },
    { label: 'Safety', href: '/safety-and-verification' },
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
  ];

  const categoryLinks = [
    {
      title: 'Blood Donation',
      href: '/help/blood-donation',
      desc: 'Urgent donor matching & hospital blood needs',
      icon: Droplet,
      color: 'text-rose-500',
    },
    {
      title: 'Medical Equipment',
      href: '/help/wheelchair-and-equipment',
      desc: 'Wheelchairs, concentrators, nebulizers & walkers',
      icon: Stethoscope,
      color: 'text-teal-500',
    },
    {
      title: 'Elderly Assistance',
      href: '/help/elderly-assistance',
      desc: 'Grocery, medicine runs & non-medical support',
      icon: HeartHandshake,
      color: 'text-amber-500',
    },
    {
      title: 'Study Materials',
      href: '/help/books-and-study-material',
      desc: 'Textbooks, exam notes & community book bank',
      icon: BookOpen,
      color: 'text-blue-500',
    },
    {
      title: 'Emergency Transport',
      href: '/help/emergency-transport',
      desc: 'Localized community transit & critical ride aid',
      icon: Car,
      color: 'text-emerald-500',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-xl py-1 text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label="KindLink - Help is just next door"
        >
          {/* KindLink Vector Brand Emblem */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <svg
              viewBox="0 0 64 64"
              className="h-10 w-10 drop-shadow-sm select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="pub-header-grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0F766E" />
                  <stop offset="40%" stopColor="#0D9488" />
                  <stop offset="75%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <radialGradient id="pub-header-beacon" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FDE047" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#EF4444" />
                </radialGradient>
              </defs>
              <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#pub-header-grad)" />
              <rect x="2.5" y="2.5" width="59" height="59" rx="15.5" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1" />
              <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(-25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
              <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
              <circle cx="32" cy="32" r="18" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1.5" />
              <path d="M22 28 C18 22, 12 25, 12 32 C12 39, 24 46, 32 50 C40 46, 52 39, 52 32 C52 25, 46 22, 42 28 C39 32, 35 34, 32 34 C29 34, 25 32, 22 28 Z" fill="#FFFFFF" fillOpacity="0.96" />
              <path d="M23.5 30 C26 33, 29 34.5, 32 34.5 C35 34.5, 38 33, 40.5 30" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
              <circle cx="32" cy="32" r="5" fill="url(#pub-header-beacon)" />
              <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="notranslate font-heading text-xl font-extrabold tracking-tight text-foreground">
              Kind<span className="text-teal-600 dark:text-teal-400">Link</span>
            </span>
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Mutual Aid Network
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              pathname === '/'
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Home
          </Link>

          <Link
            href="/how-it-works"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              pathname === '/how-it-works'
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            How it Works
          </Link>

          {/* Categories Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setCategoriesDropdownOpen(true)}
            onMouseLeave={() => setCategoriesDropdownOpen(false)}
          >
            <button
              onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                pathname.startsWith('/help')
                  ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-expanded={categoriesDropdownOpen}
              aria-haspopup="true"
            >
              <span>Categories</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  categoriesDropdownOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                }`}
              />
            </button>

            {categoriesDropdownOpen && (
              <div className="absolute left-0 top-full pt-2 w-80 shadow-2xl rounded-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-xl backdrop-blur-xl">
                  <div className="px-3 py-2 border-b border-border/60">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      5 Mutual Aid Pillars
                    </p>
                  </div>
                  <div className="mt-1 space-y-1">
                    {categoryLinks.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <Link
                          key={cat.href}
                          href={cat.href}
                          onClick={() => setCategoriesDropdownOpen(false)}
                          className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/80"
                        >
                          <div className={`mt-0.5 rounded-lg p-1.5 bg-muted shrink-0 ${cat.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">{cat.title}</div>
                            <div className="text-[11px] text-muted-foreground leading-tight">{cat.desc}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/safety-and-verification"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              pathname === '/safety-and-verification'
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Safety
          </Link>

          <Link
            href="/faq"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              pathname === '/faq'
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            FAQ
          </Link>

          <Link
            href="/about"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              pathname === '/about'
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            About
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Sign In Button */}
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
          >
            Sign In
          </Link>

          {/* Launch App Primary CTA */}
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700 active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-200" />
            <span>Launch App</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border md:hidden text-foreground hover:bg-muted"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-card px-4 pb-6 pt-3 md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive(link.href)
                    ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-2 pb-1 border-t border-border/60">
              <span className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Help Categories
              </span>
              <div className="mt-1.5 space-y-1">
                {categoryLinks.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Icon className={`h-4 w-4 ${cat.color}`} />
                      <span>{cat.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                Sign In
              </Link>
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700"
              >
                Launch App
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
