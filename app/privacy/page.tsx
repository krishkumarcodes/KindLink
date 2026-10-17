import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Lock,
  ShieldCheck,
  EyeOff,
  Server,
  Trash2,
  FileText,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Privacy Policy | Transparent Data Practices & Geofence Obfuscation - KindLink',
  description:
    'Read the KindLink privacy policy. Learn how PostGIS coordinate truncation, zero tracking cookies, and conditional contact release safeguard your personal information.',
  path: '/privacy',
});

export default function PrivacyPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Privacy Policy', path: '/privacy' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="privacy-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Privacy Policy' }]} />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Lock className="h-3.5 w-3.5" />
              Privacy by Design &bull; Zero Commercial Tracking
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy: Transparent Data Practices &amp; PostGIS Obfuscation
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            KindLink was founded on the ethical principle that seeking mutual aid or volunteering in your neighborhood
            should never force you to sacrifice your personal privacy. This policy clearly outlines what data we collect,
            how we mathematically obfuscate geographic coordinates, and your total control over your digital identity.
          </p>

          {/* SECTION 1: DATA WE COLLECT */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              1. Information We Collect and Why
            </h2>
            <div className="mt-4 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>
                We adhere to strict data minimization principles. We only collect the bare minimum information necessary
                to safely connect requesters with volunteers:
              </p>
              <ul className="space-y-2 pl-4 list-disc">
                <li>
                  <strong>Account Identification:</strong> A chosen display name, username, and verified mobile number
                  or email address used exclusively for SMS/email authentication and fraud prevention.
                </li>
                <li>
                  <strong>Approximate Location:</strong> Generalized neighborhood coordinates (e.g., Kalla, Burnpur,
                  Ushagram) used to calculate road distances and community urgency sorting.
                </li>
                <li>
                  <strong>Verification Documents:</strong> Uploaded student or government photo IDs submitted by volunteers
                  seeking verified status. These documents are stored in encrypted private buckets inaccessible to public users.
                </li>
              </ul>
            </div>
          </section>

          {/* SECTION 2: POSTGIS COORDINATE TRUNCATION */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              2. PostGIS Coordinate Fuzzing &amp; Map Obfuscation
            </h2>
            <div className="mt-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              <p className="text-foreground font-semibold mb-2">
                Your exact residence or hospital room number is never broadcast on public map feeds.
              </p>
              <p>
                When a request is published, our PostgreSQL spatial engine applies PostGIS coordinate jitter, shifting
                the marker by a pseudo-random offset (100 to 250 meters) and displaying only a generalized circle tile.
                Only after a mutual match agreement is finalized between requester and volunteer are exact meeting details
                privately revealed.
              </p>
            </div>
          </section>

          {/* SECTION 3: CONDITIONAL CONTACT REVEAL */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              3. Strict Two-Way Conditional Contact Reveal
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Unlike public classified websites or WhatsApp groups where anyone can scrape phone numbers, KindLink
              implements a cryptographic two-way handshake. When a volunteer clicks &quot;Offer Help&quot;, neither party can view
              the other&apos;s phone number until the requester reviews the volunteer&apos;s verification badge and explicitly
              confirms the match.
            </p>
          </section>

          {/* SECTION 4: ZERO COOKIES & TRACKING */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              4. Zero Advertising Trackers &amp; Transparent Cookie List
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-bold text-foreground mb-1">No Behavioral Profiling</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We run zero Google Ads, Meta Pixel, or third-party behavioral trackers. We do not monetize your data
                  or sell contact lists to marketing agencies.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-bold text-foreground mb-1">Functional Session Cookies Only</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The only cookies stored in your browser are secure HTTP-only authentication tokens and your UI
                  preferences (language and theme).
                </p>
              </div>
            </div>

            {/* First-Visit IP Country Detection & Attribution Notice */}
            <div className="mt-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5 text-xs sm:text-sm leading-relaxed text-muted-foreground space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <strong className="text-foreground font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>First-Visit Language Preference &amp; Privacy Safeguard</span>
                </strong>
                <a
                  href="https://ipinfo.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  IP address data powered by IPinfo
                </a>
              </div>
              <p>
                On your first visit, we check your IP address once through IPinfo to estimate your country and pick a
                starting language. We do not store, log, or track your IP address. We only save your chosen language in a
                functional cookie so your preference stays remembered.
              </p>
              <p className="text-[11px] text-muted-foreground pt-1">
                Attribution: <a href="https://ipinfo.io" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 underline font-medium">IP address data powered by IPinfo</a>.
                Once your language preference is established, IP lookups are never performed again for your session.
              </p>
            </div>

            {/* Explicit Cookie List */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                KindLink Cookie &amp; Storage Inventory
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-muted-foreground">
                  <thead>
                    <tr className="border-b border-border text-foreground font-semibold">
                      <th className="pb-2 pr-3">Cookie / Key</th>
                      <th className="pb-2 pr-3">Purpose</th>
                      <th className="pb-2 pr-3">Category</th>
                      <th className="pb-2">Lifespan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-[11px]">
                    <tr>
                      <td className="py-2.5 pr-3 font-mono font-bold text-foreground">kindlink_lang</td>
                      <td className="py-2.5 pr-3">Remembers your chosen language code</td>
                      <td className="py-2.5 pr-3">Functional</td>
                      <td className="py-2.5">1 year</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-mono font-bold text-foreground">kindlink_lang_source</td>
                      <td className="py-2.5 pr-3">Remembers if language was auto-detected or chosen by you</td>
                      <td className="py-2.5 pr-3">Functional</td>
                      <td className="py-2.5">1 year</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-mono font-bold text-foreground">kindlink_locale</td>
                      <td className="py-2.5 pr-3">Synchronizes selected language locale between server and client</td>
                      <td className="py-2.5 pr-3">Functional</td>
                      <td className="py-2.5">1 year</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-mono font-bold text-foreground">googtrans</td>
                      <td className="py-2.5 pr-3">Stores Google Translate engine target language selection</td>
                      <td className="py-2.5 pr-3">Functional</td>
                      <td className="py-2.5">1 year</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-mono font-bold text-foreground">sb-*-auth-token</td>
                      <td className="py-2.5 pr-3">Encrypted HTTP-only authentication session tokens</td>
                      <td className="py-2.5 pr-3">Essential / Security</td>
                      <td className="py-2.5">Session / 30 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 5: ROW LEVEL SECURITY & USER RIGHTS */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              5. Row Level Security &amp; Your Right to Erasure
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Our PostgreSQL database enforces PostgreSQL Row Level Security (RLS) policies at the kernel level.
              Users can only modify or delete their own data records. You retain the absolute right to delete your account
              at any time. Upon receiving an account deletion request, all personal profiles and associated verification
              files are permanently purged from our servers within 48 hours.
            </p>
          </section>

          {/* SECTION 6: MAP PROXIES & GEOLOCATION PRIVACY */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              6. Server-Side Map Proxies &amp; Anonymized Geospatial Routing
            </h2>
            <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-xs sm:text-sm leading-relaxed text-muted-foreground space-y-3">
              <p>
                When searching for neighborhood addresses, calculating walking/cycling routes, or locating nearby
                emergency facilities (hospitals, blood banks, pharmacies), your device <strong>never connects directly
                to third-party commercial mapping endpoints</strong>.
              </p>
              <ul className="space-y-2 pl-4 list-disc">
                <li>
                  <strong>Server-Mediated Proxies:</strong> All geospatial queries pass through KindLink&apos;s hardened
                  backend proxies (<code className="font-mono text-teal-600 dark:text-teal-400">/api/maps/*</code>). Map
                  providers (MapTiler, Geoapify, OpenRouteService) only see KindLink&apos;s server IP address—never your
                  client IP address or device telemetry.
                </li>
                <li>
                  <strong>Mathematical Coordinate Rounding:</strong> Coordinates transmitted for route geometry or distance
                  calculations are truncated to approximate decimal degrees, preventing external services from discerning
                  building-level or exact room positions.
                </li>
                <li>
                  <strong>Zero Personal Identification:</strong> Queries dispatched to upstream map services are strictly
                  anonymized. User profile records, phone numbers, auth tokens, session cookies, and usernames are completely
                  stripped prior to proxy relay.
                </li>
                <li>
                  <strong>Aggressive Server Caching:</strong> Frequently computed routes and static address geocodes are
                  cached in-memory, eliminating redundant transmissions to external servers.
                </li>
              </ul>
              <p className="pt-1 text-[11px] text-muted-foreground">
                For detailed attribution of third-party geospatial datasets and providers, visit our{' '}
                <Link href="/credits" className="text-teal-600 dark:text-teal-400 font-semibold underline underline-offset-2">
                  Credits &amp; Map Data Attributions
                </Link>{' '}
                page.
              </p>
            </div>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/safety-and-verification"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Explore Safety &amp; Verification</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/terms"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Read our community terms of service &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
