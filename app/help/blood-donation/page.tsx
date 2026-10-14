import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Droplet,
  ShieldAlert,
  Heart,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Sparkles,
  ArrowRight,
  FileText,
  UserCheck,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Emergency Blood Donation in Asansol | Donor Eligibility & Hospital Protocol',
  description:
    'Complete guide to emergency blood donation in Asansol. Learn donor eligibility, universal matching rules, blood bank protocols at Asansol District Hospital, and request verified donors.',
  path: '/help/blood-donation',
});

export default function BloodDonationPage() {
  const eligibilityCriteria = [
    { label: 'Age Range', requirement: '18 to 65 years old with valid government or college photo ID' },
    { label: 'Minimum Weight', requirement: 'At least 45 kg (whole blood donation limit in India)' },
    { label: 'Hemoglobin Level', requirement: 'Minimum 12.5 g/dL (tested on-site prior to collection)' },
    { label: 'Donation Interval', requirement: 'Minimum 90 days (3 months) for men; 120 days for women' },
    { label: 'Health Status', requirement: 'Free from active infection, recent dental surgery (72h), or fever' },
    { label: 'Lifestyle Safeguards', requirement: 'No alcohol consumption in last 24 hours; well-hydrated and nourished' },
  ];

  const hospitalProtocols = [
    {
      name: 'Asansol District Hospital Blood Bank',
      location: 'Kalla / Hospital Road, Asansol',
      notes: 'Government blood bank with 24/7 cross-matching. Requires official doctor requisition slip with hospital seal.',
    },
    {
      name: 'Burnpur Steel Plant (SAIL) Hospital',
      location: 'Burnpur, Asansol',
      notes: 'Dedicated transfusion wing. Priority given to industrial workers, dependents, and acute emergency trauma cases.',
    },
    {
      name: 'Sub-Divisional & Durgapur Referral Centers',
      location: 'Asansol-Durgapur GT Road Corridor',
      notes: 'Equipped for apheresis (single donor platelets) and specialized component separation.',
    },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Help Categories', path: '/#categories' },
    { name: 'Blood Donation', path: '/help/blood-donation' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="blood-donation-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: 'Help Categories', href: '/#categories' },
              { label: 'Blood Donation' },
            ]}
          />

          {/* Page Badge & Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              <Droplet className="h-3.5 w-3.5 fill-rose-500" />
              Usually Critical &bull; Life-Saving Urgency
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Emergency Blood Donation in Asansol: Donor Eligibility, Urgent Matching &amp; Hospital Protocol
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            In medical emergencies such as road accidents along Grand Trunk (GT) Road, postpartum hemorrhages at
            local maternity wards, or emergency dialysis transfusions, every 15 minutes of delay elevates clinical risk.
            KindLink provides a direct, verified link between patients in Asansol medical facilities and willing donors
            living just kilometers away — with zero broker fees and complete privacy.
          </p>

          {/* Action Callout Box */}
          <div className="my-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Need Urgent Blood or Want to Register as a Donor?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Post an urgent blood request or set your availability in the interactive KindLink app.
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open KindLink App</span>
            </Link>
          </div>

          {/* SECTION 1: DONOR ELIGIBILITY */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Blood Donor Eligibility Guidelines in India
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Voluntary blood donation in West Bengal follows strict standards governed by the National Blood Transfusion
              Council (NBTC) and Central Drugs Standard Control Organisation (CDSCO). Before volunteering for an urgent
              KindLink request, ensure you satisfy these medical criteria:
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {eligibilityCriteria.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs mb-1">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.requirement}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 2: URGENT COMPATIBILITY MATRIX */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Blood Group Matching &amp; Emergency Compatibility
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              When a doctor issues an emergency requisition, understanding ABO and Rh compatibility ensures the right
              donor responds immediately:
            </p>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-3">Recipient Group</th>
                    <th className="p-3">Compatible Red Blood Cell Donors</th>
                    <th className="p-3">Urgency Factor in KindLink</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="p-3 font-semibold text-foreground">O Negative (O-)</td>
                    <td className="p-3">O- only (Universal Donor for others, but can only receive O-)</td>
                    <td className="p-3 text-rose-600 dark:text-rose-400 font-bold">Highest Priority &bull; Critical</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground">O Positive (O+)</td>
                    <td className="p-3">O+, O-</td>
                    <td className="p-3">High Priority (High Demand in Asansol)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground">A Negative / B Negative</td>
                    <td className="p-3">A-/O- (for A-); B-/O- (for B-)</td>
                    <td className="p-3 text-rose-600 dark:text-rose-400 font-bold">Critical (Rare in local bank stocks)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground">AB Positive (AB+)</td>
                    <td className="p-3">Universal Recipient (Can receive all blood groups)</td>
                    <td className="p-3">Flexible matching across multiple local donors</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 3: STEP-BY-STEP HOSPITAL PROTOCOL */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Step-by-Step Hospital Protocol in Asansol
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Donating blood through KindLink is never done informally in private rooms. All donations take place at
              licensed hospital blood banks or certified transfusion units following this verified sequence:
            </p>

            <ol className="mt-5 space-y-4">
              <li className="flex gap-4 rounded-xl border border-border bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Doctor&apos;s Official Requisition Slip</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    The attending physician at Asansol Hospital, Burnpur Hospital, or private nursing home writes an
                    official blood requisition slip indicating patient name, bed number, required units, and blood group.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-xl border border-border bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">KindLink Urgent Broadcast &amp; Proximity Match</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    The patient&apos;s attendant posts a request. KindLink&apos;s urgency dispatch algorithm highlights the critical need to
                    verified donors within 5 km of the hospital. When a volunteer accepts, both parties confirm to reveal
                    phone contact and arrival time.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-xl border border-border bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Blood Bank Cross-Matching &amp; Screening</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    The donor meets the attendant directly at the hospital blood bank. The hospital medical staff
                    conducts medical screening, hemoglobin testing, mandatory infectious disease screening (HIV, HBV,
                    HCV, Malaria, Syphilis), and cross-matching before collection.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-xl border border-border bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Transfusion &amp; Mutual Trust Endorsement</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    The blood bank issues the tested unit or replacement slip. In KindLink, both requester and donor
                    mark the request resolved, boosting the volunteer&apos;s verified community trust score.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          {/* SECTION 4: LOCAL BLOOD BANKS IN ASANSOL */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Major Blood Transfusion Centers in Asansol
            </h2>
            <div className="mt-4 space-y-3">
              {hospitalProtocols.map((hosp, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                    <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span>{hosp.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-teal-600 dark:text-teal-400 font-medium">
                    {hosp.location}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {hosp.notes}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SAFETY CHECKLIST */}
          <section className="mt-12 rounded-2xl border border-border bg-muted/40 p-6">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <ShieldAlert className="h-4 w-4" />
              <span>Donor &amp; Recipient Safety Checklist</span>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground leading-relaxed">
              <li>&bull; <strong>Never pay or demand money:</strong> Voluntary blood donation in India is strictly non-remunerated under the National Blood Policy. Any financial demand must be reported immediately.</li>
              <li>&bull; <strong>Always donate inside registered facilities:</strong> Never permit blood collection in private residences or unverified mobile vans.</li>
              <li>&bull; <strong>Post-donation recovery:</strong> Rest for 15 minutes, drink fruit juice or water provided by the hospital, and avoid heavy lifting for 6 hours.</li>
            </ul>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Launch KindLink &amp; View Live Blood Requests</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/how-it-works"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Learn how community dispatch prioritizes blood requests &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
