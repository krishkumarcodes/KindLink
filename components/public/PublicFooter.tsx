import React from 'react';
import Link from 'next/link';
import {
  Heart,
  ShieldCheck,
  Atom,
  GraduationCap,
  MapPin,
  ExternalLink,
  PhoneCall,
  Sparkles,
} from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-border bg-card/60 text-card-foreground transition-colors" role="contentinfo">
      {/* Top Banner / Academic Attribution & Emergency Callout */}
      <div className="border-b border-border/60 bg-teal-500/5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-600/10 p-2 text-teal-600 dark:text-teal-400 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Academic Capstone Initiative &bull; B.Tech Computer Science &amp; Engineering
              </p>
              <p className="text-[11px] text-muted-foreground">
                Asansol Engineering College (AEC), affiliated with MAKAUT, West Bengal &bull; Supervised Community Research
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400">
            <PhoneCall className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              Medical emergency? Call <strong>102</strong> or <strong>112</strong> immediately.
            </span>
          </div>
        </div>
      </div>

      {/* Main Footer Links Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                <svg
                  viewBox="0 0 64 64"
                  className="h-9 w-9 drop-shadow-sm select-none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="pub-footer-grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#0F766E" />
                      <stop offset="40%" stopColor="#0D9488" />
                      <stop offset="75%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#pub-footer-grad)" />
                  <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(-25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
                  <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
                  <path d="M22 28 C18 22, 12 25, 12 32 C12 39, 24 46, 32 50 C40 46, 52 39, 52 32 C52 25, 46 22, 42 28 C39 32, 35 34, 32 34 C29 34, 25 32, 22 28 Z" fill="#FFFFFF" fillOpacity="0.96" />
                  <circle cx="32" cy="32" r="4" fill="#F59E0B" />
                </svg>
              </div>
              <span className="notranslate font-heading text-xl font-extrabold tracking-tight text-foreground">
                Kind<span className="text-teal-600 dark:text-teal-400">Link</span>
              </span>
            </Link>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground max-w-sm">
              KindLink is a verified, physics-ranked community mutual aid network for Asansol, Durgapur, and nearby
              neighborhoods. Designed to eliminate social noise and connect real neighbors when urgent help is needed.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Asansol, West Bengal
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                100% Free &amp; Non-Commercial
              </span>
            </div>

            <div className="mt-5">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Launch Interactive App</span>
              </Link>
            </div>
          </div>

          {/* Help Categories */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Help Categories
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link
                  href="/help/blood-donation"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Blood Donation
                </Link>
              </li>
              <li>
                <Link
                  href="/help/wheelchair-and-equipment"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Medical Equipment
                </Link>
              </li>
              <li>
                <Link
                  href="/help/elderly-assistance"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Elderly Assistance
                </Link>
              </li>
              <li>
                <Link
                  href="/help/books-and-study-material"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Study Materials
                </Link>
              </li>
              <li>
                <Link
                  href="/help/emergency-transport"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Emergency Transport
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & Physics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Platform &amp; Science
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link
                  href="/how-it-works"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  How it Works
                </Link>
              </li>
              <li>
                <Link
                  href="/physics"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Physics &amp; Urgency Model
                </Link>
              </li>
              <li>
                <Link
                  href="/safety-and-verification"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Safety &amp; Verification
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link
                  href="/app"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400 font-semibold text-teal-600 dark:text-teal-400"
                >
                  Open Live Map &amp; App
                </Link>
              </li>
            </ul>
          </div>

          {/* About & Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              About &amp; Trust
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  About KindLink
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Contact &amp; Support
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-muted-foreground transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  Member Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-border/60 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} KindLink. Built with pride at Asansol Engineering College. Non-commercial open community research.
          </p>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <span className="text-border">&bull;</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <span className="text-border">&bull;</span>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
            <span className="text-border">&bull;</span>
            <a
              href="https://github.com/krishkumarcodes/KindLink"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
