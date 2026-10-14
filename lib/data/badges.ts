import { UserProfile } from './types';

export interface BadgeItem {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'Milestone' | 'Emergency' | 'Category' | 'Trust' | 'Streak';
  requirement: string;
  current: number;
  target: number;
  unit: string;
  unlocked: boolean;
  unlockedAt?: string;
  progressPercent: number;
}

export interface ImpactHelpItem {
  id: string;
  title: string;
  category: string;
  date: string;
  month: string;
  rating: number;
  comment?: string;
  beneficiary: string;
  location: string;
  distanceKm: number;
  hoursSpent: number;
}

export interface CategoryBreakdown {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  bgLight: string;
  icon: string;
}

export interface ImpactDashboardData {
  totalPeopleHelped: number;
  completedHelps: number;
  hoursVolunteered: number;
  kilometersTraveled: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTimeline: {
    month: string;
    totalHelps: number;
    hours: number;
    items: ImpactHelpItem[];
  }[];
}

export const ALL_BADGE_DEFINITIONS: Omit<BadgeItem, 'current' | 'unlocked' | 'progressPercent' | 'unlockedAt'>[] = [
  {
    id: 'first_help',
    key: 'first_help',
    title: 'First Help',
    description: 'Stepped forward and completed your first community act of kindness.',
    icon: '🤝',
    category: 'Milestone',
    requirement: 'Complete 1 help task',
    target: 1,
    unit: 'help',
  },
  {
    id: 'life_saver',
    key: 'life_saver',
    title: 'Life Saver',
    description: 'Responded to critical emergency blood donations or patient transport escorts.',
    icon: '🩸',
    category: 'Emergency',
    requirement: '3 emergency blood or transport assists',
    target: 3,
    unit: 'helps',
  },
  {
    id: 'book_buddy',
    key: 'book_buddy',
    title: 'Book Buddy',
    description: 'Shared textbooks, reference guides, or helped students in need with study materials.',
    icon: '📚',
    category: 'Category',
    requirement: '2 book deliveries or study assists',
    target: 2,
    unit: 'helps',
  },
  {
    id: 'wheel_helper',
    key: 'wheel_helper',
    title: 'Wheel Helper',
    description: 'Supplied wheelchairs, oxygen concentrators, or orthopedic mobility devices.',
    icon: '🩺',
    category: 'Category',
    requirement: '2 medical equipment provisions',
    target: 2,
    unit: 'helps',
  },
  {
    id: 'elder_friend',
    key: 'elder_friend',
    title: 'Elder Friend',
    description: 'Accompanied or supported senior citizens with hospital visits, errands, and mobility.',
    icon: '👵',
    category: 'Category',
    requirement: '2 elderly care assists',
    target: 2,
    unit: 'helps',
  },
  {
    id: 'quick_responder',
    key: 'quick_responder',
    title: 'Quick Responder',
    description: 'Consistently accepted and initiated urgent emergency tasks in under 15 minutes.',
    icon: '⚡',
    category: 'Emergency',
    requirement: '5 fast responses (<15 mins)',
    target: 5,
    unit: 'responses',
  },
  {
    id: 'trusted',
    key: 'trusted',
    title: 'Trusted Neighbor',
    description: 'Maintained an outstanding 4.5+ star trust rating with 5+ community reviews.',
    icon: '⭐',
    category: 'Trust',
    requirement: '4.5+ avg rating & 5+ reviews',
    target: 5,
    unit: 'ratings',
  },
  {
    id: 'verified',
    key: 'verified',
    title: 'Verified Volunteer',
    description: 'Identity authenticated via government or student credentials by KindLink staff.',
    icon: '🛡️',
    category: 'Trust',
    requirement: 'Pass ID document audit',
    target: 1,
    unit: 'audit',
  },
  {
    id: 'seven_day_streak',
    key: 'seven_day_streak',
    title: '7-Day Streak',
    description: 'Active helper responding or checking into the community aid network for 7 consecutive days.',
    icon: '🔥',
    category: 'Streak',
    requirement: '7 days consecutive activity',
    target: 7,
    unit: 'days',
  },
  {
    id: 'community_hero',
    key: 'community_hero',
    title: 'Community Hero',
    description: 'A pillar of strength in the neighborhood with 25+ verified completed assists.',
    icon: '🏆',
    category: 'Milestone',
    requirement: 'Complete 25 help tasks',
    target: 25,
    unit: 'helps',
  },
];

export function calculateBadgesForUser(userProfile: UserProfile): BadgeItem[] {
  const helpsCount = userProfile.helpsCount || 0;
  const ratingCount = userProfile.ratingCount || (helpsCount > 0 ? Math.min(helpsCount, 19) : 0);
  const ratingAvg = userProfile.rating || 5.0;
  const isVerified = userProfile.verificationState === 'verified';

  // Specific category counters estimated or tracked from profile
  const bloodHelps = Math.min(Math.floor(helpsCount * 0.35), 6);
  const bookHelps = Math.min(Math.floor(helpsCount * 0.2), 3);
  const equipmentHelps = Math.min(Math.floor(helpsCount * 0.25), 4);
  const elderlyHelps = Math.min(Math.floor(helpsCount * 0.2), 3);
  const quickResponses = Math.min(Math.floor(helpsCount * 0.4), 8);
  const streakDays = Math.min(helpsCount > 0 ? 7 : 0, 7);

  return ALL_BADGE_DEFINITIONS.map((def) => {
    let current = 0;
    let unlocked = false;

    switch (def.key) {
      case 'first_help':
        current = Math.min(helpsCount, def.target);
        unlocked = helpsCount >= 1;
        break;
      case 'life_saver':
        current = Math.min(bloodHelps, def.target);
        unlocked = bloodHelps >= def.target;
        break;
      case 'book_buddy':
        current = Math.min(bookHelps, def.target);
        unlocked = bookHelps >= def.target;
        break;
      case 'wheel_helper':
        current = Math.min(equipmentHelps, def.target);
        unlocked = equipmentHelps >= def.target;
        break;
      case 'elder_friend':
        current = Math.min(elderlyHelps, def.target);
        unlocked = elderlyHelps >= def.target;
        break;
      case 'quick_responder':
        current = Math.min(quickResponses, def.target);
        unlocked = quickResponses >= def.target;
        break;
      case 'trusted':
        current = ratingAvg >= 4.5 ? Math.min(ratingCount, def.target) : 0;
        unlocked = ratingAvg >= 4.5 && ratingCount >= def.target;
        break;
      case 'verified':
        current = isVerified ? 1 : 0;
        unlocked = isVerified;
        break;
      case 'seven_day_streak':
        current = Math.min(streakDays, def.target);
        unlocked = streakDays >= def.target;
        break;
      case 'community_hero':
        current = Math.min(helpsCount, def.target);
        unlocked = helpsCount >= def.target;
        break;
      default:
        current = 0;
        unlocked = false;
    }

    const progressPercent = Math.min(Math.round((current / def.target) * 100), 100);

    return {
      ...def,
      current,
      unlocked,
      progressPercent,
      unlockedAt: unlocked ? 'Active' : undefined,
    };
  });
}

export const SAMPLE_IMPACT_HISTORY: ImpactHelpItem[] = [
  {
    id: 'act-1',
    title: 'Delivered Emergency O+ Blood Unit to District Hospital',
    category: 'blood',
    date: 'Oct 11, 2026 · 4:30 PM',
    month: 'October 2026',
    rating: 5.0,
    comment: 'Arrived within 18 minutes! Truly a life saver for my father during surgery.',
    beneficiary: 'Pritam Karmakar',
    location: 'Asansol District Hospital, SB Gorai Road',
    distanceKm: 1.8,
    hoursSpent: 1.5,
  },
  {
    id: 'act-2',
    title: 'Provided Foldable Wheelchair to Senior Citizen',
    category: 'equipment',
    date: 'Oct 09, 2026 · 11:15 AM',
    month: 'October 2026',
    rating: 5.0,
    comment: 'Clean wheelchair in great condition. Thank you so much for the quick delivery!',
    beneficiary: 'Ananya Banerjee',
    location: 'Court More, Asansol',
    distanceKm: 3.2,
    hoursSpent: 2.0,
  },
  {
    id: 'act-3',
    title: 'Assisted High School Student with Madhyamik Books',
    category: 'books',
    date: 'Oct 05, 2026 · 3:00 PM',
    month: 'October 2026',
    rating: 4.8,
    comment: 'Brought full set of science textbooks for Class 10. Very polite and helpful.',
    beneficiary: 'Bikash Das',
    location: 'Ushagram, Asansol',
    distanceKm: 2.5,
    hoursSpent: 1.0,
  },
  {
    id: 'act-4',
    title: 'Accompanied Cardiac Patient to HLG Memorial Hospital',
    category: 'transport',
    date: 'Sep 27, 2026 · 9:45 AM',
    month: 'September 2026',
    rating: 5.0,
    comment: 'Safe driving and assisted with stretcher transfer at emergency entrance.',
    beneficiary: 'Sneha Mukherjee',
    location: 'Sen Raleigh Road, Asansol',
    distanceKm: 4.6,
    hoursSpent: 2.5,
  },
  {
    id: 'act-5',
    title: 'Emergency B+ Platelets Replacement for Dengue Patient',
    category: 'blood',
    date: 'Sep 21, 2026 · 7:20 PM',
    month: 'September 2026',
    rating: 5.0,
    comment: 'Helped our family during peak emergency. Deeply grateful!',
    beneficiary: 'Rameshwar Mahato',
    location: 'Burnpur Hospital',
    distanceKm: 5.8,
    hoursSpent: 3.0,
  },
  {
    id: 'act-6',
    title: 'Wheelchair Boarding Escort at Asansol Junction',
    category: 'elderly',
    date: 'Sep 15, 2026 · 2:10 PM',
    month: 'September 2026',
    rating: 4.9,
    comment: 'Helped grandmother get safely onto coach S4 with luggage.',
    beneficiary: 'Subhashish Bose',
    location: 'Platform 3, Asansol Railway Station',
    distanceKm: 2.4,
    hoursSpent: 1.5,
  },
  {
    id: 'act-7',
    title: 'Oxygen Concentrator (5L) Handover for Home Recovery',
    category: 'equipment',
    date: 'Aug 29, 2026 · 6:00 PM',
    month: 'August 2026',
    rating: 5.0,
    comment: 'Demonstrated operation cleanly and checked cannula tubing.',
    beneficiary: 'Debabrata Roy',
    location: 'Kalyanpur Housing, Asansol',
    distanceKm: 1.2,
    hoursSpent: 1.5,
  },
  {
    id: 'act-8',
    title: 'Delivered Engineering Science Textbooks',
    category: 'books',
    date: 'Aug 18, 2026 · 1:30 PM',
    month: 'August 2026',
    rating: 5.0,
    comment: 'Lent engineering computer science and math volumes for semester exams.',
    beneficiary: 'Tanmay Ghosh',
    location: 'AEC Campus Hostel',
    distanceKm: 0.8,
    hoursSpent: 0.5,
  },
];

export function getImpactDashboardData(userProfile: UserProfile): ImpactDashboardData {
  const helpsCount = userProfile.helpsCount || 18;
  const hours = userProfile.hoursVolunteered || Math.round(helpsCount * 2.35 * 10) / 10;
  const km = userProfile.kilometersTraveled || Math.round(helpsCount * 3.8 * 10) / 10;
  const people = Math.round(helpsCount * 1.35);

  const bloodCount = Math.max(1, Math.round(helpsCount * 0.33));
  const equipmentCount = Math.max(1, Math.round(helpsCount * 0.22));
  const elderlyCount = Math.max(1, Math.round(helpsCount * 0.17));
  const booksCount = Math.max(1, Math.round(helpsCount * 0.17));
  const transportCount = Math.max(1, helpsCount - (bloodCount + equipmentCount + elderlyCount + booksCount));

  const totalCalc = bloodCount + equipmentCount + elderlyCount + booksCount + transportCount;

  const categoryBreakdown: CategoryBreakdown[] = [
    {
      key: 'blood',
      label: 'Blood & Platelets',
      count: bloodCount,
      percentage: Math.round((bloodCount / totalCalc) * 100),
      color: '#ef4444',
      bgLight: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      icon: '🩸',
    },
    {
      key: 'equipment',
      label: 'Medical Equipment',
      count: equipmentCount,
      percentage: Math.round((equipmentCount / totalCalc) * 100),
      color: '#06b6d4',
      bgLight: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
      icon: '🩺',
    },
    {
      key: 'elderly',
      label: 'Elderly Assistance',
      count: elderlyCount,
      percentage: Math.round((elderlyCount / totalCalc) * 100),
      color: '#8b5cf6',
      bgLight: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      icon: '👵',
    },
    {
      key: 'books',
      label: 'Books & Education',
      count: booksCount,
      percentage: Math.round((booksCount / totalCalc) * 100),
      color: '#10b981',
      bgLight: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      icon: '📚',
    },
    {
      key: 'transport',
      label: 'Emergency Transport',
      count: transportCount,
      percentage: Math.round((transportCount / totalCalc) * 100),
      color: '#f59e0b',
      bgLight: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      icon: '🚗',
    },
  ];

  // Group timeline by month
  const months = ['October 2026', 'September 2026', 'August 2026'];
  const monthlyTimeline = months.map((month) => {
    const items = SAMPLE_IMPACT_HISTORY.filter((item) => item.month === month);
    const totalHelps = items.length;
    const monthHours = items.reduce((acc, curr) => acc + curr.hoursSpent, 0);
    return {
      month,
      totalHelps,
      hours: Math.round(monthHours * 10) / 10,
      items,
    };
  });

  return {
    totalPeopleHelped: people,
    completedHelps: helpsCount,
    hoursVolunteered: hours,
    kilometersTraveled: km,
    categoryBreakdown,
    monthlyTimeline,
  };
}
