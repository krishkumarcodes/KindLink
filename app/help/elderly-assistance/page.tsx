import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Pill,
  Smartphone,
  Users,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Elderly Assistance in Asansol | Senior Support & Grocery Runs',
  description:
    'Compassionate mutual aid for senior citizens in Asansol and Burnpur. Verified volunteers assist with medicine pickups, groceries, digital utilities, and companionship.',
  path: '/help/elderly-assistance',
});

export default function ElderlyAssistancePage() {
  const serviceTypes = [
    {
      title: 'Prescription Medicine Pickup',
      icon: Pill,
      description:
        'Collecting regular blood pressure, diabetes, and heart medication from trusted local pharmacies in Asansol or Burnpur according to doctor-prescribed slips.',
    },
    {
      title: 'Daily Grocery & Provision Runs',
      icon: ShoppingBag,
      description:
        'Purchasing heavy daily essentials such as milk, flour, rice, and fresh vegetables from neighborhood markets for elders facing joint pain or mobility limitations.',
    },
    {
      title: 'Digital Literacy & Utility Assistance',
      icon: Smartphone,
      description:
        'Helping seniors operate smartphones, navigate WBSEDCL electricity bill payments, book online rail tickets, or video-call distant grandchildren.',
    },
    {
      title: 'Clinical Accompaniment & Mobility Escort',
      icon: Users,
      description:
        'Walking alongside senior citizens to routine doctor appointments, diagnostic laboratories, or evening park strolls for safety and warm companionship.',
    },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Help Categories', path: '/#categories' },
    { name: 'Elderly Assistance', path: '/help/elderly-assistance' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="elderly-assistance-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Help Categories', href: '/#categories' },
              { label: 'Elderly Assistance' },
            ]}
          />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <HeartHandshake className="h-3.5 w-3.5" />
              Category Weight 6/10 &bull; Senior Community Care
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Elderly Assistance &amp; Senior Support: Neighborhood Care in Asansol
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            In industrial towns like Asansol, Burnpur, and Raniganj, thousands of senior citizens live independently
            after their adult children migrated to Bangalore, Hyderabad, Pune, or overseas for technology and corporate
            careers. While these elders cherish their independence and ancestral homes, everyday chores — carrying heavy
            ration bags, queuing at local pharmacies, or troubleshooting digital smartphone issues — can become
            overwhelming hurdles. KindLink bridges this generational gap by pairing trustworthy, verified youth and
            college volunteers with seniors living in the same residential ward.
          </p>

          {/* Action Callout Box */}
          <div className="my-8 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Need Support for an Elderly Parent or Relative?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Schedule a routine check-in, medicine run, or grocery escort with verified neighborhood helpers.
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

          {/* COMMON SUPPORT CHANNELS */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Core Elderly Assistance Areas
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serviceTypes.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400 font-bold text-sm">
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SAFETY PROTOCOLS & VOLUNTEER BOUNDARIES */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Verification Protocols &amp; Strict Volunteer Boundaries
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Protecting senior citizens requires ironclad safety norms and clear operational limits. KindLink enforces
              the following non-negotiable boundaries:
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Multi-Tier Volunteer Identity Check</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Volunteers accepting senior support tasks undergo government ID (Aadhaar / Voter ID) or college
                    student ID validation. Their phone number is verified via OTP and stored securely.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Strict Financial Boundary: Zero Banking &amp; ATM Handling</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Volunteers are strictly forbidden from handling ATM debit cards, bank passbooks, cheque books, or
                    passwords. Grocery and medicine receipts must be provided with exact change upon delivery.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Non-Medical Companion Scope</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    KindLink volunteers provide non-clinical social aid. They do not administer injections, adjust oxygen
                    dosages, or perform nursing procedures. In acute crises, volunteers immediately dial 102/112 and
                    notify emergency contacts registered in the app.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FALL IMPACT INTEGRATION */}
          <section className="mt-12 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Hardware Fall Detection Safeguard
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              KindLink integrates an experimental hardware-accelerated fall impact detector that utilizes the smartphone&apos;s
              internal 3-axis accelerometer. In the event of a sudden acceleration spike (&gt; 22 m/s&sup2;) followed
              by prolonged inactivity, the app triggers an audio alarm and 10-second countdown before notifying designated
              family members and nearby community responders.
            </p>
            <div className="mt-4">
              <Link
                href="/physics"
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Read how the accelerometer low-pass filter works &rarr;</span>
              </Link>
            </div>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Schedule Senior Assistance in App</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/safety-and-verification"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Review our volunteer screening protocols &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
