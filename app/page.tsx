import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Droplet,
  Stethoscope,
  HeartHandshake,
  BookOpen,
  Car,
  Atom,
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
  title: 'Help is Just Next Door | Verified Community Aid in Asansol',
  description:
    'Verified, physics-ranked mutual aid platform for Asansol, Durgapur, and neighboring districts. Rapid blood matching, medical equipment sharing, and elderly support.',
  path: '/',
});

export default function PublicHomePage() {
  const categories = [
    {
      title: 'Blood Donation',
      href: '/help/blood-donation',
      weight: 'Weight 10/10',
      eta: '< 15 min response target',
      description:
        'Urgent donor matching for rare groups (O-, AB-) during accidents and critical surgeries at Asansol District Hospital, Burnpur, and Durgapur clinics.',
      icon: Droplet,
      accent: 'from-rose-500/15 to-rose-600/5 border-rose-500/20 text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Emergency Transport',
      href: '/help/emergency-transport',
      weight: 'Weight 9/10',
      eta: '< 10 min transit matching',
      description:
        'Community transit assistance for urgent medical appointments, hospital transfers, and localized emergencies when commercial ambulances are delayed.',
      icon: Car,
      accent: 'from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Elderly Assistance',
      href: '/help/elderly-assistance',
      weight: 'Weight 6/10',
      eta: 'Same-day scheduled support',
      description:
        'Support for senior citizens living alone: essential grocery runs, prescription medicine pickup, and hospital accompaniment with verified local volunteers.',
      icon: HeartHandshake,
      accent: 'from-teal-500/15 to-teal-600/5 border-teal-500/20 text-teal-600 dark:text-teal-400',
      badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    },
    {
      title: 'Medical Equipment',
      href: '/help/wheelchair-and-equipment',
      weight: 'Weight 5/10',
      eta: 'Community lending pool',
      description:
        'Free short-term lending of wheelchairs, oxygen concentrators, nebulizers, walkers, and crutches from neighbors with unused equipment at home.',
      icon: Stethoscope,
      accent: 'from-cyan-500/15 to-cyan-600/5 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
    {
      title: 'Study Materials',
      href: '/help/books-and-study-material',
      weight: 'Weight 2/10',
      eta: 'Peer semester book bank',
      description:
        'Academic textbook lending for engineering (AEC MAKAUT syllabus), CBSE, and state board curriculums, reducing semester costs for hardworking students.',
      icon: BookOpen,
      accent: 'from-indigo-500/15 to-indigo-600/5 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Post or Discover a Need',
      summary:
        'Requesters submit an urgent aid request in under 30 seconds. Your exact street address and phone number remain completely hidden — only an approximate spatial zone is broadcast.',
    },
    {
      number: '02',
      title: 'Help Gravity Physics Matching',
      summary:
        'Our Newtonian-inspired formula calculates proximity, urgency weight, and elapsed wait time. Closer neighbors receive higher priority notifications, ensuring rapid response.',
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
                <Atom className="h-3.5 w-3.5 animate-spin-slow" />
                <span>Ranked by Physics &bull; Powered by Community Trust</span>
              </div>

              {/* Main H1 */}
              <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl sm:leading-[1.15]">
                Help is Just Next Door: Real-Time Verified Mutual Aid in Asansol
              </h1>

              {/* Mission & Problem Statement */}
              <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                When an emergency hits — whether your family member needs rare O-negative blood, an elderly parent
                requires immediate prescription medicines, or an injured student needs a wheelchair — broadcast messages
                on WhatsApp get lost in noise. KindLink connects you directly with verified neighbors living within
                walking or cycling distance, using deterministic physics algorithms instead of commercial ad models.
              </p>

              {/* Call to Actions */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Launch KindLink App</span>
                </Link>

                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
                >
                  <span>See How it Works</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/5 px-5 py-3.5 text-sm font-semibold text-teal-700 dark:text-teal-300 transition-all hover:bg-teal-500/10 active:scale-[0.98]"
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
                Every category is governed by custom urgency weights and dispatch rules to ensure life-saving
                emergencies are never crowded out by everyday requests.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.href}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:border-teal-500/50 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className={`rounded-xl border p-2.5 bg-gradient-to-br ${cat.accent}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cat.badgeBg}`}>
                          {cat.weight}
                        </span>
                      </div>

                      <h3 className="mt-4 font-heading text-lg font-bold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {cat.title}
                      </h3>

                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {cat.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        {cat.eta}
                      </span>

                      <Link
                        href={cat.href}
                        className="font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                      >
                        <span>Guidelines</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Extra Interactive Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-dashed border-teal-500/40 bg-teal-500/5 p-6">
                <div>
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-2.5 text-teal-600 dark:text-teal-400 w-fit">
                    <Atom className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                    Real-Time Kinematics &amp; IMU Sensor
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    KindLink features an in-app Physics Laboratory that evaluates great-circle Haversine distances,
                    arrival velocity kinematics, and hardware-accelerated fall impact detection.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-teal-500/20">
                  <Link
                    href="/physics"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline"
                  >
                    <span>Read Applied Physics Breakdown</span>
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

        {/* PHYSICS PREVIEW SECTION */}
        <section className="py-16 sm:py-20 border-b border-border/60 bg-gradient-to-b from-background to-teal-500/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">
                  <Zap className="h-3.5 w-3.5" />
                  Applied Newtonian Mechanics
                </div>
                <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Help Gravity: Urgency Modeled Like Gravitational Attraction
                </h2>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Just as Newton discovered that gravitational force increases with mass and falls off with the
                  square of the distance, KindLink treats urgent needs like celestial masses:
                </p>

                <div className="mt-5 rounded-2xl border border-teal-500/30 bg-card p-5 font-mono text-xs sm:text-sm shadow-sm">
                  <div className="text-teal-600 dark:text-teal-400 font-bold mb-1">
                    Help Gravity Equation:
                  </div>
                  <div className="text-foreground bg-muted/60 p-3 rounded-xl overflow-x-auto">
                    Score = [TypeWeight &times; (1 + 0.05 &times; &Delta;t)] / (1 + Distance)^2
                  </div>
                  <div className="mt-3 text-[11px] font-sans text-muted-foreground leading-relaxed">
                    Where <strong>TypeWeight</strong> reflects life sensitivity (Blood = 10, Transport = 9, Books = 2),
                    <strong>&Delta;t</strong> represents waiting minutes amplifying priority over time, and
                    <strong>Distance</strong> creates an inverse-square attenuation so immediate neighbors see it first.
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/physics"
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
                  >
                    <span>Explore Physics Formulations &amp; Simulator</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Visual Formula Card */}
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
                <h3 className="font-heading text-base font-bold text-foreground mb-4">
                  Why Deterministic Physics Outperforms Social Feeds
                </h3>
                <div className="space-y-4 text-xs text-muted-foreground">
                  <div className="flex gap-3 items-start">
                    <div className="rounded-lg bg-teal-500/10 p-1.5 text-teal-600 dark:text-teal-400 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="text-foreground block">Zero Algorithm Bias</strong>
                      Commercial social platforms rank content to maximize rage and dwell time. KindLink ranks solely
                      by medical urgency, waiting time, and real physical proximity.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="rounded-lg bg-teal-500/10 p-1.5 text-teal-600 dark:text-teal-400 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="text-foreground block">Kinematic ETA Calculation</strong>
                      Helpers see realistic travel times (t = d / v) computed for walking (5 km/h), bicycle (15 km/h),
                      and motor vehicles (30 km/h) before committing.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="rounded-lg bg-teal-500/10 p-1.5 text-teal-600 dark:text-teal-400 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="text-foreground block">Autonomous Fall Impact Alert</strong>
                      A hardware low-pass filtered accelerometer detects sudden deceleration (&gt; 22 m/s&sup2;)
                      and activates a 10-second safety countdown for vulnerable seniors.
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
                href="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 hover:bg-teal-700 transition-all active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Launch Interactive App Now</span>
              </Link>
              <Link
                href="/safety-and-verification"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition-all"
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
