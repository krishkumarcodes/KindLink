import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Mail,
  MapPin,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Send,
  Building,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Contact KindLink | Campus Office & Support in Asansol',
  description:
    'Get in touch with the KindLink development team at Asansol Engineering College. Submit civic feedback, report bugs, or collaborate on open-source mutual aid.',
  path: '/contact',
});

export default function ContactPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Contact', path: '/contact' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="contact-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Contact' }]} />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              <Mail className="h-3.5 w-3.5" />
              Community &amp; Developer Relations
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Contact KindLink: Campus Office &amp; Community Support
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Whether you want to suggest new mutual aid features, partner with us for college blood donation drives in
            Asansol, report a platform bug, or inquire about our applied physics research, we welcome your communication.
          </p>

          {/* EMERGENCY DISCLAIMER */}
          <div className="my-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 flex items-start gap-3.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold mb-0.5">Life-Threatening Emergency Notice:</strong>
              This contact channel is for administrative inquiries and developer feedback only. Do not use this form
              for active, urgent medical emergencies. Dial <strong>102 (Ambulance)</strong> or <strong>112 (National Emergency)</strong> immediately.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* CONTACT DETAILS & CAMPUS ADDRESS */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400 font-bold text-sm mb-3">
                  <Building className="h-4 w-4" />
                  <span>Campus Research Lab &amp; Office</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground">Department of Computer Science &amp; Engineering</p>
                  <p>Asansol Engineering College (AEC)</p>
                  <p>Vivekananda Sarani, Kalla Bypass More</p>
                  <p>Asansol - 713305, Paschim Bardhaman</p>
                  <p>West Bengal, India</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400 font-bold text-sm mb-3">
                  <Mail className="h-4 w-4" />
                  <span>Direct Communication Channels</span>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div>
                    <span className="text-[11px] font-semibold text-foreground block">General Inquiries:</span>
                    <a
                      href="mailto:contact@kindlink.org"
                      className="text-teal-600 dark:text-teal-400 hover:underline font-mono"
                    >
                      contact@kindlink.org
                    </a>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-foreground block">Open Source Repository:</span>
                    <a
                      href="https://github.com/krishkumarcodes/KindLink"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      <span>github.com/krishkumarcodes/KindLink</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-foreground block">Campus Hours:</span>
                    <p>Monday &ndash; Friday: 9:30 AM to 5:00 PM IST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FEEDBACK FORM */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-heading text-base font-bold text-foreground mb-1">
                Send Community Feedback
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                We review all suggestions to improve local response times and privacy tools.
              </p>

              <form
                action="mailto:contact@kindlink.org"
                method="POST"
                encType="text/plain"
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label htmlFor="contact-name" className="block font-semibold text-foreground mb-1">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block font-semibold text-foreground mb-1">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div>
                  <label htmlFor="contact-category" className="block font-semibold text-foreground mb-1">
                    Topic / Category
                  </label>
                  <select
                    id="contact-category"
                    name="category"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="blood-drive">College Blood Donation Drive</option>
                    <option value="bug">Bug Report / Platform Issue</option>
                    <option value="research">Academic / Physics Research Inquiry</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block font-semibold text-foreground mb-1">
                    Your Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    placeholder="Describe your inquiry or feedback..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all active:scale-[0.98]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Message via Email</span>
                </button>
              </form>
            </div>
          </div>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Launch KindLink Live App</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/about"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Read more about Asansol Engineering College roots &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
