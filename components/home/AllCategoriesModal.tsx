'use client';

import React from 'react';
import {
  X,
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
  ShieldCheck,
  Clock,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { HelpCategory } from '@/lib/data/types';
import { useTranslation } from '@/lib/i18n';

interface AllCategoriesModalProps {
  open: boolean;
  onClose: () => void;
  categoryStats: Record<
    HelpCategory,
    { count: number; criticalCount: number; highCount: number }
  >;
  onSelectCategory: (cat: HelpCategory) => void;
}

export function AllCategoriesModal({
  open,
  onClose,
  categoryStats,
  onSelectCategory,
}: AllCategoriesModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const categoriesData: {
    key: HelpCategory;
    title: string;
    description: string;
    icon: React.ReactNode;
    tintBg: string;
    borderColor: string;
    badgeBg: string;
    acceptedItems: string[];
    responseTime: string;
  }[] = [
    {
      key: 'blood',
      title: t('categories.blood') || 'Blood Donation',
      description:
        'Emergency whole blood, platelets, and plasma replacement donors for surgical, trauma, and thalassemia patients across local blood banks and hospitals.',
      icon: <Droplets className="h-6 w-6 text-rose-500 notranslate" />,
      tintBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      borderColor: 'border-rose-500/20 hover:border-rose-500/50',
      badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      acceptedItems: ['Whole Blood (A/B/AB/O)', 'Single Donor Platelets (SDP)', 'Replacement Donors'],
      responseTime: 'Immediate (0-2 hours)',
    },
    {
      key: 'equipment',
      title: t('categories.equipment') || 'Medical Gear',
      description:
        'Community lending and sharing of temporary medical and rehabilitation apparatus to support post-operative healing and mobility recovery.',
      icon: <Stethoscope className="h-6 w-6 text-teal-500 notranslate" />,
      tintBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
      borderColor: 'border-teal-500/20 hover:border-teal-500/50',
      badgeBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
      acceptedItems: ['Wheelchairs', 'Oxygen Concentrators', 'Walkers & Crutches', 'Nebulizers'],
      responseTime: 'Within 2-4 hours',
    },
    {
      key: 'elderly',
      title: t('categories.elderly') || 'Elderly Care',
      description:
        'Compassionate neighborhood assistance for senior citizens living alone or needing gentle accompaniment for clinic visits, pharmacy runs, or grocery support.',
      icon: <Users className="h-6 w-6 text-blue-500 notranslate" />,
      tintBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-500/20 hover:border-blue-500/50',
      badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      acceptedItems: ['Prescription Pickups', 'Doctor Visit Companion', 'Grocery Delivery', 'Check-ins'],
      responseTime: 'Flexible / Scheduled',
    },
    {
      key: 'books',
      title: t('categories.books') || 'Books and Study',
      description:
        'Community book-sharing and academic resource redistribution for school students, competitive aspirants, and college learners in need of study materials.',
      icon: <BookOpen className="h-6 w-6 text-emerald-500 notranslate" />,
      tintBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-500/20 hover:border-emerald-500/50',
      badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      acceptedItems: ['NCERT / CBSE Textbooks', 'Engineering & Medical Guides', 'Exam Notes', 'Stationery'],
      responseTime: 'Within 24-48 hours',
    },
    {
      key: 'transport',
      title: t('categories.transport') || 'Emergency Transit',
      description:
        'Urgent volunteer transit and wheelchair-accessible rides to emergency rooms, dialysis centers, and scheduled chemotherapy sessions.',
      icon: <Car className="h-6 w-6 text-amber-500 notranslate" />,
      tintBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-500/20 hover:border-amber-500/50',
      badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      acceptedItems: ['Hospital Emergency Escort', 'Clinic Transit', 'Wheelchair-Friendly Rides'],
      responseTime: 'Immediate (0-2 hours)',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border bg-card/95">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                All Aid Categories
              </h2>
              <p className="text-xs text-muted-foreground">
                Community mutual aid categories, live open counts, and safety guidelines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close categories modal"
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Scrollable category list */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {categoriesData.map((cat) => {
            const stats = categoryStats[cat.key] || { count: 0, criticalCount: 0, highCount: 0 };

            return (
              <div
                key={cat.key}
                className={`p-4 sm:p-5 rounded-3xl border ${cat.borderColor} bg-card/60 transition-all hover:bg-card hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${cat.tintBg}`}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground">{cat.title}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cat.badgeBg}`}
                        >
                          {stats.count} open
                        </span>
                        {stats.criticalCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                            <Flame className="h-3 w-3 notranslate" />
                            {stats.criticalCount} critical
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3 notranslate text-primary" />
                        <span>Response expectation: {cat.responseTime}</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pl-13">
                    {cat.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pl-13 pt-1">
                    {cat.acceptedItems.map((item) => (
                      <span
                        key={item}
                        className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-medium text-foreground/80"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.key);
                    onClose();
                  }}
                  className="sm:self-center shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition active:scale-95 touch-target shadow-xs"
                >
                  <span>Browse Requests</span>
                  <ArrowRight className="h-3.5 w-3.5 notranslate" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
