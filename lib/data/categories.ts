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
import { RequestCategory } from './types';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
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
};

export const STANDARD_CATEGORIES: RequestCategory[] = [
  {
    key: 'blood',
    name: 'Blood Donation',
    description: 'Emergency whole blood, platelets, and plasma replacement donors for surgical and trauma patients.',
    icon: 'Droplets',
    colour: '#C62828',
    defaultUrgencyHint: 'Immediate (0-2h)',
    responseExpectation: 'Immediate (0-2 hours)',
    suggestedTags: ['whole blood', 'platelets', 'plasma', 'emergency donor', 'hospital donor', 'replacement blood'],
    sortOrder: 1,
    active: true,
    isUrgent: true,
    extraFields: [
      { key: 'bloodGroup', label: 'Blood Group', type: 'select', required: true, options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
      { key: 'unitsNeeded', label: 'Units Needed', type: 'number', required: true },
      { key: 'hospitalName', label: 'Hospital / Blood Bank', type: 'text', required: true },
    ],
  },
  {
    key: 'equipment',
    name: 'Medical Gear',
    description: 'Wheelchairs, oxygen concentrators, walkers, crutches, and temporary rehabilitation apparatus.',
    icon: 'Stethoscope',
    colour: '#0F766E',
    defaultUrgencyHint: 'Urgent (2-4h)',
    responseExpectation: 'Within 2-4 hours',
    suggestedTags: ['wheelchair', 'oxygen concentrator', 'walker', 'crutches', 'nebulizer', 'hospital bed', 'bp monitor'],
    sortOrder: 2,
    active: true,
    isUrgent: true,
    extraFields: [
      { key: 'itemType', label: 'Equipment Type', type: 'text', required: true },
      { key: 'itemDuration', label: 'Duration Needed', type: 'text', required: true },
    ],
  },
  {
    key: 'elderly',
    name: 'Elderly Care',
    description: 'Compassionate neighbourhood accompaniment, medicine pickup, grocery support, and check-ins for seniors.',
    icon: 'HeartHandshake',
    colour: '#4F46E5',
    defaultUrgencyHint: 'Scheduled or flexible',
    responseExpectation: 'Flexible / Scheduled',
    suggestedTags: ['check-in', 'companion', 'groceries', 'clinic visit', 'home visit', 'reading help'],
    sortOrder: 3,
    active: true,
    isUrgent: false,
    extraFields: [
      { key: 'elderlyAidType', label: 'Support Type', type: 'text', required: true },
      { key: 'elderlyDuration', label: 'Time Needed', type: 'text', required: false },
    ],
  },
  {
    key: 'books',
    name: 'Books and Study',
    description: 'Academic textbooks, competitive exam study materials, notes, and learning resource sharing.',
    icon: 'BookOpen',
    colour: '#047857',
    defaultUrgencyHint: 'Standard (1-2 days)',
    responseExpectation: 'Within 24-48 hours',
    suggestedTags: ['textbooks', 'notes', 'exam prep', 'school', 'college', 'stationery', 'study guides'],
    sortOrder: 4,
    active: true,
    isUrgent: false,
    extraFields: [
      { key: 'booksClassSubject', label: 'Class / Subject', type: 'text', required: true },
      { key: 'bookTitle', label: 'Book Title', type: 'text', required: false },
    ],
  },
  {
    key: 'transport',
    name: 'Emergency Transit',
    description: 'Urgent volunteer transit, emergency clinic rides, and wheelchair-accessible hospital transport.',
    icon: 'Car',
    colour: '#B45309',
    defaultUrgencyHint: 'Immediate (0-2h)',
    responseExpectation: 'Immediate (0-2 hours)',
    suggestedTags: ['emergency ride', 'hospital transit', 'wheelchair ride', 'dialysis trip', 'clinic escort'],
    sortOrder: 5,
    active: true,
    isUrgent: true,
    extraFields: [
      { key: 'pickupAddress', label: 'Pickup Location', type: 'text', required: true },
      { key: 'dropAddress', label: 'Destination', type: 'text', required: true },
    ],
  },
  {
    key: 'medicine',
    name: 'Medicines and Pharmacy',
    description: 'Prescription pickup, pharmacy delivery, and urgent medicine availability assistance.',
    icon: 'Pill',
    colour: '#C2410C',
    defaultUrgencyHint: 'Urgent (1-3h)',
    responseExpectation: 'Within 1-3 hours',
    suggestedTags: ['prescription pickup', 'medicine delivery', 'urgent medicine', 'pharmacy run', 'insulin', 'first aid'],
    sortOrder: 6,
    active: true,
    isUrgent: true,
    extraFields: [
      { key: 'medicineNames', label: 'Medicine Names', type: 'text', required: true },
      { key: 'prescriptionRequired', label: 'Prescription Ready', type: 'boolean', required: false },
    ],
  },
  {
    key: 'food',
    name: 'Food and Groceries',
    description: 'Nutritious meal support for convalescing patients, essential groceries, and emergency food supplies.',
    icon: 'Utensils',
    colour: '#BE123C',
    defaultUrgencyHint: 'Same day (2-4h)',
    responseExpectation: 'Within 2-4 hours',
    suggestedTags: ['meal support', 'groceries', 'cooked food', 'ration kit', 'baby food', 'drinking water'],
    sortOrder: 7,
    active: true,
    isUrgent: true,
    extraFields: [
      { key: 'servingsCount', label: 'Number of Persons', type: 'number', required: false },
      { key: 'dietaryRestrictions', label: 'Dietary Notes', type: 'text', required: false },
    ],
  },
  {
    key: 'hospital_attendant',
    name: 'Hospital Attendant and Companion',
    description: 'Patient attendant bedside companion, clinic visit escort, OPD queue helper, and discharge aid.',
    icon: 'HeartHandshake',
    colour: '#0369A1',
    defaultUrgencyHint: 'Urgent (2-4h)',
    responseExpectation: 'Within 2-4 hours',
    suggestedTags: ['patient attendant', 'hospital visit', 'discharge help', 'bedside care', 'opd queue', 'wheelchair push'],
    sortOrder: 8,
    active: true,
    isUrgent: true,
    extraFields: [
      { key: 'hospitalName', label: 'Hospital Name', type: 'text', required: true },
      { key: 'wardRoom', label: 'Ward / Room', type: 'text', required: false },
    ],
  },
  {
    key: 'disaster_relief',
    name: 'Disaster and Flood Relief',
    description: 'Emergency temporary shelter, clean drinking water, rescue guidance, dry supplies, and flood relief.',
    icon: 'AlertTriangle',
    colour: '#B91C1C',
    defaultUrgencyHint: 'Immediate (0-1h)',
    responseExpectation: 'Immediate (0-1 hours)',
    suggestedTags: ['shelter', 'supplies', 'rescue information', 'flood relief', 'water pumps', 'tarpaulin'],
    sortOrder: 9,
    active: true,
    isUrgent: true,
    extraFields: [
      { key: 'hazardType', label: 'Situation / Need', type: 'text', required: true },
      { key: 'peopleCount', label: 'People in Need', type: 'number', required: false },
    ],
  },
  {
    key: 'education',
    name: 'Education and Tutoring',
    description: 'Volunteer peer tutoring, doubt solving, student mentoring, and academic skills guidance.',
    icon: 'GraduationCap',
    colour: '#6D28D9',
    defaultUrgencyHint: 'Flexible (1-3 days)',
    responseExpectation: 'Within 24-72 hours',
    suggestedTags: ['study help', 'mentoring', 'skill training', 'homework aid', 'math tutoring', 'science help'],
    sortOrder: 10,
    active: true,
    isUrgent: false,
    extraFields: [
      { key: 'subjectGrade', label: 'Subject & Grade', type: 'text', required: true },
    ],
  },
  {
    key: 'clothes',
    name: 'Clothes and Essentials',
    description: 'Clean wearable clothing sets, warm winter blankets, footwear, and household utility items.',
    icon: 'Shirt',
    colour: '#065F46',
    defaultUrgencyHint: 'Standard (1-2 days)',
    responseExpectation: 'Within 24-48 hours',
    suggestedTags: ['blankets', 'clothes', 'household items', 'winter wear', 'children clothes', 'shoes'],
    sortOrder: 11,
    active: true,
    isUrgent: false,
    extraFields: [
      { key: 'sizesNeeded', label: 'Items & Sizes Needed', type: 'text', required: true },
    ],
  },
  {
    key: 'home_repairs',
    name: 'Home Repairs and Small Jobs',
    description: 'Volunteer neighbourhood fixes for electrical safety, minor plumbing leaks, and small home handiwork.',
    icon: 'Wrench',
    colour: '#334155',
    defaultUrgencyHint: 'Scheduled (within 24h)',
    responseExpectation: 'Within 24 hours',
    suggestedTags: ['electrician', 'plumbing', 'small fixes', 'carpentry', 'appliance check', 'lock fix'],
    sortOrder: 12,
    active: true,
    isUrgent: false,
    extraFields: [
      { key: 'repairType', label: 'Repair Details', type: 'text', required: true },
    ],
  },
  {
    key: 'government_aid',
    name: 'Paperwork and Government Help',
    description: 'Assistance filling official forms, government scheme applications, and public welfare documents.',
    icon: 'FileText',
    colour: '#3730A3',
    defaultUrgencyHint: 'Standard (2-4 days)',
    responseExpectation: 'Within 2-4 days',
    suggestedTags: ['forms', 'documents', 'scheme applications', 'pension help', 'ration card', 'id application'],
    sortOrder: 13,
    active: true,
    isUrgent: false,
    extraFields: [
      { key: 'schemeName', label: 'Scheme or Document Name', type: 'text', required: true },
    ],
  },
  {
    key: 'animal_care',
    name: 'Animal and Pet Help',
    description: 'Street animal rescue assistance, emergency veterinary transport, fostering, and feeding support.',
    icon: 'PawPrint',
    colour: '#9A3412',
    defaultUrgencyHint: 'Urgent (1-3h)',
    responseExpectation: 'Within 1-3 hours',
    suggestedTags: ['rescue', 'pet care', 'food', 'injured animal', 'vet transit', 'foster care'],
    sortOrder: 14,
    active: true,
    isUrgent: true,
    extraFields: [
      { key: 'animalType', label: 'Animal / Situation', type: 'text', required: true },
    ],
  },
  {
    key: 'other',
    name: 'Other (custom)',
    description: 'Custom community mutual aid needs not covered by standard categories. Enter a specific label.',
    icon: 'HelpCircle',
    colour: '#475569',
    defaultUrgencyHint: 'Flexible',
    responseExpectation: 'Flexible',
    suggestedTags: ['neighbourhood aid', 'community support', 'special assistance'],
    sortOrder: 15,
    active: true,
    isUrgent: false,
    extraFields: [
      { key: 'customCategoryLabel', label: 'Custom Category Name', type: 'text', required: true },
    ],
  },
];

export function getAllCategories(): RequestCategory[] {
  return STANDARD_CATEGORIES;
}

export function getCategoryByKey(key?: string | null): RequestCategory | undefined {
  if (!key) return undefined;
  const norm = key.toLowerCase().trim();
  return STANDARD_CATEGORIES.find((c) => c.key === norm);
}

export function isUrgentCategory(key?: string | null): boolean {
  if (!key) return false;
  const cat = getCategoryByKey(key);
  return cat ? cat.isUrgent : false;
}

export function getSuggestedTagsForCategory(key?: string | null): string[] {
  if (!key) return [];
  const cat = getCategoryByKey(key);
  return cat ? cat.suggestedTags : [];
}

export function formatCategoryTitle(key?: string | null, customLabel?: string | null): string {
  if (!key) return 'Community Aid';
  const norm = key.toLowerCase().trim();
  if (norm === 'other') {
    const cleanCustom = (customLabel || '').trim();
    return cleanCustom ? `Other: ${cleanCustom}` : 'Other (custom)';
  }
  const cat = getCategoryByKey(norm);
  return cat ? cat.name : key.charAt(0).toUpperCase() + key.slice(1);
}

export function getCategoryQuickReplies(key?: string | null): string[] {
  if (!key) {
    return [
      'I am nearby and ready to help.',
      'I can assist with this right away.',
      'Please let me know how best to coordinate.',
    ];
  }

  const norm = key.toLowerCase().trim();
  switch (norm) {
    case 'blood':
      return [
        'I am an eligible donor and can head to the blood bank now.',
        'I have matching blood group and am available immediately.',
        'I can help connect you with donor contacts right away.',
      ];
    case 'equipment':
      return [
        'I have this equipment available and ready to share.',
        'I can deliver this gear to you safely.',
        'Available for loan for the duration needed.',
      ];
    case 'elderly':
      return [
        'I can assist with medicine pickup and delivery.',
        'Happy to accompany for the clinic visit.',
        'I am nearby and can check in on you.',
      ];
    case 'books':
      return [
        'I have these study materials and can hand them over.',
        'Happy to share my notes and textbooks.',
        'Available for pickup or handoff nearby.',
      ];
    case 'transport':
      return [
        'I have a vehicle and can provide a ride right away.',
        'Available to assist with transit to the hospital.',
        'Can provide safe accompaniment.',
      ];
    case 'medicine':
      return [
        'I am heading past the pharmacy and can pick this up.',
        'I can deliver these medicines right away.',
        'Please let me know the pharmacy location.',
      ];
    case 'food':
      return [
        'I have fresh meals ready to share.',
        'I can drop off groceries or dry rations right away.',
        'Happy to help with food supplies.',
      ];
    case 'hospital_attendant':
      return [
        'I am available to assist bedside or in OPD queue.',
        'Happy to accompany for discharge transit.',
        'I can stay for the requested hours.',
      ];
    case 'disaster_relief':
      return [
        'I have emergency supplies and clean water ready.',
        'I can assist with safe shelter or transport.',
        'Ready to help with relief coordination.',
      ];
    case 'education':
      return [
        'I can help with doubt solving and tutoring.',
        'Happy to mentor and guide through the syllabus.',
        'Available for an online or in-person study session.',
      ];
    case 'clothes':
      return [
        'I have clean clothes/blankets ready to donate.',
        'Can drop off requested essentials today.',
        'Happy to share extra winter wear.',
      ];
    case 'home_repairs':
      return [
        'I have tools and can help fix this small issue.',
        'Can inspect the repair work today.',
        'Happy to lend a hand with home fixes.',
      ];
    case 'government_aid':
      return [
        'I can help fill and verify these scheme application forms.',
        'Familiar with this process and happy to guide.',
        'Can assist with document submission.',
      ];
    case 'animal_care':
      return [
        'I can assist with rescue or veterinary transit.',
        'I have animal food supplies ready.',
        'Can provide temporary foster care.',
      ];
    default:
      return [
        'I am nearby and ready to help.',
        'I can assist with this right away.',
        'Please let me know how best to coordinate.',
      ];
  }
}
