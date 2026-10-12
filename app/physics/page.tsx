import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Atom,
  Zap,
  Activity,
  Compass,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Applied Physics Engine in KindLink | Help Gravity, Kinematics & IMU Sensors',
  description:
    'Comprehensive mathematical breakdown of KindLink applied physics: Newton-inspired Help Gravity, Haversine distance, kinematic velocity dispatch, and IMU fall detection.',
  path: '/physics',
});

export default function PhysicsPage() {
  const categoryWeights = [
    { category: 'Blood Donation', weight: 10, rationale: 'Immediate risk to life; time-sensitive clinical emergency' },
    { category: 'Emergency Transport', weight: 9, rationale: 'Accident trauma, delayed ambulances, rapid hospital transit' },
    { category: 'Elderly Assistance', weight: 6, rationale: 'Vulnerable populations, prescription medications, daily sustenance' },
    { category: 'Medical Equipment', weight: 5, rationale: 'Post-op mobility, respiratory recovery, rehabilitation devices' },
    { category: 'Books & Study Material', weight: 2, rationale: 'Academic peer resource sharing, non-emergency semester learning' },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Physics Engine', path: '/physics' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="physics-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Physics' }]} />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Atom className="h-3.5 w-3.5" />
              Applied Mechanics &bull; B.Tech CSE Project
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            The Physics of KindLink: Help Gravity, Kinematics &amp; Inertial Sensors
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Most modern digital platforms prioritize user requests using attention-maximizing engagement algorithms.
            KindLink takes an entirely different architectural path rooted in classical physics. Developed at Asansol
            Engineering College, our dispatch engine models community urgency using Newton&apos;s Law of Universal
            Gravitation, kinematic velocity vectors, and digital signal processing on device accelerometer streams.
          </p>

          {/* Action Callout Box */}
          <div className="my-8 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Test the Live Interactive Physics Simulator</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Adjust sliders for distance, wait time, and sensor calibration in the in-app Physics Laboratory.
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/25 hover:bg-teal-700 transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>Launch Physics Lab in App</span>
            </Link>
          </div>

          {/* FORMULATION 1: HAVERSINE DISTANCE */}
          <section className="mt-10">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
              <Compass className="h-4 w-4" />
              <span>Formulation 1: Great-Circle Spatial Distance</span>
            </div>
            <h2 className="mt-2 font-heading text-xl font-bold text-foreground">
              Haversine Great-Circle Geodesic Calculation
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Because the Earth is an oblate spheroid, simple Euclidean distance ($\Delta x^2 + \Delta y^2$) introduces
              significant distortion across geographic coordinates. KindLink implements the Haversine formulation to
              compute the exact great-circle distance between two latitude and longitude pairs:
            </p>

            <div className="mt-4 rounded-2xl border border-border bg-card p-5 font-mono text-xs sm:text-sm shadow-sm space-y-2">
              <div className="text-teal-600 dark:text-teal-400 font-bold">Mathematical Formulation:</div>
              <div className="text-foreground bg-muted/60 p-3 rounded-xl overflow-x-auto">
                a = sin&sup2;(&Delta;&phi; / 2) + cos(&phi;&sub1;) &middot; cos(&phi;&sub2;) &middot; sin&sup2;(&Delta;&lambda; / 2)<br />
                c = 2 &middot; atan2(&radic;a, &radic;(1 - a))<br />
                d = R &middot; c &emsp; [where Earth mean radius R = 6,371 km]
              </div>
              <div className="text-[11px] font-sans text-muted-foreground pt-1">
                Where &phi; represents latitude in radians and &lambda; represents longitude in radians. This ensures that
                distance between an accident victim at Asansol Hospital and a donor in Burnpur or Kalla is exact to within 10 meters.
              </div>
            </div>
          </section>

          {/* FORMULATION 2: KINEMATICS & ETA */}
          <section className="mt-12">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
              <Clock className="h-4 w-4" />
              <span>Formulation 2: Transit Kinematics &amp; Arrival Estimation</span>
            </div>
            <h2 className="mt-2 font-heading text-xl font-bold text-foreground">
              Uniform Kinematic Velocity Vectors: v = d / t
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              When a community member is considering responding to an aid alert, knowing pure distance in kilometers is
              insufficient. Volunteers need realistic, travel-mode-specific time windows. KindLink applies fundamental
              kinematic velocity relations:
            </p>

            <div className="mt-4 rounded-2xl border border-border bg-card p-5 font-mono text-xs sm:text-sm shadow-sm space-y-2">
              <div className="text-teal-600 dark:text-teal-400 font-bold">Kinematic Velocity &amp; ETA:</div>
              <div className="text-foreground bg-muted/60 p-3 rounded-xl overflow-x-auto">
                t = d / v &emsp; &implies; &emsp; ETA (minutes) = round[(d / v) &times; 60]
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-card p-3.5">
                <span className="text-xs font-bold text-foreground block">Walking Mode</span>
                <span className="text-teal-600 dark:text-teal-400 font-mono text-sm font-bold">v = 5 km/h</span>
                <p className="text-[11px] text-muted-foreground mt-1">Ideal for intra-neighborhood grocery runs and campus book handovers.</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5">
                <span className="text-xs font-bold text-foreground block">Bicycle / Two-Wheeler</span>
                <span className="text-teal-600 dark:text-teal-400 font-mono text-sm font-bold">v = 15 km/h</span>
                <p className="text-[11px] text-muted-foreground mt-1">Fastest navigation through congested alleyways in Railpar and Burnpur Bazar.</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5">
                <span className="text-xs font-bold text-foreground block">Motor Vehicle (Car)</span>
                <span className="text-teal-600 dark:text-teal-400 font-mono text-sm font-bold">v = 30 km/h</span>
                <p className="text-[11px] text-muted-foreground mt-1">Arterial transit along GT Road and national highway corridors.</p>
              </div>
            </div>
          </section>

          {/* FORMULATION 3: HELP GRAVITY */}
          <section className="mt-12">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
              <Zap className="h-4 w-4" />
              <span>Formulation 3: Newtonian Help Gravity Urgency Model</span>
            </div>
            <h2 className="mt-2 font-heading text-xl font-bold text-foreground">
              Urgency as Gravitational Attraction: F &prop; (m &middot; &Delta;t) / r&sup2;
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              In Isaac Newton&apos;s universal law of gravitation, gravitational force is proportional to the product of
              masses and inversely proportional to the square of the distance: F = G &middot; (m&#8321; &middot; m&#8322;) / r&sup2;.
              KindLink translates this physical phenomenon into social mutual aid:
            </p>

            <div className="mt-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5 font-mono text-xs sm:text-sm shadow-sm space-y-2">
              <div className="text-teal-700 dark:text-teal-300 font-bold">The KindLink Help Gravity Formula:</div>
              <div className="text-foreground bg-card p-3.5 rounded-xl border border-border overflow-x-auto">
                Help Gravity Score = [ TypeWeight &times; (1 + 0.05 &times; &Delta;t) ] / [ (1 + Distance)&sup2; ]
              </div>
              <div className="text-[11px] font-sans text-muted-foreground pt-1 space-y-1">
                <p>&bull; <strong>TypeWeight:</strong> The inherent medical and life-critical sensitivity of the need (ranging from 2 to 10).</p>
                <p>&bull; <strong>Time Amplification Factor $(1 + 0.05 \times \Delta t)$:</strong> Urgency grows by 5% linearly for every minute elapsed without a match, preventing older cases from being buried.</p>
                <p>&bull; <strong>Inverse-Square Attenuation $(1 + d)^2$:</strong> Proximity dominates the denominator. The $+1$ offset eliminates numerical division by zero singularity at $d = 0$.</p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Type Weight</th>
                    <th className="p-3">Clinical / Humanitarian Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {categoryWeights.map((row) => (
                    <tr key={row.category}>
                      <td className="p-3 font-semibold text-foreground">{row.category}</td>
                      <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">{row.weight} / 10</td>
                      <td className="p-3">{row.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FORMULATION 4: IMU FALL DETECTION */}
          <section className="mt-12">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <Activity className="h-4 w-4" />
              <span>Formulation 4: Inertial Fall Impact Detection</span>
            </div>
            <h2 className="mt-2 font-heading text-xl font-bold text-foreground">
              Discrete Low-Pass Filtering &amp; Deceleration Thresholds
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              To safeguard elderly citizens living alone in Asansol, KindLink reads real-time 3-axis accelerometer
              signals via the browser&apos;s DeviceMotionEvent API. To suppress jitter from normal walking and hand tremors,
              we process the stream through a first-order discrete low-pass filter:
            </p>

            <div className="mt-4 rounded-2xl border border-border bg-card p-5 font-mono text-xs sm:text-sm shadow-sm space-y-2">
              <div className="text-rose-600 dark:text-rose-400 font-bold">Filter &amp; Vector Magnitude:</div>
              <div className="text-foreground bg-muted/60 p-3 rounded-xl overflow-x-auto">
                a_filtered[t] = &alpha; &middot; a_raw[t] + (1 - &alpha;) &middot; a_filtered[t-1] &emsp; [&alpha; = 0.3]<br />
                Magnitude |a| = &radic;(ax&sup2; + ay&sup2; + az&sup2;)<br />
                Impact Threshold: |a| &gt; 22.0 m/s&sup2; &emsp; [approx. 2.24G Deceleration Shock]
              </div>
              <div className="text-[11px] font-sans text-muted-foreground pt-1">
                When a fall impact exceeds 22 m/s&sup2; and remains static, KindLink initiates a loud 10-second
                countdown allowing the user to cancel false alarms. If unacknowledged, an autonomous emergency beacon is
                transmitted to designated nearby volunteers.
              </div>
            </div>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Launch Live Simulator in KindLink App</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/about"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Learn about our academic capstone research team &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
