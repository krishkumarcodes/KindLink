import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Atom,
  Lock,
  MapPin,
  CheckCircle2,
  Users,
  Clock,
  Radio,
  EyeOff,
  HandHeart,
  Award,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildHowToSchema, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'How KindLink Works | Step-by-Step Mutual Aid Dispatch & Privacy',
  description:
    'Learn how KindLink connects neighbors in Asansol during urgent situations. Discover our 5-step dispatch lifecycle, Help Gravity ranking, and mutual privacy reveal.',
  path: '/how-it-works',
});

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Submit an Urgent Need with Spatial Obfuscation',
      icon: Radio,
      detail:
        'When you post a request (e.g., blood donor, wheelchair, or medicine run), you enter the general area (e.g., Kalla, Asansol). Your exact house number and phone number are NEVER exposed publicly. KindLink applies PostGIS spatial fuzzing, placing a randomized 150-meter radius circle on the public map to safeguard your privacy.',
    },
    {
      num: '02',
      title: 'Help Gravity Physics Computes True Priority',
      icon: Atom,
      detail:
        'Traditional feeds sort chronologically or by engagement metrics. KindLink passes each request through our deterministic Help Gravity formula. A life-critical blood request carries a TypeWeight of 10, amplified linearly for every minute the patient has been waiting, and attenuated with distance squared. Nearby helpers see the most urgent cases first.',
    },
    {
      num: '03',
      title: 'Real-Time Notification & Kinematic ETA Preview',
      icon: Clock,
      detail:
        'Verified community volunteers within the immediate catchment area receive instant alerts. Helpers can inspect the exact clinical category, estimated distance in kilometers, and kinematic arrival time calculated for walking (5 km/h), cycling (15 km/h), or driving (30 km/h).',
    },
    {
      num: '04',
      title: 'Two-Way Mutual Agreement & Secure Contact Reveal',
      icon: Lock,
      detail:
        'To prevent spam and protect both sides, communication occurs in a two-way handshake. When a volunteer clicks "Offer Help", the requester inspects the helper\'s verified community badge. Only when BOTH parties explicitly confirm does KindLink unlock direct phone numbers and specific pickup coordinates.',
    },
    {
      num: '05',
      title: 'Fulfillment & Community Trust Score Endorsement',
      icon: Award,
      detail:
        'Once the blood is donated, equipment is handed over, or groceries are delivered, both parties mark the exchange complete in the app. The volunteer receives an authentic trust endorsement, building a verifiable reputation as a pillar of the Asansol community.',
    },
  ];

  const howToSchema = buildHowToSchema({
    name: 'How KindLink Works: 5-Step Community Aid Lifecycle',
    description:
      'Step-by-step lifecycle of posting, physics-ranked dispatching, verified matching, and mutual privacy reveal on KindLink.',
    steps: steps.map((s) => ({
      name: s.title,
      text: s.detail,
    })),
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'How It Works', path: '/how-it-works' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={[howToSchema, breadcrumbSchema]} id="how-to-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'How it Works' }]} />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Sparkles className="h-3.5 w-3.5" />
              Transparent Civic Dispatch
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            How KindLink Works: From Urgent Need to Community Resolution
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            KindLink transforms fragmented, high-friction neighborhood appeals into a fast, privacy-preserving, and
            deterministic mutual aid system. By combining applied physics ranking with a strict two-way mutual consent
            protocol, we ensure aid arrives swiftly while keeping personal contact details and residential addresses
            secure from public scrapers and commercial data brokers.
          </p>

          {/* Action Callout Box */}
          <div className="my-8 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Ready to see the platform in action?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Explore the live map, request simulator, and physics lab right inside the app.
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/25 hover:bg-teal-700 transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>Launch KindLink App</span>
            </Link>
          </div>

          {/* STEP BY STEP LIFECYCLE */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              The 5-Stage Mutual Aid Lifecycle
            </h2>

            <div className="mt-6 space-y-6">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    className="flex flex-col sm:flex-row gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
                  >
                    <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shrink-0">
                      <span className="font-heading text-2xl font-black text-teal-600/40 dark:text-teal-400/40">
                        {step.num}
                      </span>
                      <div className="rounded-xl bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-heading text-base font-bold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* KINDLINK VS SOCIAL MEDIA TABLE */}
          <section className="mt-14">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Why KindLink Outperforms WhatsApp &amp; Facebook Groups
            </h2>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-3.5">Feature</th>
                    <th className="p-3.5">WhatsApp / Facebook Forwards</th>
                    <th className="p-3.5 text-teal-600 dark:text-teal-400">KindLink Mutual Aid Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="p-3.5 font-semibold text-foreground">Geographic Targeting</td>
                    <td className="p-3.5">Uncontrolled broadcasts forward across state lines</td>
                    <td className="p-3.5 text-foreground font-medium">Hyperlocal radius matching (&lt; 5 km in Asansol)</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-foreground">Urgency Ranking</td>
                    <td className="p-3.5">Chronological or algorithm feed buried by memes</td>
                    <td className="p-3.5 text-foreground font-medium">Help Gravity (Newtonian inverse-square formula)</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-foreground">Personal Privacy</td>
                    <td className="p-3.5">Phone number broadcast to thousands, invites scam calls</td>
                    <td className="p-3.5 text-foreground font-medium">Zero public PII; contact unlocked ONLY on mutual agreement</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-semibold text-foreground">Verification &amp; Trust</td>
                    <td className="p-3.5">Unverified strangers and frequent outdated requests</td>
                    <td className="p-3.5 text-foreground font-medium">Government/College ID verified profiles with trust score</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Explore KindLink Dispatch in App</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/safety-and-verification"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Learn about our verification and trust architecture &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
