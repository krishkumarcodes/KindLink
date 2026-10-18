import { Droplets, Stethoscope, Users, BookOpen, Car, LucideIcon } from 'lucide-react';
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
}

/**
 * Unified Category Colour Tokens (WCAG AA Contrast with White Text)
 * Blood: Deep Red #C62828 (Contrast 5.9:1)
 * Medical gear: Teal #0F766E (Contrast 5.3:1)
 * Elderly care: Indigo #4F46E5 (Contrast 5.4:1)
 * Books: Emerald #047857 (Contrast 5.4:1)
 * Emergency transit: Amber-Brown #B45309 (Contrast 4.8:1)
 */
export const CATEGORY_COLORS: Record<HelpCategory, CategoryColorToken> = {
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
    icon: Users,
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
  },
};

export function getCategoryToken(category?: string | null): CategoryColorToken {
  if (!category) return CATEGORY_COLORS.equipment;
  const normalized = category.toLowerCase().trim();
  if (normalized === 'elderly_help' || normalized === 'elderly') return CATEGORY_COLORS.elderly;
  if (normalized === 'blood') return CATEGORY_COLORS.blood;
  if (normalized === 'equipment') return CATEGORY_COLORS.equipment;
  if (normalized === 'books') return CATEGORY_COLORS.books;
  if (normalized === 'transport') return CATEGORY_COLORS.transport;
  return CATEGORY_COLORS.equipment;
}
