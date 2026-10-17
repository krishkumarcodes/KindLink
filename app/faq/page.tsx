import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Atom,
  ChevronDown,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildFaqSchema, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Frequently Asked Questions (FAQ) | KindLink Mutual Aid Asansol',
  description:
    'Got questions about KindLink? Read detailed answers on our urgency ranking, privacy guarantees, volunteer verification, blood matching, and community origins.',
  path: '/faq',
});

export default function FAQPage() {
  const faqs = [
    {
      q: 'What is KindLink and who operates it?',
      a: 'KindLink is an open community mutual aid platform created for community resilience in West Bengal. It connects neighbors in Asansol, Burnpur, and Durgapur for urgent mutual aid including blood donation, medical equipment sharing, senior citizen care, study materials, and emergency transport.',
    },
    {
      q: 'Is KindLink completely free? Are there any hidden charges or fees?',
      a: 'Yes, KindLink is 100% free of charge. There are no registration fees, platform commissions, subscription tiers, or advertisements. The platform is strictly non-commercial and governed as public civic technology.',
    },
    {
      q: 'How does KindLink prioritize which help request appears first?',
      a: 'Unlike social media platforms that rank posts by engagement or ad bids, KindLink uses a transparent three-key sorting model: (1) Urgency Level (Critical > High > Medium > Low), where life-critical blood and emergency transit are prioritized first; (2) Nearest Distance, alerting closest neighbors first; and (3) Waiting Time, so that older unresolved requests steadily rise to the top of the feed.',
    },
    {
      q: 'Is KindLink a replacement for official emergency services (102 / 112)?',
      a: 'No. KindLink is a localized peer-to-peer mutual aid network designed to supplement community resilience. For life-threatening trauma, cardiac arrest, fires, or violent crime, always call National Emergency Services (112), Ambulance (102), or Police (100) immediately before seeking neighbor assistance.',
    },
    {
      q: 'How is my privacy protected? Will my home address or phone number be visible online?',
      a: 'Your sensitive personal data is never made public. KindLink applies PostGIS spatial fuzzing to all coordinates, displaying only a broad 150-meter radius circle on public map views. Exact apartment details and phone numbers are encrypted and unlocked ONLY after both the requester and volunteer mutually agree to connect.',
    },
    {
      q: 'How does emergency blood donor matching work in Asansol?',
      a: 'Requesters submit a blood request indicating patient group, hospital (e.g., Asansol District Hospital or Burnpur Hospital), and requisition slip status. KindLink alerts compatible donors within 5 km. All donations must occur strictly inside certified hospital blood banks following CDSCO and NBTC testing standards.',
    },
    {
      q: 'What if I do not own a vehicle — can I still volunteer?',
      a: 'Absolutely. Many essential aid categories require no motor transport at all. Volunteers regularly help senior neighbors by walking to local grocers or pharmacies, lending study materials, sharing wheelchairs, or donating blood at local clinics.',
    },
    {
      q: 'How does the medical equipment sharing pool operate?',
      a: 'Families with unused medical gear (wheelchairs, oxygen concentrators, nebulizers, walkers, crutches) list them in the app. Neighbors in need of temporary recovery equipment request to borrow them. Both parties agree on a loan window and follow strict 70% alcohol sanitization protocols before and after handoff.',
    },
    {
      q: 'How does the Emergency SOS button work?',
      a: 'KindLink features an Emergency SOS trigger on the home screen and navigation bar. Holding the button for 2 seconds activates high-priority emergency alert mode, alerting nearby verified responders and community contacts with audio alerts and route guidance.',
    },
    {
      q: 'Can students from other institutions or residents outside Asansol join?',
      a: 'Yes. Anyone in Paschim Bardhaman, Purulia, Bankura, Dhanbad, or neighboring districts can sign up as a requester or volunteer.',
    },
    {
      q: 'What technology stack powers KindLink?',
      a: 'KindLink is built with Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Leaflet for geospatial visualization, Zustand for state management, and Supabase PostgreSQL with PostGIS extension for spatial queries and realtime WebSockets.',
    },
    {
      q: 'How can I contribute to or audit the project source code?',
      a: 'KindLink is open-source under the MIT License. The complete source code is hosted on GitHub at https://github.com/krishkumarcodes/KindLink. Developers and students are welcome to fork the repository, report bugs, and submit pull requests.',
    },
  ];

  // Schema.org FAQPage structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  const breadcrumbLd = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'FAQ', path: '/faq' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={[jsonLd, breadcrumbLd]} id="faq-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'FAQ' }]} />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <HelpCircle className="h-3.5 w-3.5" />
              Community Knowledge Base
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions: Everything You Need to Know About KindLink
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Have questions about how KindLink prioritizes emergency requests, preserves privacy, or verifies community
            volunteers? Here are clear, transparent answers to the most common inquiries from our neighbors in Asansol.
          </p>

          {/* Action Callout Box */}
          <div className="my-8 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Have a question not listed here?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Reach out to our community support team.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/25 hover:bg-teal-700 transition-all shrink-0"
            >
              <span>Contact Us</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* FAQ ACCORDION LIST */}
          <section className="mt-10 space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-teal-500/40 [&_summary::-webkit-details-marker]:hidden"
                open={index === 0}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-left font-heading text-sm font-bold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400">
                  <span>{faq.q}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="mt-3 pt-3 border-t border-border/60 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Launch KindLink Interactive App</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/how-it-works"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Learn more about community dispatch &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
