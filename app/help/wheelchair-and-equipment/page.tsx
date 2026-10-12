import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Stethoscope,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkle,
  Clock,
  Heart,
  HelpCircle,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Medical Equipment Sharing in Asansol | Wheelchairs, Oxygen & Nebulizers',
  description:
    'Borrow or lend wheelchairs, oxygen concentrators, nebulizers, and walkers in Asansol. Free, verified community medical equipment pool with hygiene and return protocols.',
  path: '/help/wheelchair-and-equipment',
});

export default function WheelchairAndEquipmentPage() {
  const equipmentTypes = [
    {
      name: 'Standard & Folding Wheelchairs',
      useCase: 'Post-surgical recovery, severe leg/pelvic fractures, temporary senior mobility needs.',
      notes: 'Check tire tread, handbrake levers, and footrest latches before transfer.',
    },
    {
      name: 'Oxygen Concentrators (5L / 10L)',
      useCase: 'Respiratory distress, COPD maintenance, recovery from acute pulmonary episodes.',
      notes: 'Requires clean distilled water in humidifier bottle and sanitized intake particulate filter.',
    },
    {
      name: 'Pediatric & Adult Nebulizers',
      useCase: 'Asthma exacerbations, acute bronchitis, pediatric respiratory medication misting.',
      notes: 'Medicine cup, mask, and connecting tubing MUST be personal/new or sterilized via boiled water.',
    },
    {
      name: 'Adjustable Walkers & Underarm Crutches',
      useCase: 'Orthopedic rehabilitation, post-fracture weight-bearing gait retraining.',
      notes: 'Inspect rubber tip grip ferrules to prevent slipping on smooth tiled surfaces.',
    },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Help Categories', path: '/#categories' },
    { name: 'Medical Equipment & Wheelchairs', path: '/help/wheelchair-and-equipment' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="wheelchair-equipment-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Help Categories', href: '/#categories' },
              { label: 'Medical Equipment & Wheelchairs' },
            ]}
          />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-400">
              <Stethoscope className="h-3.5 w-3.5" />
              Category Weight 5/10 &bull; Community Resource Pool
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Medical Equipment Sharing: Wheelchairs, Oxygen Concentrators &amp; Nebulizers in Asansol
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            A temporary health crisis often creates unexpected expenses. Following an orthopedic surgery, stroke, or
            severe fracture, a family might need a wheelchair for just 4 weeks. Buying a new chair costs upwards of
            ₹6,000 to ₹12,000, while medical rental stores in the Asansol-Durgapur belt often demand steep security
            deposits and cumbersome paperwork. KindLink enables neighbors to share idle medical equipment safely,
            creating a hyper-local lending library that saves lives and relieves financial strain.
          </p>

          {/* Action Callout Box */}
          <div className="my-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Have Unused Equipment or Need Immediate Support?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                List your spare wheelchair or request equipment within minutes on the KindLink interactive platform.
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-600/25 hover:bg-cyan-700 transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open KindLink App</span>
            </Link>
          </div>

          {/* COMMONLY SHARED EQUIPMENT */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Equipment Categories Supported by the Network
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {equipmentTypes.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    <strong>Primary Clinical Use:</strong> {item.useCase}
                  </p>
                  <p className="mt-2 text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                    &bull; Inspection Focus: {item.notes}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* HYGIENE & SANITIZATION PROTOCOL */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Hygiene &amp; Sanitization Protocols
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Medical equipment transfers must maintain rigorous hygiene standards to prevent cross-contamination.
              All lenders and borrowers in KindLink agree to the following disinfection guidelines:
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400 shrink-0">
                  <Sparkle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Pre-Handover Alcohol Wipe Down</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    All non-porous contact surfaces — handles, armrests, wheel rims, and footrests — must be wiped
                    thoroughly with 70% isopropyl alcohol or hospital-grade disinfectant wipes and allowed to dry completely.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400 shrink-0">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Personal Consumables Separation</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Tubing, nasal cannulas, and nebulizer masks are personal disposable items. Borrowers must use their
                    own new accessories (readily available at local chemists for under ₹60) rather than reusing previous patient tubing.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Pre-Return Cleaning &amp; Verification</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Before returning borrowed gear, borrowers wipe all surfaces once again. Upon return, the original owner
                    confirms condition in the app, which logs an endorsement to the borrower&apos;s mutual aid profile.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* COMMUNITY LENDING ETIQUETTE */}
          <section className="mt-12 rounded-2xl border border-border bg-muted/40 p-6">
            <h2 className="font-heading text-lg font-bold text-foreground">
              KindLink Community Lending Principles
            </h2>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground leading-relaxed">
              <li>&bull; <strong>100% Free of Charge:</strong> No security deposits, rental fees, or commercial charges are allowed. KindLink is strictly mutual aid.</li>
              <li>&bull; <strong>Agreed Loan Duration:</strong> Borrowers and lenders establish an estimated return window (e.g., 3 weeks). If recovery extends beyond this, coordinate in advance.</li>
              <li>&bull; <strong>Prompt Notification of Wear:</strong> If a mechanical defect (such as a loose screw or punctured tire) occurs during use, notify the lender immediately so repairs can be arranged.</li>
              <li>&bull; <strong>Privacy Preserving Handoff:</strong> Exact apartment numbers are never visible publicly on map markers. Handoff locations are finalized privately once matched.</li>
            </ul>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Explore Equipment Requests on Map</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/safety-and-verification"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              How we verify volunteers and borrowers &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
