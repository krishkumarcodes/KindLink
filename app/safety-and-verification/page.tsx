import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  UserCheck,
  AlertTriangle,
  FileCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  MapPin,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Safety, Trust & Verification | Multi-Tier Protection - KindLink',
  description:
    'KindLink security and safety architecture: PostGIS coordinate fuzzing, multi-tier identity checks, encrypted document review, and zero public personal data guarantee.',
  path: '/safety-and-verification',
});

export default function SafetyAndVerificationPage() {
  const verificationTiers = [
    {
      level: 'Tier 1',
      title: 'Phone OTP Verification',
      scope: 'Basic community membership & viewing requests',
      detail:
        'All users verify their mobile phone number via SMS OTP. This prevents automated bots, burner accounts, and mass spamming across the network.',
    },
    {
      level: 'Tier 2',
      title: 'Government or Student ID Validation',
      scope: 'Active response to emergency blood, transport & elder care',
      detail:
        'Volunteers submit an official identification card (Aadhaar, Voter ID, or institutional photo ID). Documents are encrypted at rest in private storage buckets and inspected by designated platform administrators.',
    },
    {
      level: 'Tier 3',
      title: 'Peer Mutual Aid Trust Score',
      scope: 'Verified neighborhood champion badge',
      detail:
        'After completing requests (e.g., successful blood donation or on-time equipment return), both parties submit authenticated reviews. Higher trust scores prioritize volunteers for critical alerts.',
    },
  ];

  const safetyRules = [
    {
      title: 'Conduct Handoffs in Well-Lit, Public Locations',
      desc: 'For non-emergency items like study materials and medical devices, meet at prominent landmarks such as Asansol Station Plaza, City Center, or hospital reception desks.',
    },
    {
      title: 'Zero Financial Transactions or Demands',
      desc: 'KindLink is 100% non-commercial mutual aid. If any party demands money, deposits, or "fuel delivery charges", report the account immediately for permanent suspension.',
    },
    {
      title: 'Never Share Financial Passwords or ATM Cards',
      desc: 'When assisting senior citizens, volunteers must NEVER handle bank passbooks, debit cards, or OTP codes. Requesters must provide exact cash upon grocery receipt presentation.',
    },
    {
      title: 'Immediate Escalation to National Emergency Numbers',
      desc: 'KindLink is a peer network and never replaces municipal police (112), fire (101), or state ambulance (102) infrastructure. In acute violent trauma or structural collapse, contact emergency services first.',
    },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Safety & Verification', path: '/safety-and-verification' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="safety-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Safety & Verification' }]} />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Community Trust &amp; Privacy Architecture
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Safety, Trust &amp; Verification: Multi-Tier Community Protection
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            True mutual aid cannot flourish without uncompromising safety standards. When you are asking for emergency
            help or volunteering your time to assist a neighbor in Asansol, you deserve to know that the people on the
            other side are real, verified, and held accountable. KindLink enforces strict privacy safeguards and
            multi-tier identity checks to keep our community safe.
          </p>

          {/* PRIVACY HIGHLIGHT BOX */}
          <div className="my-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-emerald-600 p-3 text-white shrink-0">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-foreground">
                  Our Zero Public Sensitive Data Guarantee
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Unlike traditional social media channels where users post full phone numbers and house addresses in
                  public groups, <strong>KindLink never exposes personal contact details or precise coordinates to the general public</strong>.
                </p>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span><strong>PostGIS Spatial Truncation:</strong> Public maps display only approximate 150m fuzzed radius circles.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span><strong>Conditional Contact Reveal:</strong> Phone numbers and exact directions unlock ONLY when both parties explicitly accept the match.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* VERIFICATION TIERS */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Multi-Tier Identity Verification Framework
            </h2>
            <div className="mt-5 space-y-4">
              {verificationTiers.map((tier) => (
                <div key={tier.level} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono">
                      {tier.level}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {tier.scope}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-foreground">{tier.title}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {tier.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SAFETY GUIDELINES */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Essential Physical Safety Guidelines
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {safetyRules.map((rule, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-xs font-bold text-foreground mb-1.5">{rule.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rule.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* REPORTING & MODERATION */}
          <section className="mt-12 rounded-2xl border border-border bg-muted/40 p-6">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Zero-Tolerance Policy &amp; Platform Moderation</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              KindLink maintains zero tolerance for commercial spam, harassment, hate speech, false distress alarms,
              or extortion. Platform administrators investigate user reports within 24 hours. Accounts found in violation
              face immediate, irreversible device and phone bans across the network.
            </p>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Join Verified Network in App</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/faq"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Browse frequently asked questions &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
