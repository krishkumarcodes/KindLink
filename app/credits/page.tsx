import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  MapPin,
  ExternalLink,
  ShieldCheck,
  Heart,
  Sparkles,
  Navigation,
  Layers,
  Globe,
  Award,
  BookOpen,
  Cpu,
  Lock,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Credits & Map Data Attributions | KindLink',
  description:
    'Legal attributions and acknowledgments for MapTiler, Geoapify, OpenRouteService, OpenStreetMap, and open-source geospatial technologies powering KindLink.',
  path: '/credits',
});

interface ProviderCredit {
  id: string;
  name: string;
  badge: string;
  attribution: string;
  license: string;
  url: string;
  description: string;
  usedFor: string[];
}

const MAP_PROVIDERS: ProviderCredit[] = [
  {
    id: 'maptiler',
    name: 'MapTiler',
    badge: 'Basemap Vector & Raster Tiles',
    attribution: '© MapTiler © OpenStreetMap contributors',
    license: 'Custom Commercial / Non-Commercial Community & ODbL',
    url: 'https://www.maptiler.com/copyright/',
    description:
      'Provides high-definition vector cartography, customized light/dark styling (streets-v2, dataviz-dark), and localized tile streaming for KindLink live interactive maps.',
    usedFor: [
      'Interactive community map base layer',
      'High-contrast emergency dark mode styles',
      'Smooth vector zoom and high-DPI retina rendering',
    ],
  },
  {
    id: 'geoapify',
    name: 'Geoapify',
    badge: 'Geocoding & Places Search',
    attribution: 'Powered by Geoapify',
    license: 'Open Database License (ODbL) & Geoapify API Terms',
    url: 'https://www.geoapify.com/',
    description:
      'Powers forward address autocomplete, landmark resolution, reverse geocoding from GPS coordinates, and proximity searches for local hospitals, clinics, and pharmacies.',
    usedFor: [
      'Neighborhood address search and autocomplete',
      'GPS coordinates to readable street names',
      'Emergency healthcare and pharmacy lookup',
    ],
  },
  {
    id: 'ors',
    name: 'OpenRouteService',
    badge: 'Routing & Directions Engine',
    attribution: 'openrouteservice.org | © OpenStreetMap contributors',
    license: 'Apache 2.0 / Open Data Commons ODbL (Heidelberg Institute for Geoinformation Technology - HeiGIT)',
    url: 'https://openrouteservice.org/',
    description:
      'Calculates accurate road network travel times, turn directions, and distance metrics for volunteers walking, cycling, or driving to deliver urgent aid.',
    usedFor: [
      'Multi-modal route calculation (walking, cycling, driving)',
      'Estimated travel durations and distance measurements',
      'Emergency transit polyline geometry',
    ],
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    badge: 'Global Geospatial Base Data',
    attribution: '© OpenStreetMap contributors',
    license: 'Open Database License (ODbL) 1.0',
    url: 'https://www.openstreetmap.org/copyright',
    description:
      'The foundational open spatial database created by millions of global contributors, serving as the geospatial core for MapTiler, OpenRouteService, and our direct fallback tiles.',
    usedFor: [
      'Direct standard tile server fallback',
      'Civic boundary and road network geometry',
      'Public amenity data and road infrastructure',
    ],
  },
  {
    id: 'photon',
    name: 'Photon Geocoder (Komoot)',
    badge: 'Open Geocoding Fallback',
    attribution: 'Based on OpenStreetMap data by Komoot',
    license: 'Apache 2.0 & ODbL',
    url: 'https://photon.komoot.io/',
    description:
      'High-speed Elasticsearch-driven geocoding fallback service based on OpenStreetMap data, ensuring search never goes down even during commercial API outages.',
    usedFor: [
      'Zero-cost address search fallback',
      'Localized Asansol bounding box queries',
    ],
  },
  {
    id: 'osrm',
    name: 'Project OSRM',
    badge: 'Open Routing Fallback',
    attribution: 'Routing powered by OSRM and Project OSRM contributors',
    license: 'BSD 2-Clause License',
    url: 'http://project-osrm.org/',
    description:
      'High-performance open routing engine utilizing contraction hierarchies for fast routing graph calculations across OpenStreetMap road networks.',
    usedFor: [
      'Secondary route computation fallback',
      'Straightforward travel duration estimates',
    ],
  },
  {
    id: 'overpass',
    name: 'Overpass API',
    badge: 'Open Spatial Query Fallback',
    attribution: 'Data courtesy of OpenStreetMap, queried via Overpass API (Roland Olbricht)',
    license: 'ODbL 1.0',
    url: 'https://overpass-turbo.eu/',
    description:
      'Read-only spatial query API querying specific OpenStreetMap nodes and ways for emergency medical resources, blood donation points, and pharmacies.',
    usedFor: [
      'Community health resource queries',
      'Open amenity fallback discovery',
    ],
  },
];

const TECH_CREDITS = [
  {
    name: 'Next.js 14',
    provider: 'Vercel',
    license: 'MIT License',
    url: 'https://nextjs.org/',
    role: 'Full-stack React framework with App Router, Server Components, and Standalone Docker builds.',
  },
  {
    name: 'Supabase & PostGIS',
    provider: 'Supabase Inc.',
    license: 'Apache 2.0 / PostgreSQL License',
    url: 'https://supabase.com/',
    role: 'PostgreSQL database with PostGIS spatial extensions, Row Level Security (RLS), and Realtime WebSocket replication.',
  },
  {
    name: 'Leaflet & React-Leaflet',
    provider: 'Vladimir Agafonkin & Community',
    license: 'BSD 2-Clause License',
    url: 'https://leafletjs.com/',
    role: 'Mobile-friendly, lightweight interactive mapping library rendered on client-side canvases.',
  },
  {
    name: 'Tailwind CSS',
    provider: 'Tailwind Labs',
    license: 'MIT License',
    url: 'https://tailwindcss.com/',
    role: 'Utility-first styling system implementing accessible, responsive WCAG AA compliant interfaces.',
  },
  {
    name: 'Lucide Icons',
    provider: 'Lucide Project',
    license: 'ISC License',
    url: 'https://lucide.dev/',
    role: 'Crisp, lightweight icon set providing clear visual signifiers across mobile and desktop devices.',
  },
];

export default function CreditsPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Credits & Attributions', path: '/credits' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="credits-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Credits & Attributions' }]} />

          {/* Page Badge & Title */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Award className="h-3.5 w-3.5" />
              Open Source &bull; Attribution Transparency
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Credits, Map Data &amp; Legal Attributions
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            KindLink is built upon remarkable open-source software and geospatial community initiatives. We strictly adhere
            to copyright, attribution notices, and open data licensing requirements for all tile providers, geocoders,
            and routing engines.
          </p>

          {/* Privacy & Proxying Safeguard Notice */}
          <div className="mt-8 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5 text-xs sm:text-sm leading-relaxed text-muted-foreground flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground font-semibold block mb-1">
                Privacy-Preserving Server Proxies
              </strong>
              <p>
                To protect user privacy and comply with API terms, address geocoding, route calculations, and place queries
                are mediated through KindLink&apos;s server-side proxies. Approximate coordinates are mathematically rounded
                before being sent upstream, and all personal user identifiers or cookies are stripped prior to contacting external providers.
                For more details, see our{' '}
                <Link href="/privacy" className="text-teal-600 dark:text-teal-400 font-semibold underline underline-offset-2">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>

          {/* SECTION 1: MAP PROVIDERS & GEOSPATIAL ATTRIBUTIONS */}
          <section className="mt-12">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <h2 className="font-heading text-xl font-bold text-foreground">
                1. Map Providers &amp; Geospatial Data Attributions
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              In accordance with terms of service and the Open Database License (ODbL), the following attributions apply
              to all interactive maps, basemap tiles, search queries, and route calculations within KindLink:
            </p>

            <div className="mt-6 space-y-4">
              {MAP_PROVIDERS.map((provider) => (
                <div
                  key={provider.id}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft transition hover:border-teal-500/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                          <span>{provider.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {provider.badge}
                          </span>
                        </h3>
                      </div>
                    </div>

                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline self-start sm:self-auto"
                    >
                      <span>Official Copyright Notice</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Required Legal Attribution Callout */}
                  <div className="mt-3.5 rounded-xl bg-muted/50 border border-border px-3.5 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Required Attribution Text:
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground select-all">
                      {provider.attribution}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {provider.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {provider.usedFor.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] rounded-lg bg-background border border-border px-2.5 py-1 text-muted-foreground"
                      >
                        &bull; {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 text-[11px] text-muted-foreground">
                    <strong>License:</strong> {provider.license}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 2: ACADEMIC & RESEARCH ATTRIBUTION */}
          <section className="mt-12">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <h2 className="font-heading text-xl font-bold text-foreground">
                2. Academic Research Capstone Initiative
              </h2>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-3">
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                KindLink was designed, prototyped, and engineered as an undergraduate Capstone Project in the Department
                of <strong>Computer Science &amp; Engineering</strong> at <strong>Asansol Engineering College (AEC)</strong>,
                affiliated with <strong>Maulana Abul Kalam Azad University of Technology (MAKAUT)</strong>, West Bengal, India.
              </p>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                The platform is dedicated as a 100% free, non-commercial community public utility to improve emergency
                response times, blood donation donor availability, and neighborhood mutual aid across Asansol, Durgapur,
                and surrounding municipal areas.
              </p>
            </div>
          </section>

          {/* SECTION 3: OPEN SOURCE SOFTWARE LIBRARIES */}
          <section className="mt-12">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <h2 className="font-heading text-xl font-bold text-foreground">
                3. Open Source Software Technologies
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
              We express sincere gratitude to the authors and maintainers of the foundational open-source packages that
              enable KindLink&apos;s rapid performance and offline-resilient architecture:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {TECH_CREDITS.map((tech) => (
                <div
                  key={tech.name}
                  className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-foreground">{tech.name}</strong>
                    <a
                      href={tech.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {tech.role}
                  </p>
                  <div className="text-[10px] text-muted-foreground/80 font-medium">
                    {tech.provider} &bull; {tech.license}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* BOTTOM NAVIGATION CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <Lock className="h-4 w-4" />
              <span>Review Privacy &amp; Data Obfuscation</span>
            </Link>

            <Link
              href="/terms"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Read Community Terms of Service &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
