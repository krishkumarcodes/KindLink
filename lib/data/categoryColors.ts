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
}

/**
 * Unified Category Colour Tokens (WCAG AA Contrast with White Text >= 4.5:1)
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
