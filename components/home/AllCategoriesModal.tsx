'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  ShieldCheck,
  Clock,
  ArrowRight,
  Flame,
  Layers,
  Heart,
} from 'lucide-react';
import { HelpCategory } from '@/lib/data/types';
import { STANDARD_CATEGORIES, CATEGORY_ICON_MAP } from '@/lib/data/categories';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { CategoryEmblem } from '@/components/categories/CategoryEmblem';

interface AllCategoriesModalProps {
  open: boolean;
  onClose: () => void;
  categoryStats: Record<
    string,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Lock background scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return STANDARD_CATEGORIES;
    return STANDARD_CATEGORIES.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(q);
      const matchDesc = cat.description.toLowerCase().includes(q);
      const matchTags = cat.suggestedTags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchTags;
    });
  }, [searchQuery]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-card/95 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                <ShieldCheck className="h-5 w-5 notranslate" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  All Aid Categories
                </h2>
                <p className="text-xs text-muted-foreground">
                  15 specialized mutual aid categories, live open counts, and response guidelines
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

          {/* Search Filter */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground notranslate" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by category, tag, or need (e.g. insulin, books, transit)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-border/80 bg-background/80 focus:bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-3.5 w-3.5 notranslate" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable category list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <Layers className="h-6 w-6 notranslate" />
              </div>
              <p className="text-sm font-bold text-foreground">
                No matching aid categories found for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Try searching for whole blood, gear, medicines, elder companionship, or tutor aid.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const stats = categoryStats[cat.key] || { count: 0, criticalCount: 0, highCount: 0 };
              const token = getCategoryToken(cat.key);

              return (
                <div
                  key={cat.key}
                  className="p-4 sm:p-5 rounded-3xl border bg-card/75 backdrop-blur-xs transition-all hover:bg-card hover:shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  style={{ borderColor: `${token.primary}35` }}
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-start gap-3.5">
                      <CategoryEmblem category={cat.key} size="lg" glow={true} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                            style={{
                              backgroundColor: token.lightBg,
                              borderColor: token.border,
                              color: token.primary,
                            }}
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
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <Clock className="h-3.5 w-3.5 notranslate text-primary shrink-0" />
                          <span>Response expectation: {cat.responseExpectation}</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed sm:pl-16">
                      {cat.description}
                    </p>

                    {cat.suggestedTags && cat.suggestedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:pl-16 pt-1">
                        {cat.suggestedTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded-lg bg-muted/80 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.key);
                      onClose();
                    }}
                    className="sm:self-center shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-xs font-bold transition-all active:scale-95 touch-target shadow-md hover:shadow-lg hover:brightness-105"
                    style={{
                      backgroundColor: token.primary,
                    }}
                  >
                    <span>Browse Requests</span>
                    <ArrowRight className="h-3.5 w-3.5 notranslate" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/90 flex justify-between items-center text-xs text-muted-foreground">
          <span>{filteredCategories.length} categories available</span>
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
