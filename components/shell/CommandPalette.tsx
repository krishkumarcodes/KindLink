'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Siren,
  PlusCircle,
  Home,
  FileText,
  Map as MapIcon,
  User,
  Settings,
  Moon,
  Sun,
  Globe,
  MapPin,
  Clock,
  Sparkles,
  Command,
  ArrowRight,
  CornerDownLeft,
  X,
  Phone,
  ShieldCheck,
  Check,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useKindLinkStore, AppView } from '@/lib/store/useKindLinkStore';
import { STANDARD_CATEGORIES, CATEGORY_ICON_MAP } from '@/lib/data/categories';
import { OverlayPortal, useBodyScrollLock, useFocusTrap } from '@/components/ui/OverlayPortal';
import { EmergencySosModal } from '@/components/sos/EmergencySosModal';
import { LocationModal } from '@/components/shell/LocationModal';
import { LanguageModal } from '@/components/shell/LanguageModal';

interface PaletteItem {
  id: string;
  title: string;
  description?: string;
  category: 'emergency' | 'navigation' | 'categories' | 'preferences' | 'requests';
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sub-modal states when triggered from Command Palette
  const [sosOpen, setSosOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const {
    currentView,
    setCurrentView,
    requests,
    setFilterCategory,
    setSelectedRequestId,
    userAreaName,
  } = useKindLinkStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // iOS Safari scroll lock and focus trap
  useBodyScrollLock(open);
  useFocusTrap(containerRef, open, () => setOpen(false));

  // Global Keyboard Shortcuts (Cmd+K, Ctrl+K, '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Open on '/' if not typing in an input/textarea
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (!isInput && e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Listen for custom event
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('kindlink:open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('kindlink:open-command-palette', handleCustomOpen);
    };
  }, [open]);

  // Focus input on open and reset state
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Define static command items
  const items: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [];

    // 1. Emergency & Urgent actions
    list.push({
      id: 'emergency-sos',
      title: 'Emergency SOS',
      description: 'Trigger immediate local alert & nearby emergency facilities',
      category: 'emergency',
      icon: Siren,
      iconColor: 'text-rose-600 dark:text-rose-400',
      badge: 'URGENT',
      badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
      action: () => {
        setOpen(false);
        setSosOpen(true);
      },
      keywords: ['sos', 'emergency', 'help', 'danger', 'hospital', 'ambulance', 'urgent', 'police'],
    });

    list.push({
      id: 'national-helplines',
      title: 'National Helplines (112 / 102 / 1091)',
      description: 'Quick dial national emergency ambulance and police lines',
      category: 'emergency',
      icon: Phone,
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: '24/7',
      badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      action: () => {
        setOpen(false);
        if (typeof window !== 'undefined') {
          window.location.href = 'tel:112';
        }
      },
      keywords: ['helpline', 'call', '112', '102', '1091', 'police', 'ambulance', 'women'],
    });

    // 2. Navigation Items
    const navConfigs: { id: string; title: string; view: AppView; icon: LucideIcon; desc: string; keywords: string[] }[] = [
      {
        id: 'nav-home',
        title: 'Go to Home',
        view: 'home',
        icon: Home,
        desc: 'Community pulse, 24h activity, and quick aid categories',
        keywords: ['home', 'feed', 'pulse', 'community', 'dashboard'],
      },
      {
        id: 'nav-requests',
        title: 'Browse All Requests',
        view: 'requests',
        icon: FileText,
        desc: 'Explore open neighbor requests with category filters',
        keywords: ['requests', 'browse', 'list', 'feed', 'open', 'offers'],
      },
      {
        id: 'nav-map',
        title: 'Open Live Map',
        view: 'map',
        icon: MapIcon,
        desc: 'Interactive basemap with walking and cycling routes',
        keywords: ['map', 'live', 'routing', 'directions', 'nearby', 'gps'],
      },
      {
        id: 'nav-new',
        title: 'Ask for Help (Post Request)',
        view: 'new',
        icon: PlusCircle,
        desc: 'Publish an urgent community aid request',
        keywords: ['post', 'new', 'create', 'ask', 'request', 'need'],
      },
      {
        id: 'nav-profile',
        title: 'My Profile & Badges',
        view: 'profile',
        icon: User,
        desc: 'Verified stats, pinned badge medals, and impact summary',
        keywords: ['profile', 'badges', 'medals', 'rating', 'verified', 'me'],
      },
      {
        id: 'nav-settings',
        title: 'Settings & Basemap Choices',
        view: 'settings',
        icon: Settings,
        desc: 'Map engine provider, dark mode, and preferences',
        keywords: ['settings', 'preferences', 'basemap', 'account', 'options'],
      },
    ];

    navConfigs.forEach((n) => {
      list.push({
        id: n.id,
        title: n.title,
        description: n.desc,
        category: 'navigation',
        icon: n.icon,
        iconColor: 'text-primary',
        action: () => {
          setOpen(false);
          setCurrentView(n.view);
        },
        keywords: n.keywords,
      });
    });

    // 3. Aid Categories (All 15 standard categories)
    STANDARD_CATEGORIES.forEach((cat) => {
      const CategoryIcon = CATEGORY_ICON_MAP[cat.icon] || HelpCircle;
      list.push({
        id: `cat-${cat.key}`,
        title: cat.name,
        description: cat.description,
        category: 'categories',
        icon: CategoryIcon,
        iconColor: 'text-primary',
        badge: cat.name,
        badgeBg: 'bg-muted/80 border-border/80',
        badgeColor: cat.colour,
        action: () => {
          setOpen(false);
          setFilterCategory(cat.key as any);
          setCurrentView('requests');
          toast.success(`Showing requests for ${cat.name}`);
        },
        keywords: [
          'category',
          cat.name.toLowerCase(),
          cat.key.toLowerCase(),
          ...(cat.suggestedTags || []).map((t) => t.toLowerCase()),
        ],
      });
    });

    // 4. Preferences & Tools
    list.push({
      id: 'pref-theme',
      title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      description: theme === 'dark' ? 'Comfortable daytime daylight palette' : 'High-contrast nocturnal dark theme',
      category: 'preferences',
      icon: theme === 'dark' ? Sun : Moon,
      iconColor: 'text-amber-500',
      badge: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
      badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      action: () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        toast.success(`Theme switched to ${nextTheme} mode`);
      },
      keywords: ['theme', 'dark', 'light', 'mode', 'night', 'day', 'color'],
    });

    list.push({
      id: 'pref-location',
      title: 'Change Location or Area',
      description: `Current: ${userAreaName || 'Set your area'}`,
      category: 'preferences',
      icon: MapPin,
      iconColor: 'text-emerald-500',
      badge: 'Location',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      action: () => {
        setOpen(false);
        setLocationOpen(true);
      },
      keywords: ['location', 'city', 'area', 'neighborhood', 'gps', 'coords'],
    });

    list.push({
      id: 'pref-language',
      title: 'Change App Language',
      description: 'Switch between Bengali, Hindi, English, and 12+ Indian languages',
      category: 'preferences',
      icon: Globe,
      iconColor: 'text-cyan-500',
      badge: 'Language',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
      action: () => {
        setOpen(false);
        setLanguageOpen(true);
      },
      keywords: ['language', 'hindi', 'bengali', 'english', 'tamil', 'marathi', 'translate'],
    });

    // 5. Active Requests Matching
    if (requests && requests.length > 0) {
      requests.slice(0, 8).forEach((req) => {
        const contact = req.contactName || 'Community Member';
        list.push({
          id: `req-${req.id}`,
          title: req.title,
          description: `By ${contact} · ${req.category} · ${req.urgency}`,
          category: 'requests',
          icon: Clock,
          iconColor: 'text-teal-500',
          badge: req.urgency.toUpperCase(),
          badgeBg:
            req.urgency === 'critical'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
              : req.urgency === 'high'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
              : 'bg-teal-500/10 border-teal-500/20 text-teal-600',
          action: () => {
            setOpen(false);
            setSelectedRequestId(req.id);
            setCurrentView('requests');
          },
          keywords: [
            'request',
            req.title.toLowerCase(),
            contact.toLowerCase(),
            req.category.toLowerCase(),
            req.urgency.toLowerCase(),
            ...(req.tags || []).map((t) => t.toLowerCase()),
          ],
        });
      });
    }

    return list;
  }, [theme, setTheme, currentView, setCurrentView, requests, setFilterCategory, setSelectedRequestId, userAreaName]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default view: Show emergency, quick navigation, and preferences
      return items.filter(
        (i) => i.category === 'emergency' || i.category === 'navigation' || i.category === 'preferences'
      );
    }

    return items.filter((item) => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.description?.toLowerCase().includes(q)) return true;
      if (item.badge?.toLowerCase().includes(q)) return true;
      if (item.keywords?.some((k) => k.includes(q))) return true;
      return false;
    });
  }, [items, query]);

  // Ensure selectedIndex is within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Keyboard navigation within the list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 >= filteredItems.length ? 0 : prev + 1));
      scrollActiveIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 < 0 ? Math.max(0, filteredItems.length - 1) : prev - 1));
      scrollActiveIntoView();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  const scrollActiveIntoView = () => {
    setTimeout(() => {
      const activeEl = listRef.current?.querySelector('[data-active="true"]');
      activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 10);
  };

  return (
    <>
      {open && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-[12dvh] sm:pt-[15dvh] bg-slate-950/75 supports-[backdrop-filter]:backdrop-blur-sm transition-opacity duration-150 animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="KindLink Universal Command Palette"
          >
            {/* Backdrop click to dismiss */}
            <div
              className="fixed inset-0 -z-10"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Solid Single Surface Modal */}
            <div
              ref={containerRef}
              className="relative w-full max-w-xl max-h-[75dvh] flex flex-col overflow-hidden rounded-3xl bg-card border border-border/80 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-150 outline-none"
            >
              {/* Sticky Top Search Header */}
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/80 bg-card shrink-0">
                <Search className="h-5 w-5 text-primary shrink-0 notranslate" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Type a command, category, or search aid..."
                  className="w-full bg-transparent text-sm sm:text-base font-medium text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0"
                  aria-autocomplete="list"
                  aria-controls="command-palette-results"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
                    aria-label="Clear query"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/60 px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
                    ESC
                  </kbd>
                )}
              </div>

              {/* Scrollable Results List */}
              <div
                ref={listRef}
                id="command-palette-results"
                role="listbox"
                className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1 divide-y divide-border/40"
              >
                {filteredItems.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <HelpCircle className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2 notranslate" />
                    <p className="text-sm font-semibold text-foreground">No matching commands</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try searching for &quot;blood&quot;, &quot;sos&quot;, &quot;map&quot;, or &quot;elderly&quot;
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const IconComponent = item.icon;

                    return (
                      <div
                        key={item.id}
                        role="option"
                        aria-selected={isSelected}
                        data-active={isSelected}
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-100 ${
                          isSelected
                            ? 'bg-primary/10 dark:bg-teal-500/15 border border-primary/20 text-foreground'
                            : 'hover:bg-muted/60 text-foreground border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Item Icon */}
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 transition-transform ${
                              isSelected
                                ? 'bg-primary/15 scale-105 border-primary/30'
                                : 'bg-muted/60'
                            }`}
                          >
                            <IconComponent
                              className={`h-4 w-4 ${item.iconColor || 'text-primary'} notranslate`}
                            />
                          </div>

                          {/* Title & Description */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                                    item.badgeBg || 'bg-muted text-muted-foreground'
                                  }`}
                                  style={item.badgeColor ? { color: item.badgeColor } : undefined}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action hint icon */}
                        <div className="shrink-0 flex items-center">
                          {isSelected ? (
                            <CornerDownLeft className="h-4 w-4 text-primary animate-in fade-in duration-100 notranslate" />
                          ) : (
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors notranslate" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sticky Footer Bar with Shortcuts Guide */}
              <div className="px-4 py-2 border-t border-border/80 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 select-none">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/80 bg-card px-1 py-0.5 text-[9px] font-mono">↑</kbd>
                    <kbd className="rounded border border-border/80 bg-card px-1 py-0.5 text-[9px] font-mono">↓</kbd>
                    <span className="hidden xs:inline">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/80 bg-card px-1.5 py-0.5 text-[9px] font-mono">↵</kbd>
                    <span className="hidden xs:inline">Select</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <span>KindLink Quick Actions</span>
                </div>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {/* Sub-modals triggered from Command Palette */}
      <EmergencySosModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
      <LanguageModal open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </>
  );
}
