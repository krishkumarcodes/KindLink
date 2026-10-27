import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Droplet,
  Stethoscope,
  HeartHandshake,
  BookOpen,
  Car,
  Navigation,
  ShieldCheck,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
  Lock,
  Compass,
  CheckCircle2,
  Users,
  Zap,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import {
  JsonLd,
  buildWebSiteSchema,
  buildOrganizationSchema,
  buildWebApplicationSchema,
} from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'KindLink - Help is just next door | Local Mutual Aid & Crisis Response',
  description:
    'Verified community mutual aid & emergency response network for urgent local tasks in Asansol and neighboring areas. Connect with trusted neighbours for blood donation, medical help, and urgent local support.',
  path: '/',
});

export default function PublicHomePage() {
  const categories = [
    {
      title: 'Blood Donation',
      href: '/help/blood-donation',
      urgencyHint: 'Usually Critical',
      eta: '< 15 min response target',
      description:
        'Urgent donor matching for rare groups (O-, AB-) during accidents and critical surgeries at Asansol District Hospital, Burnpur, and Durgapur clinics.',
      icon: Droplet,
      accent: 'from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
      badgeBorder: 'border-rose-500/30',
      glowColor: 'shadow-rose-500/15',
    },
    {
      title: 'Emergency Transport',
      href: '/help/emergency-transport',
      urgencyHint: 'Usually High',
      eta: '< 10 min transit matching',
      description:
        'Community transit assistance for urgent medical appointments, hospital transfers, and localized emergencies when commercial ambulances are delayed.',
      icon: Car,
      accent: 'from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      badgeBorder: 'border-amber-500/30',
      glowColor: 'shadow-amber-500/15',
    },
    {
      title: 'Elderly Assistance',
      href: '/help/elderly-assistance',
      urgencyHint: 'Flexible timing',
      eta: 'Same-day scheduled support',
      description:
        'Support for senior citizens living alone: essential grocery runs, prescription medicine pickup, and hospital accompaniment with verified local volunteers.',
      icon: HeartHandshake,
      accent: 'from-teal-500/20 via-teal-500/10 to-transparent border-teal-500/30 text-teal-600 dark:text-teal-400',
      badgeBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
      badgeBorder: 'border-teal-500/30',
      glowColor: 'shadow-teal-500/15',
    },
    {
      title: 'Medical Equipment',
      href: '/help/wheelchair-and-equipment',
      urgencyHint: 'Standard priority',
      eta: 'Community lending pool',
      description:
        'Free short-term lending of wheelchairs, oxygen concentrators, nebulizers, walkers, and crutches from neighbors with unused equipment at home.',
      icon: Stethoscope,
      accent: 'from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
      badgeBorder: 'border-cyan-500/30',
      glowColor: 'shadow-cyan-500/15',
    },
    {
      title: 'Study Materials',
      href: '/help/books-and-study-material',
      urgencyHint: 'Community aid',
      eta: 'Peer semester book bank',
      description:
        'Academic textbook lending for engineering, CBSE, and state board curriculums, reducing semester costs for hardworking students.',
      icon: BookOpen,
      accent: 'from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
      badgeBorder: 'border-indigo-500/30',
      glowColor: 'shadow-indigo-500/15',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Post or Discover a Need',
      summary:
        'Requesters submit an urgent aid request in under 30 seconds. Your exact street address and phone number remain completely hidden — only an approximate spatial zone is shared with nearby helpers.',
    },
    {
      number: '02',
      title: 'Community Urgency Dispatch',
      summary:
        'Requests are prioritized by urgency level, nearest distance, and waiting time. Closer neighbors receive higher priority notifications, ensuring rapid response.',
    },
    {
      number: '03',
      title: 'Mutual Agreement & Safe Reveal',
      summary:
        'When a verified helper offers assistance, both parties review trust ratings. Contact details and exact pickup locations unlock ONLY after mutual confirmation.',
    },
  ];

  const homeSchemas = [
    buildWebSiteSchema(),
    buildOrganizationSchema(),
    buildWebApplicationSchema(),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={homeSchemas} id="home-structured-data" />
      <PublicHeader />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-teal-500/5 via-background to-background py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                <span>Urgency Ranked &bull; Powered by Community Trust</span>
              </div>

              {/* Main H1 */}
              <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl sm:leading-[1.15]">
                Help is Just Next Door: Real-Time Verified Mutual Aid in Asansol
              </h1>

              {/* Mission & Problem Statement */}
              <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                When an emergency hits — whether your family member needs rare O-negative blood, an elderly parent
                requires immediate prescription medicines, or an injured student needs a wheelchair — urgent alert messages
                on WhatsApp get lost in noise. KindLink connects you directly with verified neighbors living within
                walking or cycling distance, using transparent community urgency ranking instead of commercial ad models.
              </p>

              {/* Call to Actions */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Get Started / Login</span>
                </Link>

                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-card hover:border-teal-500/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                >
                  <span>Launch KindLink App</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 backdrop-blur-md px-5 py-3.5 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                >
                  <Users className="h-4 w-4" />
                  <span>Join as Volunteer</span>
                </Link>
              </div>

              {/* Quick Trust Highlights */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Zero Public Personal Data
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-teal-500" />
                  PostGIS Geofence Obfuscation
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  100% Free &amp; Non-Profit
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 5 HELP CATEGORIES GRID */}
        <section className="py-16 sm:py-20 border-b border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Five Specialized Mutual Aid Pillars
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Every category is governed by intelligent urgency priority levels and dispatch rules to ensure life-saving
                emergencies are never crowded out by everyday requests.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.href}
                    className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card/85 dark:bg-card/75 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/50 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className={`relative rounded-2xl border p-3 bg-gradient-to-br ${cat.accent} shadow-md group-hover:scale-110 group-hover:shadow-lg transition-transform duration-300 ring-1 ring-white/10`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${cat.badgeBorder} ${cat.badgeBg} shadow-xs`}>
                          {cat.urgencyHint}
                        </span>
                      </div>

                      <h3 className="mt-5 font-heading text-lg font-bold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {cat.title}
                      </h3>

                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {cat.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 dark:bg-muted/40 border border-border/60 text-[11px] font-semibold text-foreground">
                        <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>{cat.eta}</span>
                      </span>

                      <Link
                        href={cat.href}
                        className="font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 group-hover:translate-x-0.5 transition-all flex items-center gap-1 text-xs"
                      >
                        <span>Guidelines</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Extra Interactive Card */}
              <div className="group flex flex-col justify-between rounded-3xl border border-dashed border-teal-500/40 bg-gradient-to-br from-teal-500/10 via-card/90 to-emerald-500/10 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/60 hover:-translate-y-1 transition-all duration-300">
                <div>
                  <div className="relative rounded-2xl border border-teal-500/40 bg-gradient-to-br from-teal-500/20 to-emerald-500/10 p-3 text-teal-600 dark:text-teal-300 w-fit shadow-md group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10">
                    <Navigation className="h-5 w-5 text-teal-500" />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-bold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    Local Road Routing &amp; Hospitals
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    KindLink features real road distance calculation, bike and walking ETAs via OSRM,
                    and instant directories of nearby hospitals, blood banks, and clinics.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-teal-500/20">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Explore Live Interactive Map</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS IN 3 SIMPLE STEPS */}
        <section className="py-16 sm:py-20 bg-muted/30 border-b border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                How KindLink Works in 3 Simple Steps
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                No algorithms manipulating your feed. No advertisement auctions. Just direct, deterministic community dispatch.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <span className="font-heading text-3xl font-black text-teal-600/30 dark:text-teal-400/30 block">
                    {step.number}
                  </span>
                  <h3 className="mt-2 font-heading text-base font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {step.summary}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                <span>Read complete dispatch and trust lifecycle</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* LIVE-STYLE COMMUNITY STATS */}
        <section className="py-16 border-b border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-sm">
              <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
                <div>
                  <div className="font-heading text-3xl sm:text-4xl font-extrabold text-teal-600 dark:text-teal-400">
                    &lt; 5 km
                  </div>
                  <div className="mt-1 text-xs font-semibold text-foreground">Active Volunteer Radius</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Hyperlocal neighborhood coverage</div>
                </div>

                <div>
                  <div className="font-heading text-3xl sm:text-4xl font-extrabold text-teal-600 dark:text-teal-400">
                    12 min
                  </div>
                  <div className="mt-1 text-xs font-semibold text-foreground">Median Response Window</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">For critical blood &amp; transit needs</div>
                </div>

                <div>
                  <div className="font-heading text-3xl sm:text-4xl font-extrabold text-teal-600 dark:text-teal-400">
                    100%
                  </div>
                  <div className="mt-1 text-xs font-semibold text-foreground">Free Mutual Aid</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Zero fees, commissions or ads</div>
                </div>

                <div>
                  <div className="font-heading text-3xl sm:text-4xl font-extrabold text-teal-600 dark:text-teal-400">
                    0 Bytes
                  </div>
                  <div className="mt-1 text-xs font-semibold text-foreground">Public Sensitive PII</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Contact revealed only on mutual match</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMMUNITY DISPATCH & URGENCY RANKING SECTION */}
        <section className="py-16 sm:py-20 border-b border-border/60 bg-gradient-to-b from-background to-teal-500/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
                  Three-Key Community Priority
                </div>
                <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Fair, Transparent Dispatch: Urgency, Proximity &amp; Waiting Time
                </h2>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Unlike commercial platforms that hide posts behind paywalls or engagement bait, KindLink prioritizes community requests using an honest, deterministic three-key ranking:
                </p>

                <div className="mt-6 rounded-3xl border border-teal-500/30 bg-slate-950/90 dark:bg-slate-950/95 text-slate-100 p-6 sm:p-7 shadow-2xl shadow-teal-950/30 backdrop-blur-xl relative overflow-hidden group hover:border-teal-400/50 transition-all duration-300">
                  <div className="absolute -top-20 -right-20 w-44 h-44 bg-teal-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-teal-500/25 transition-all duration-500" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-teal-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Zap className="h-3.5 w-3.5 text-teal-400" />
                      Priority Ordering Criteria
                    </div>
                    <span className="text-[10px] text-teal-300/80 border border-teal-500/30 px-2.5 py-0.5 rounded-full bg-teal-500/10 font-sans">
                      Deterministic Sort
                    </span>
                  </div>
                  <div className="text-teal-200 bg-slate-900/95 border border-teal-500/25 p-4 rounded-2xl overflow-x-auto font-mono text-xs sm:text-sm font-bold shadow-inner tracking-wide">
                    Urgency Level &rarr; Nearest Distance &rarr; Longest Waiting Time
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-sans text-slate-300">
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-teal-500/15">
                      <strong className="text-rose-400 block mb-0.5">1. Urgency Level</strong>
                      Critical &gt; High &gt; Medium &gt; Low
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-teal-500/15">
                      <strong className="text-amber-400 block mb-0.5">2. Distance</strong>
                      Nearest neighbors alerted first
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-teal-500/15">
                      <strong className="text-teal-400 block mb-0.5">3. Waiting Time</strong>
                      Unanswered requests rise in queue
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-teal-900/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                  >
                    <span>Learn How Community Aid Works</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Visual Benefits Card */}
              <div className="rounded-3xl border border-teal-500/30 bg-slate-950/80 dark:bg-slate-950/90 text-slate-100 p-6 sm:p-8 shadow-2xl shadow-teal-950/20 backdrop-blur-xl relative overflow-hidden group hover:border-teal-400/50 transition-all duration-300">
                <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />
                <h3 className="font-heading text-base font-bold text-slate-100 mb-5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-400" />
                  Why Community Mutual Aid Saves Lives
                </h3>
                <div className="space-y-4 text-xs text-slate-300">
                  <div className="flex gap-3 items-start">
                    <div className="rounded-xl bg-teal-500/15 border border-teal-500/30 p-2 text-teal-400 shrink-0 shadow-sm shadow-teal-500/10">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="text-slate-100 block font-semibold mb-0.5">Zero Algorithm Bias</strong>
                      Commercial social platforms rank content to maximize rage and dwell time. KindLink ranks solely
                      by emergency need, physical proximity, and waiting time.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="rounded-xl bg-teal-500/15 border border-teal-500/30 p-2 text-teal-400 shrink-0 shadow-sm shadow-teal-500/10">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="text-slate-100 block font-semibold mb-0.5">Real Road Route &amp; Travel Times</strong>
                      Helpers see actual road travel distances and accurate transit times for walking, bicycle,
                      and vehicles powered by OpenStreetMap OSRM routing.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="rounded-xl bg-teal-500/15 border border-teal-500/30 p-2 text-teal-400 shrink-0 shadow-sm shadow-teal-500/10">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="text-slate-100 block font-semibold mb-0.5">Nearby Healthcare Facility Integration</strong>
                      Instant access to nearest verified hospitals, clinics, blood banks, and 24x7 emergency contacts
                      with one-tap calling and directions.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="py-16 sm:py-20 text-center">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ready to Strengthen Your Neighborhood?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Whether you want to lend a wheelchair stored in your attic, register as a willing O-negative blood donor,
              or request urgent assistance for an elderly parent in Asansol, KindLink is ready.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                <Sparkles className="h-4 w-4" />
                <span>Get Started / Login</span>
              </Link>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-card hover:border-teal-500/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                <span>Launch Interactive App Now</span>
              </Link>
              <Link
                href="/safety-and-verification"
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-card hover:border-teal-500/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Our Safety Guarantees</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
