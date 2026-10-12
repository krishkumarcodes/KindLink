import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Scale,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Terms of Service | Community Mutual Aid Standards - KindLink',
  description:
    'KindLink terms of service: Non-commercial civic ethos, Good Samaritan safe harbor, prohibited conduct, emergency disclaimers, and academic attribution.',
  path: '/terms',
});

export default function TermsPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Terms of Service', path: '/terms' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="terms-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Terms of Service' }]} />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Scale className="h-3.5 w-3.5" />
              Community Covenant &amp; Mutual Aid Standards
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Terms of Service: Mutual Aid Community Standards &amp; Disclaimers
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            By accessing or using the KindLink application and associated public services, you enter into a binding
            community agreement governed by humanitarian mutual aid ethics, Good Samaritan protections, and civil
            respect. Please review these standards carefully.
          </p>

          {/* SECTION 1: NON-COMMERCIAL ETHOS */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              1. Non-Commercial Ethos: Strictly Free Aid
            </h2>
            <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              <p className="text-foreground font-semibold mb-1">
                KindLink is 100% voluntary and non-monetized.
              </p>
              <p>
                Users are strictly prohibited from demanding fees, tips, delivery charges, security deposits, or any
                financial compensation in exchange for responding to blood donation, equipment lending, elderly care,
                or transport requests. Attempting to commercialize mutual aid on KindLink results in immediate and
                permanent account termination.
              </p>
            </div>
          </section>

          {/* SECTION 2: GOOD SAMARITAN SAFE HARBOR */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              2. Good Samaritan Protection &amp; Liability Limitations
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Volunteers act solely in a voluntary capacity as private citizens. Under Section 134A of the Motor Vehicles
              (Amendment) Act, 2019 and Indian Supreme Court Good Samaritan directives, individuals rendering bona fide
              assistance to injured persons or medical emergencies are protected from civil or criminal liability.
            </p>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              KindLink, its student developers, and Asansol Engineering College provide an open matchmaking protocol on
              an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind. Volunteers and requesters assume
              responsibility for exercising ordinary prudence, mutual respect, and basic safety during all physical interactions.
            </p>
          </section>

          {/* SECTION 3: EMERGENCY SERVICES DISCLAIMER */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              3. Emergency Services Disclaimer
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              KindLink is a peer mutual aid communication network and is NOT a municipal dispatch agency or clinical
              healthcare provider. If you or a loved one is experiencing a severe medical emergency, active violence,
              fire, or life-threatening crisis, dial <strong>112 (National Emergency)</strong> or <strong>102 (Ambulance)</strong>
              immediately. Do not rely exclusively on peer response when minutes determine life or death.
            </p>
          </section>

          {/* SECTION 4: PROHIBITED CONDUCT */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              4. Prohibited Conduct &amp; Account Sanctions
            </h2>
            <div className="mt-4 space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>The following actions are strictly forbidden on the KindLink network:</p>
              <ul className="space-y-1.5 pl-4 list-disc">
                <li>Submitting false or hoax emergency requests or simulated SOS beacons.</li>
                <li>Harassment, stalking, or inappropriate messaging of any user after contact unlock.</li>
                <li>Impersonating hospital officials, doctors, or verified emergency personnel.</li>
                <li>Damaging, reselling, or failing to return borrowed medical equipment or study materials.</li>
                <li>Automated scraping, bot indexing of private routes, or reverse engineering of auth tokens.</li>
              </ul>
            </div>
          </section>

          {/* SECTION 5: ACADEMIC CAPSTONE STATUS */}
          <section className="mt-12 rounded-2xl border border-border bg-muted/40 p-6">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <GraduationCap className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>Academic Capstone Status &amp; Jurisdiction</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              KindLink is developed and administered under academic research guidelines within the Department of Computer
              Science &amp; Engineering at Asansol Engineering College, West Bengal. Any disputes arising in connection
              with the platform shall be subject to the exclusive jurisdiction of the competent courts in Paschim Bardhaman,
              West Bengal, India.
            </p>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Review Privacy Policy</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/contact"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Contact our platform team &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
