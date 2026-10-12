import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Library,
  BookmarkCheck,
  Clock,
  MapPin,
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Books & Engineering Study Materials Exchange in Asansol | AEC Peer Book Bank',
  description:
    'Free academic textbook sharing for Asansol Engineering College (MAKAUT) students, WBCHSE, and CBSE pupils. Exchange engineering books, GATE notes, and semester papers.',
  path: '/help/books-and-study-material',
});

export default function BooksAndStudyMaterialPage() {
  const academicDisciplines = [
    {
      discipline: 'B.Tech CSE & IT (MAKAUT Syllabus)',
      subjects: 'Data Structures (Tanenbaum), Operating Systems (Galvin), DBMS (Korth), Computer Networks (Forouzan), Automata (Hopcroft).',
      target: '1st through 8th Semester Asansol Engineering College undergraduates.',
    },
    {
      discipline: 'Core Engineering (ECE, EE, ME, CE)',
      subjects: 'Signals & Systems (Oppenheim), Electric Circuits (Hayt), Thermodynamics (Cengel), Engineering Mechanics (Meriam).',
      target: 'Students requiring heavy standard reference books for semester mid-terms.',
    },
    {
      discipline: 'GATE & Competitive Exam Preparation',
      subjects: 'Ace Academy Postal Material, Made Easy Handbooks, Previous 20 Years Solved Question Papers.',
      target: 'Final year students and graduates preparing for national entrance exams.',
    },
    {
      discipline: 'Higher Secondary & High School (WB / CBSE / ICSE)',
      subjects: 'NCERT Physics, Chemistry, Mathematics (Class 11 & 12), Chhaya Prakashani Bengali / English references.',
      target: 'School students in Asansol preparing for Board exams and WBJEE.',
    },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Help Categories', path: '/#categories' },
    { name: 'Books & Study Material', path: '/help/books-and-study-material' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd data={breadcrumbSchema} id="books-study-structured-data" />
      <PublicHeader />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Help Categories', href: '/#categories' },
              { label: 'Books & Study Material' },
            ]}
          />

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-3.5 w-3.5" />
              Category Weight 2/10 &bull; Peer Academic Lending
            </span>
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Books &amp; Engineering Study Materials Exchange: AEC &amp; College Peer Book Bank
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Academic textbooks are notoriously expensive. A single semester in the B.Tech curriculum under Maulana Abul
            Kalam Azad University of Technology (MAKAUT) requires 5 to 6 reference books, costing upwards of ₹3,000 to
            ₹5,000 per term. Once exams conclude, these thick volumes often sit dormant on hostel shelves while junior
            batches struggle to afford them. KindLink creates a circular, peer-to-peer campus book bank in Asansol,
            democratizing education and fostering cross-batch mentorship.
          </p>

          {/* Action Callout Box */}
          <div className="my-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Have Textbooks to Pass On or Need Semester Notes?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Share your finished semester textbooks or request copies from senior students nearby.
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open KindLink App</span>
            </Link>
          </div>

          {/* ACADEMIC CURRICULA SUPPORTED */}
          <section className="mt-10">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Syllabus Categories in the Asansol Peer Network
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {academicDisciplines.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span>{item.discipline}</span>
                  </div>
                  <p className="mt-2 text-xs text-foreground font-medium">
                    {item.subjects}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <strong>Primary Audience:</strong> {item.target}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* BOOK-CARE ETIQUETTE & LOAN CYCLES */}
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Peer Book-Care Guidelines &amp; Lending Durations
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              To keep shared books in reusable condition for successive student batches, KindLink members follow these
              civic norms:
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400 shrink-0">
                  <BookmarkCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Preserve Text Integrity: Pencil Only</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Borrowers must refrain from marking pages with permanent ballpoint pens, fluorescent highlighters, or
                    folding corner dog-ears. Use sticky notes or light pencil annotations that can be erased before return.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Defined Loan Windows: Semester vs. Exam Prep</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Lenders can specify a <strong>Full Semester Loan</strong> (up to 4 months) or an <strong>Exam Sprint Loan</strong> (1 to 2 weeks).
                    Borrowers must promptly return materials upon completion of final university exams.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-4">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400 shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Safe Campus Handoff Hubs</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Exchanges are typically conducted at visible campus landmarks: Asansol Engineering College Main Gate,
                    the AEC Central Library corridor, student canteens, or hostel gates in Kalla and Kalyanpur.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ACADEMIC ROOTS CALLOUT */}
          <section className="mt-12 rounded-2xl border border-border bg-muted/40 p-6">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Born Out of Student Camaraderie at AEC
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              KindLink was conceived by final-year Computer Science &amp; Engineering students at Asansol Engineering
              College. The textbook sharing pillar represents our commitment to circular campus resource sharing,
              ensuring that lack of financial means never stands between an ambitious student and an engineering degree.
            </p>
          </section>

          {/* BOTTOM CTA */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all"
            >
              <span>Explore Study Material Listings in App</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/about"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Read more about our AEC college roots &rarr;
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
