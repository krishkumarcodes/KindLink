import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  GraduationCap,
  Heart,
  ShieldCheck,
  Atom,
  Users,
  MapPin,
  Sparkles,
  ArrowRight,
  Code2,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'About KindLink | Hyperlocal Mutual Aid in Asansol',
  description:
    'KindLink is an open community mutual aid platform developed at Asansol Engineering College. Learn our mission, engineering ethos, and community commitment.',
  path: '/about',
});

export default function AboutPage() {
  const coreValues = [
    {
      title: 'Deterministic Urgency Ranking Over Engagement Feeds',
      description:
        'Instead of opaque social algorithms engineered to monetize attention or generate ad clicks, KindLink prioritizes community requests using transparent urgency levels, real road distances, and waiting time.',
    },
    {
      title: 'Zero Monetization, Zero Fees, Zero Data Brokerage',
      description:
        'KindLink is 100% free and non-commercial. We collect zero tracking cookies, display no advertisements, and never sell or monetize user information.',
    },
    {
      title: 'Rigorous Privacy via PostGIS Geospatial Truncation',
      description:
        'Your exact home address and contact number are never exposed to the public. Coordinates are geographically fuzzed on the map, and phone numbers are unlocked only after mutual volunteer acceptance.',
    },
    {
      title: 'Grassroots Industrial Belt Focus',
      description:
        'Tailored specifically to the unique social landscape of the Asansol-Durgapur-Raniganj-Dhanbad coalfield and industrial corridor, where long distances and aging populations demand localized responsiveness.',
    },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="about-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'About' }]} />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <GraduationCap className="h-3.5 w-3.5" />
              Academic Capstone Initiative &bull; Asansol Engineering College
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            About KindLink: Grassroots Mutual Aid Powered by Community Trust
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            KindLink was born out of a stark realization on the streets of Asansol: in urgent times, traditional social
            networks fail the people who need help most. When a family member desperately requires a rare blood unit at
            Asansol District Hospital, frantic appeals posted to WhatsApp status updates or Facebook groups are either
            buried by algorithm feeds, forwarded to recipients hundreds of kilometers away, or exploited by fraudulent
            middlemen. KindLink re-engineers local mutual aid from grassroots community principles.
          </p>

          {/* COMMUNITY PLATFORM INITIATIVE */}
          <section className="mt-10 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-teal-600 p-3 text-white shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Community Platform Initiative
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  KindLink was conceptualized and developed as a collaborative initiative in the
                  Department of Computer Science &amp; Engineering at <strong>Asansol Engineering College (AEC)</strong>,
                  affiliated with the Maulana Abul Kalam Azad University of Technology (MAKAUT), West Bengal.
                </p>
                <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Rather than building another generic corporate web application, our engineering team sought to apply
                  modern geospatial routing, cryptographic trust verification, and transparent urgency prioritization
                  to solve pressing human challenges in our local college town and neighboring industrial townships.
                </p>
              </div>
            </div>
          </section>

          {/* MISSION & VISION */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Our Mission for Asansol and the Industrial Belt
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Asansol is the second-largest urban agglomeration in West Bengal, serving as the commercial and medical hub
              for Paschim Bardhaman, Purulia, Bankura, and the border districts of Jharkhand. The region features a unique
              demographic mix of railway colonies, coalfield townships, engineering campuses, and historic residential
              neighborhoods like Kalla, Burnpur, Ushagram, and Railpar.
            </p>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Our mission is to establish a permanent, open-source civic infrastructure where no senior citizen feels
              stranded, no medical emergency suffers from delayed donor matching, and no engineering student is prevented
              from studying due to the high cost of textbooks. We believe technology should build authentic human solidarity
              among real-world neighbors.
            </p>
          </section>

          {/* CORE PRINCIPLES */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Our Core Architectural Principles
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coreValues.map((value, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-bold text-foreground mb-1.5">{value.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* OPEN SOURCE PLEDGE */}
          <section className="mt-12 rounded-2xl border border-border bg-muted/40 p-6">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <Code2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>Open Source &amp; Community Governance</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              The KindLink codebase is transparent and open-source under the MIT License. We welcome contributions from
              students, software engineers, and civic activists. To view our source code, report an issue, or propose
              architectural improvements, explore our GitHub repository.
            </p>
            <div className="mt-4">
              <a
                href="https://github.com/krishkumarcodes/KindLink"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                <span>View KindLink on GitHub</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Experience KindLink in Action</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/how-it-works"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Discover how community matching works &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
