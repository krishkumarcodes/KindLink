import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Car,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  Compass,
  MapPin,
  CheckCircle2,
  FileText,
  Zap,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Community Emergency Transport in Asansol | Localized Transit Aid',
  description:
    'Rapid peer transport assistance in Asansol. Bridging ambulance delays with Good Samaritan-protected community rides for urgent hospital visits and trauma transit.',
  path: '/help/emergency-transport',
});

export default function EmergencyTransportPage() {
  const safetyProtocols = [
    {
      title: 'Good Samaritan Legal Immunity in India',
      description:
        'Under Section 134A of the Motor Vehicles (Amendment) Act, 2019 and Supreme Court directives, any citizen who voluntarily transports an injured person to a hospital is protected from civil or criminal liability and cannot be forced to disclose identity or testify.',
    },
    {
      title: 'Real-Time Kinematic Arrival Times',
      description:
        'KindLink computes estimated arrival time based on vehicle kinematics: walking (5 km/h), two-wheelers (15 km/h through narrow alleyways), and four-wheelers (30 km/h along main bypass roads).',
    },
    {
      title: 'Direct Routing to Emergency Rooms',
      description:
        'Transport volunteers coordinate directly to navigate to designated trauma reception gates at Asansol District Hospital, Kalla ECL Hospital, or Burnpur Hospital.',
    },
    {
      title: 'Dual Emergency Contact Broadcast',
      description:
        'When an emergency transit ride is confirmed, both requester and volunteer emergency contacts can be alerted with real-time status updates.',
    },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Help Categories', path: '/#categories' },
    { name: 'Emergency Transport', path: '/help/emergency-transport' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="emergency-transport-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Help Categories', href: '/#categories' },
              { label: 'Emergency Transport' },
            ]}
          />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Car className="h-3.5 w-3.5" />
              Category Weight 9/10 &bull; Critical Urgency
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Community Emergency Transport: Localized Ride Support &amp; Critical Transit Aid
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            In dense industrial townships and bustling commercial arteries like Asansol, Burnpur, and Raniganj, calling
            a government or private ambulance during peak hours often results in agonizing 30 to 45-minute wait times.
            Heavy traffic along GT Road, narrow railway underpasses, and vehicle shortages can turn manageable medical
            episodes into life-threatening emergencies. KindLink activates nearby verified car and motorcycle owners to
            provide rapid Samaritan transport when official ambulances are stalled.
          </p>

          {/* Action Callout Box */}
          <div className="my-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Need Urgent Transit Assistance or Have a Vehicle?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Trigger a transit request or register your two-wheeler/four-wheeler for emergency community response.
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/25 hover:bg-amber-700 transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open KindLink App</span>
            </Link>
          </div>

          {/* GOOD SAMARITAN LAW & PROTOCOLS */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Good Samaritan Safeguards &amp; Operational Protocols
            </h2>
            <div className="mt-5 space-y-4">
              {safetyProtocols.map((protocol, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{protocol.title}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {protocol.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* TRANSIT SCENARIOS */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              When Community Transit Steps In
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-bold text-foreground">Sudden Medical Clinic Transfer</h3>
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  Transferring an elder from home to a local diagnostic center or emergency ward for non-bedridden care.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-bold text-foreground">Blood Donor Dispatch</h3>
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  Giving an urgent blood donor a quick ride to Asansol Hospital blood bank when they lack transportation.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-bold text-foreground">Late Night Pharmacy Runs</h3>
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  Transporting a family member to the nearest 24-hour pharmacy during midnight emergencies.
                </p>
              </div>
            </div>
          </section>

          {/* KINEMATICS & PHYSICS INTEGRATION */}
          <section className="mt-12 rounded-2xl border border-teal-500/30 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
              <Zap className="h-4 w-4" />
              <span>Applied Kinematics in KindLink Dispatch</span>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              When you post an Emergency Transport request, KindLink immediately evaluates great-circle distance
              using the Haversine equation and computes estimated transit time via kinematic velocity:
            </p>
            <div className="mt-3 rounded-xl bg-muted/60 p-3 font-mono text-xs text-foreground">
              t = d / v &emsp; &bull; &emsp; Walking: 5 km/h &emsp; &bull; &emsp; Two-Wheeler: 15 km/h &emsp; &bull; &emsp; Car: 30 km/h
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              In congested neighborhood alleys around Railpar or Burnpur Bazar, a two-wheeler volunteer 1.5 km away often
              arrives significantly faster than an ambulance stuck in GT Road traffic, delivering life-saving responsiveness.
            </p>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Launch KindLink Live Dispatch</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/physics"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              See the full kinematics &amp; distance formulas &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
