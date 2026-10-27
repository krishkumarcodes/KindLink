import {
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
  Pill,
  Utensils,
  HeartHandshake,
  AlertTriangle,
  GraduationCap,
  Shirt,
  Wrench,
  FileText,
  PawPrint,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';
import { HelpCategory } from './types';

export interface CategoryColorToken {
  id: HelpCategory;
  name: string;
  primary: string; // The WCAG AA compliant hex color with white text (>= 4.5:1)
  hover: string;
  active: string;
  lightBg: string;
  border: string;
  text: string;
  icon: LucideIcon;
  // Enhanced Emblem & Gradient styling
  gradient: string;        // Tailwind multi-stop gradient classes
  glow: string;            // rgba shadow glow color
  glowTailwind: string;    // Tailwind shadow class
  borderGradient: string;  // Border accent class
  badgeBg: string;         // Full badge styling classes
}

/**
 * Unified Category Colour Tokens (WCAG AA Contrast with White Text >= 4.5:1)
 * Enhanced with bespoke multi-stop gradient emblems and micro-specular rim glow
 */
export const CATEGORY_COLORS: Record<string, CategoryColorToken> = {
  blood: {
    id: 'blood',
    name: 'Blood Donation',
    primary: '#C62828',
    hover: '#B71C1C',
    active: '#8E0000',
    lightBg: 'rgba(198, 40, 40, 0.12)',
    border: 'rgba(198, 40, 40, 0.28)',
    text: '#C62828',
    icon: Droplets,
    gradient: 'from-rose-500 via-rose-600 to-red-600',
    glow: 'rgba(244, 63, 94, 0.4)',
    glowTailwind: 'shadow-rose-500/25',
    borderGradient: 'border-rose-500/30',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  equipment: {
    id: 'equipment',
    name: 'Medical Gear',
    primary: '#0F766E',
    hover: '#115E59',
    active: '#134E4A',
    lightBg: 'rgba(15, 118, 110, 0.12)',
    border: 'rgba(15, 118, 110, 0.28)',
    text: '#0F766E',
    icon: Stethoscope,
    gradient: 'from-teal-500 via-teal-600 to-emerald-600',
    glow: 'rgba(20, 184, 166, 0.4)',
    glowTailwind: 'shadow-teal-500/25',
    borderGradient: 'border-teal-500/30',
    badgeBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  },
  elderly: {
    id: 'elderly',
    name: 'Elderly Care',
    primary: '#4F46E5',
    hover: '#4338CA',
    active: '#3730A3',
    lightBg: 'rgba(79, 70, 229, 0.12)',
    border: 'rgba(79, 70, 229, 0.28)',
    text: '#4F46E5',
    icon: HeartHandshake,
    gradient: 'from-indigo-500 via-indigo-600 to-purple-600',
    glow: 'rgba(99, 102, 241, 0.4)',
    glowTailwind: 'shadow-indigo-500/25',
    borderGradient: 'border-indigo-500/30',
    badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
  books: {
    id: 'books',
    name: 'Study Books',
    primary: '#047857',
    hover: '#065F46',
    active: '#064E3B',
    lightBg: 'rgba(4, 120, 87, 0.12)',
    border: 'rgba(4, 120, 87, 0.28)',
    text: '#047857',
    icon: BookOpen,
    gradient: 'from-emerald-500 via-emerald-600 to-green-600',
    glow: 'rgba(16, 185, 129, 0.4)',
    glowTailwind: 'shadow-emerald-500/25',
    borderGradient: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  transport: {
    id: 'transport',
    name: 'Emergency Transit',
    primary: '#B45309',
    hover: '#92400E',
    active: '#78350F',
    lightBg: 'rgba(180, 83, 9, 0.12)',
    border: 'rgba(180, 83, 9, 0.28)',
    text: '#B45309',
    icon: Car,
    gradient: 'from-amber-500 via-amber-600 to-orange-600',
    glow: 'rgba(245, 158, 11, 0.4)',
    glowTailwind: 'shadow-amber-500/25',
    borderGradient: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  medicine: {
    id: 'medicine',
    name: 'Medicines & Pharmacy',
    primary: '#C2410C',
    hover: '#9A3412',
    active: '#7C2D12',
    lightBg: 'rgba(194, 65, 12, 0.12)',
    border: 'rgba(194, 65, 12, 0.28)',
    text: '#C2410C',
    icon: Pill,
    gradient: 'from-orange-500 via-orange-600 to-rose-600',
    glow: 'rgba(249, 115, 22, 0.4)',
    glowTailwind: 'shadow-orange-500/25',
    borderGradient: 'border-orange-500/30',
    badgeBg: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  },
  food: {
    id: 'food',
    name: 'Food & Groceries',
    primary: '#BE123C',
    hover: '#9F1239',
    active: '#881337',
    lightBg: 'rgba(190, 18, 60, 0.12)',
    border: 'rgba(190, 18, 60, 0.28)',
    text: '#BE123C',
    icon: Utensils,
    gradient: 'from-rose-500 via-pink-500 to-pink-600',
    glow: 'rgba(244, 63, 94, 0.4)',
    glowTailwind: 'shadow-rose-500/25',
    borderGradient: 'border-rose-500/30',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  hospital_attendant: {
    id: 'hospital_attendant',
    name: 'Hospital Attendant',
    primary: '#0369A1',
    hover: '#075985',
    active: '#0C4A6E',
    lightBg: 'rgba(3, 105, 161, 0.12)',
    border: 'rgba(3, 105, 161, 0.28)',
    text: '#0369A1',
    icon: HeartHandshake,
    gradient: 'from-sky-500 via-sky-600 to-blue-600',
    glow: 'rgba(14, 165, 233, 0.4)',
    glowTailwind: 'shadow-sky-500/25',
    borderGradient: 'border-sky-500/30',
    badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  disaster_relief: {
    id: 'disaster_relief',
    name: 'Disaster & Flood Relief',
    primary: '#B91C1C',
    hover: '#991B1B',
    active: '#7F1D1D',
    lightBg: 'rgba(185, 28, 28, 0.12)',
    border: 'rgba(185, 28, 28, 0.28)',
    text: '#B91C1C',
    icon: AlertTriangle,
    gradient: 'from-red-600 via-red-500 to-amber-600',
    glow: 'rgba(220, 38, 38, 0.4)',
    glowTailwind: 'shadow-red-500/25',
    borderGradient: 'border-red-500/30',
    badgeBg: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  },
  education: {
    id: 'education',
    name: 'Education & Tutoring',
    primary: '#6D28D9',
    hover: '#5B21B6',
    active: '#4C1D95',
    lightBg: 'rgba(109, 40, 217, 0.12)',
    border: 'rgba(109, 40, 217, 0.28)',
    text: '#6D28D9',
    icon: GraduationCap,
    gradient: 'from-purple-600 via-violet-600 to-violet-700',
    glow: 'rgba(147, 51, 234, 0.4)',
    glowTailwind: 'shadow-purple-500/25',
    borderGradient: 'border-purple-500/30',
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  },
  clothes: {
    id: 'clothes',
    name: 'Clothes & Essentials',
    primary: '#065F46',
    hover: '#064E3B',
    active: '#022C22',
    lightBg: 'rgba(6, 95, 70, 0.12)',
    border: 'rgba(6, 95, 70, 0.28)',
    text: '#065F46',
    icon: Shirt,
    gradient: 'from-teal-600 via-emerald-600 to-emerald-700',
    glow: 'rgba(13, 148, 136, 0.4)',
    glowTailwind: 'shadow-teal-500/25',
    borderGradient: 'border-teal-500/30',
    badgeBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  },
  home_repairs: {
    id: 'home_repairs',
    name: 'Home Repairs',
    primary: '#334155',
    hover: '#1E293B',
    active: '#0F172A',
    lightBg: 'rgba(51, 65, 85, 0.12)',
    border: 'rgba(51, 65, 85, 0.28)',
    text: '#334155',
    icon: Wrench,
    gradient: 'from-slate-600 via-slate-700 to-zinc-700',
    glow: 'rgba(71, 85, 105, 0.4)',
    glowTailwind: 'shadow-slate-500/25',
    borderGradient: 'border-slate-500/30',
    badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  },
  government_aid: {
    id: 'government_aid',
    name: 'Paperwork & Government Help',
    primary: '#3730A3',
    hover: '#312E81',
    active: '#1E1B4B',
    lightBg: 'rgba(55, 48, 163, 0.12)',
    border: 'rgba(55, 48, 163, 0.28)',
    text: '#3730A3',
    icon: FileText,
    gradient: 'from-indigo-600 via-blue-600 to-blue-700',
    glow: 'rgba(79, 70, 229, 0.4)',
    glowTailwind: 'shadow-indigo-500/25',
    borderGradient: 'border-indigo-500/30',
    badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
  animal_care: {
    id: 'animal_care',
    name: 'Animal & Pet Help',
    primary: '#9A3412',
    hover: '#7C2D12',
    active: '#431407',
    lightBg: 'rgba(154, 52, 18, 0.12)',
    border: 'rgba(154, 52, 18, 0.28)',
    text: '#9A3412',
    icon: PawPrint,
    gradient: 'from-amber-600 via-orange-600 to-red-700',
    glow: 'rgba(217, 119, 6, 0.4)',
    glowTailwind: 'shadow-amber-500/25',
    borderGradient: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  other: {
    id: 'other',
    name: 'Other (custom)',
    primary: '#475569',
    hover: '#334155',
    active: '#1E293B',
    lightBg: 'rgba(71, 85, 105, 0.12)',
    border: 'rgba(71, 85, 105, 0.28)',
    text: '#475569',
    icon: HelpCircle,
    gradient: 'from-zinc-600 via-slate-600 to-slate-700',
    glow: 'rgba(82, 82, 91, 0.4)',
    glowTailwind: 'shadow-zinc-500/25',
    borderGradient: 'border-zinc-500/30',
    badgeBg: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  },
};

export function getCategoryToken(
  category?: string | null,
  customLabel?: string | null
): CategoryColorToken {
  if (!category) return CATEGORY_COLORS.equipment;
  const normalized = category.toLowerCase().trim();

  // Legacy mappings
  if (normalized === 'elderly_help' || normalized === 'elderly') return CATEGORY_COLORS.elderly;
  if (normalized === 'blood') return CATEGORY_COLORS.blood;
  if (normalized === 'equipment') return CATEGORY_COLORS.equipment;
  if (normalized === 'books') return CATEGORY_COLORS.books;
  if (normalized === 'transport') return CATEGORY_COLORS.transport;

  // Standard 15 categories
  if (CATEGORY_COLORS[normalized]) {
    const token = CATEGORY_COLORS[normalized];
    if (normalized === 'other' && customLabel && customLabel.trim()) {
      return {
        ...token,
        name: `Other: ${customLabel.trim()}`,
      };
    }
    return token;
  }

  // Fallback for custom or unrecognized
  return {
    ...CATEGORY_COLORS.equipment,
    id: normalized as HelpCategory,
    name: customLabel?.trim() ? `Other: ${customLabel.trim()}` : 'Community Aid',
  };
}
