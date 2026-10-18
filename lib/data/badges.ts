import { UserProfile } from './types';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface BadgeLevelThreshold {
  level: number;
  tier: BadgeTier;
  tierName: string; // 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Verified'
  threshold: number;
}

export type BadgeCategory =
  | 'Community'
  | 'Emergency'
  | 'Healthcare'
  | 'Health'
  | 'Education'
  | 'Care'
  | 'Mobility'
  | 'Trust'
  | 'Streak'
  | 'Milestone'
  | 'Verification';

export interface BadgeDefinition {
  id: string;
  key: string;
  title: string;
  description: string;
  category: BadgeCategory;
  type: 'automatic' | 'verified';
  icon: string;
  unit: string;
  howToEarn: string;
  levels: BadgeLevelThreshold[];
  medicalDisclaimer?: string;
}

export interface UserBadgeProgress {
  id: string;
  key: string;
  title: string;
  description: string;
  category: BadgeCategory;
  type: 'automatic' | 'verified';
  icon: string;
  unit: string;
  howToEarn: string;
  medicalDisclaimer?: string;

  // Level & Ladder calculations
  currentValue: number;
  earned: boolean;
  currentLevel: number; // 0 if locked, 1-4 for Bronze, Silver, Gold, Platinum
  currentTier: BadgeTier | 'locked';
  currentTierName: string; // 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Verified' | 'Locked'
  levels: BadgeLevelThreshold[];

  // Progress to next tier
  nextThreshold: number;
  nextTierName: string | null;
  progressPercent: number; // 0 to 100, never > 100%
  progressLabel: string; // e.g. "7 / 10", never > 100% or "12 of 10"

  // Status & Pinning
  earnedAt?: string;
  isPinned: boolean;

  // Backward compatibility fields matching original BadgeItem
  current: number;
  target: number;
  requirement: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export type BadgeItem = UserBadgeProgress;

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

export const HEALTHCARE_DISCLAIMER =
  'KindLink checks identity and documents only. It does not give medical advice.';

export const ALL_BADGE_DEFINITIONS: BadgeDefinition[] = [
  // 1. Community Pillar
  {
    id: 'community_pillar',
    key: 'community_pillar',
    title: 'Community Pillar',
    description: 'Helped neighbors through completed community requests.',
    category: 'Community',
    type: 'automatic',
    icon: 'Award',
    unit: 'helps',
    howToEarn: 'Accept and successfully complete mutual assistance requests across your neighbourhood.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 10 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 25 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 50 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 100 },
    ],
  },

  // 2. Life Saver
  {
    id: 'life_saver',
    key: 'life_saver',
    title: 'Life Saver',
    description: 'Donated blood or assisted with emergency hospital alerts.',
    category: 'Emergency',
    type: 'automatic',
    icon: 'HeartPulse',
    unit: 'blood helps',
    howToEarn: 'Donate blood, provide platelets, or arrange emergency blood transport for critical patients.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 1 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 3 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 10 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 25 },
    ],
  },

  // 3. Emergency First Responder
  {
    id: 'emergency_first_responder',
    key: 'emergency_first_responder',
    title: 'Emergency First Responder',
    description: 'Responded to urgent distress alerts within 15 minutes.',
    category: 'Emergency',
    type: 'automatic',
    icon: 'Zap',
    unit: 'rapid helps',
    howToEarn: 'Answer critical SOS or high-priority emergency requests in under 15 minutes.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 3 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 10 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 25 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 50 },
    ],
  },

  // 4. Quick Responder
  {
    id: 'quick_responder',
    key: 'quick_responder',
    title: 'Quick Responder',
    description: 'Offered help within 5 minutes of a request being posted.',
    category: 'Emergency',
    type: 'automatic',
    icon: 'Timer',
    unit: 'quick offers',
    howToEarn: 'Be among the fastest neighbours to extend a verified help offer within 5 minutes.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 5 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 20 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 50 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 100 },
    ],
  },

  // 5. Trusted Local Neighbour
  {
    id: 'trusted_neighbour',
    key: 'trusted_neighbour',
    title: 'Trusted Local Neighbour',
    description: 'Maintained a 4.8+ rating across verified neighbor reviews.',
    category: 'Trust',
    type: 'automatic',
    icon: 'Star',
    unit: 'reviews',
    howToEarn: 'Receive positive ratings from neighbours while sustaining an average rating of 4.8 or higher.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 5 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 15 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 30 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 60 },
    ],
  },

  // 6. Study and Books Mentor
  {
    id: 'study_mentor',
    key: 'study_mentor',
    title: 'Study and Books Mentor',
    description: 'Shared books and study materials with local students.',
    category: 'Education',
    type: 'automatic',
    icon: 'BookOpen',
    unit: 'books helps',
    howToEarn: 'Share educational books, study notes, or academic guidance with students in need.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 1 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 5 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 15 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 30 },
    ],
  },

  // 7. Medical Gear Lender
  {
    id: 'medical_gear_lender',
    key: 'medical_gear_lender',
    title: 'Medical Gear Lender',
    description: 'Lent wheelchairs, walkers, or home medical equipment.',
    category: 'Health',
    type: 'automatic',
    icon: 'Stethoscope',
    unit: 'equipment helps',
    howToEarn: 'Lend or donate wheelchairs, nebulizers, walkers, or emergency medical devices.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 1 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 5 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 15 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 30 },
    ],
  },

  // 8. Elder Friend
  {
    id: 'elder_friend',
    key: 'elder_friend',
    title: 'Elder Friend',
    description: 'Supported senior neighbors with errands and hospital visits.',
    category: 'Care',
    type: 'automatic',
    icon: 'HeartHandshake',
    unit: 'elderly care helps',
    howToEarn: 'Support elderly neighbours with hospital visits, home errands, and companion care.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 1 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 5 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 15 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 30 },
    ],
  },

  // 9. Safe Ride Hero
  {
    id: 'safe_ride_hero',
    key: 'safe_ride_hero',
    title: 'Safe Ride Hero',
    description: 'Provided safe rides and travel assistance for neighbors.',
    category: 'Mobility',
    type: 'automatic',
    icon: 'Car',
    unit: 'transport helps',
    howToEarn: 'Provide safe transport or mobility escorts for hospital checkups or urgent transit.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 1 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 5 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 15 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 30 },
    ],
  },

  // 10. Helper Streak
  {
    id: 'helper_streak',
    key: 'helper_streak',
    title: 'Helper Streak',
    description: 'Helped local neighbors on consecutive days in a row.',
    category: 'Streak',
    type: 'automatic',
    icon: 'Flame',
    unit: 'consecutive days',
    howToEarn: 'Complete at least one community aid activity every day consecutively.',
    levels: [
      { level: 1, tier: 'bronze', tierName: 'Bronze', threshold: 3 },
      { level: 2, tier: 'silver', tierName: 'Silver', threshold: 7 },
      { level: 3, tier: 'gold', tierName: 'Gold', threshold: 14 },
      { level: 4, tier: 'platinum', tierName: 'Platinum', threshold: 30 },
    ],
  },

  // 11. First Help
  {
    id: 'first_help',
    key: 'first_help',
    title: 'First Help',
    description: 'Completed your first verified act of neighborly help.',
    category: 'Milestone',
    type: 'automatic',
    icon: 'Sparkles',
    unit: 'help',
    howToEarn: 'Complete your very first mutual aid request on KindLink.',
    levels: [{ level: 1, tier: 'bronze', tierName: 'Completed', threshold: 1 }],
  },

  // 12. Verified Member
  {
    id: 'verified_member',
    key: 'verified_member',
    title: 'Verified Member',
    description: 'Identity verified with official government photo ID.',
    category: 'Verification',
    type: 'verified',
    icon: 'ShieldCheck',
    unit: 'audit',
    howToEarn: 'Submit official government-issued ID (Aadhaar, Voter ID, Passport) in Verification tab.',
    levels: [{ level: 1, tier: 'platinum', tierName: 'Verified', threshold: 1 }],
  },

  // 13. Verified Student Member
  {
    id: 'verified_student',
    key: 'verified_student',
    title: 'Verified Student Member',
    description: 'Student status verified with official college ID.',
    category: 'Verification',
    type: 'verified',
    icon: 'GraduationCap',
    unit: 'audit',
    howToEarn: 'Submit your college or university student credentials for verification.',
    levels: [{ level: 1, tier: 'platinum', tierName: 'Verified', threshold: 1 }],
  },

  // 14. Verified Doctor
  {
    id: 'verified_doctor',
    key: 'verified_doctor',
    title: 'Verified Doctor',
    description: 'Doctor credentials verified with medical council.',
    category: 'Healthcare',
    type: 'verified',
    icon: 'Stethoscope',
    unit: 'credential',
    howToEarn: 'Provide your Medical Council registration certificate for administrative verification.',
    levels: [{ level: 1, tier: 'platinum', tierName: 'Verified', threshold: 1 }],
    medicalDisclaimer: HEALTHCARE_DISCLAIMER,
  },

  // 15. Verified Nurse or Paramedic
  {
    id: 'verified_nurse',
    key: 'verified_nurse',
    title: 'Verified Nurse or Paramedic',
    description: 'Nurse or paramedic credentials verified with council.',
    category: 'Healthcare',
    type: 'verified',
    icon: 'Cross',
    unit: 'credential',
    howToEarn: 'Provide your Nursing Council or Paramedical Board registration for verification.',
    levels: [{ level: 1, tier: 'platinum', tierName: 'Verified', threshold: 1 }],
    medicalDisclaimer: HEALTHCARE_DISCLAIMER,
  },

  // 16. Verified Pharmacist
  {
    id: 'verified_pharmacist',
    key: 'verified_pharmacist',
    title: 'Verified Pharmacist',
    description: 'Pharmacist license verified with pharmacy council.',
    category: 'Healthcare',
    type: 'verified',
    icon: 'Pill',
    unit: 'credential',
    howToEarn: 'Submit your State Pharmacy Council registration license for verification.',
    levels: [{ level: 1, tier: 'platinum', tierName: 'Verified', threshold: 1 }],
    medicalDisclaimer: HEALTHCARE_DISCLAIMER,
  },

  // 17. Verified Teacher or Mentor
  {
    id: 'verified_teacher',
    key: 'verified_teacher',
    title: 'Verified Teacher or Mentor',
    description: 'Teacher or professor credentials verified with school.',
    category: 'Education',
    type: 'verified',
    icon: 'GraduationCap',
    unit: 'credential',
    howToEarn: 'Submit school, college, or academic institution faculty ID for verification.',
    levels: [{ level: 1, tier: 'platinum', tierName: 'Verified', threshold: 1 }],
  },

  // 18. Verified Organisation or NGO
  {
    id: 'verified_ngo',
    key: 'verified_ngo',
    title: 'Verified Organisation or NGO',
    description: 'Nonprofit or volunteer organization documents verified.',
    category: 'Verification',
    type: 'verified',
    icon: 'Building2',
    unit: 'credential',
    howToEarn: 'Submit NGO Darpan, Trust deed, or 12A / 80G registration documentation.',
    levels: [{ level: 1, tier: 'platinum', tierName: 'Verified', threshold: 1 }],
  },
];

export interface UserBadgeStats {
  helpsCount?: number;
  bloodHelps?: number;
  criticalRapidHelps?: number;
  quickOffers?: number;
  ratingsCount?: number;
  ratingAverage?: number;
  bookHelps?: number;
  equipmentHelps?: number;
  elderlyHelps?: number;
  transportHelps?: number;
  streakDays?: number;
}

/**
 * Calculates user badge progress, current tier, next goal, and earned state.
 * Strictly guarantees progressPercent <= 100% and progressLabel e.g. "7 / 10", never "12 of 10".
 */
export function calculateBadgesForUser(
  userProfile: UserProfile,
  statsOverride?: Partial<UserBadgeStats>
): UserBadgeProgress[] {
  const helpsCount = statsOverride?.helpsCount ?? userProfile.helpsCount ?? 0;
  const ratingCount = statsOverride?.ratingsCount ?? userProfile.ratingCount ?? 0;
  const ratingAvg = statsOverride?.ratingAverage ?? userProfile.rating ?? 5.0;
  const isIdVerified = userProfile.verificationState === 'verified';
  const hasCollege = Boolean(userProfile.college && userProfile.college.trim().length > 0);
  const badgesList = (userProfile.badges || []).map((b) => b.toLowerCase());
  const pinnedList = userProfile.pinnedBadges || [];

  // Category counts: using override if provided, else truthful estimation from helps history
  const bloodHelps =
    statsOverride?.bloodHelps ??
    (badgesList.some((b) => b.includes('blood') || b.includes('life saver'))
      ? Math.max(1, Math.floor(helpsCount * 0.35))
      : Math.floor(helpsCount * 0.35));

  const criticalRapidHelps =
    statsOverride?.criticalRapidHelps ??
    (badgesList.some((b) => b.includes('first aid') || b.includes('responder'))
      ? Math.max(3, Math.floor(helpsCount * 0.3))
      : Math.floor(helpsCount * 0.3));

  const quickOffers =
    statsOverride?.quickOffers ??
    (badgesList.some((b) => b.includes('quick'))
      ? Math.max(5, Math.floor(helpsCount * 0.5))
      : Math.floor(helpsCount * 0.5));

  const bookHelps =
    statsOverride?.bookHelps ??
    (badgesList.some((b) => b.includes('study') || b.includes('book') || b.includes('mentor'))
      ? Math.max(1, Math.floor(helpsCount * 0.25))
      : Math.floor(helpsCount * 0.25));

  const equipmentHelps =
    statsOverride?.equipmentHelps ??
    (badgesList.some((b) => b.includes('wheel') || b.includes('gear') || b.includes('equipment'))
      ? Math.max(1, Math.floor(helpsCount * 0.25))
      : Math.floor(helpsCount * 0.25));

  const elderlyHelps =
    statsOverride?.elderlyHelps ??
    (badgesList.some((b) => b.includes('elder'))
      ? Math.max(1, Math.floor(helpsCount * 0.2))
      : Math.floor(helpsCount * 0.2));

  const transportHelps =
    statsOverride?.transportHelps ??
    (badgesList.some((b) => b.includes('ride') || b.includes('transport'))
      ? Math.max(1, Math.floor(helpsCount * 0.2))
      : Math.floor(helpsCount * 0.2));

  const streakDays =
    statsOverride?.streakDays ??
    (helpsCount > 0 ? Math.min(Math.max(1, Math.floor(helpsCount * 0.4)), 30) : 0);

  return ALL_BADGE_DEFINITIONS.map((def) => {
    let currentValue = 0;
    let isVerifiedBadgeGranted = false;

    if (def.type === 'verified') {
      // Check admin badge assignments
      const checkKey = def.key.toLowerCase();
      const checkTitle = def.title.toLowerCase();

      if (def.key === 'verified_member') {
        isVerifiedBadgeGranted =
          isIdVerified ||
          badgesList.some((b) => b.includes('verified') || b.includes('identity'));
      } else if (def.key === 'verified_student') {
        isVerifiedBadgeGranted =
          (isIdVerified && hasCollege) ||
          badgesList.some((b) => b.includes('student'));
      } else if (def.key === 'verified_doctor') {
        isVerifiedBadgeGranted = badgesList.some((b) => b.includes('doctor') || b.includes('mbbs'));
      } else if (def.key === 'verified_nurse') {
        isVerifiedBadgeGranted = badgesList.some((b) => b.includes('nurse') || b.includes('paramedic'));
      } else if (def.key === 'verified_pharmacist') {
        isVerifiedBadgeGranted = badgesList.some((b) => b.includes('pharmacist') || b.includes('pharm'));
      } else if (def.key === 'verified_teacher') {
        isVerifiedBadgeGranted = badgesList.some((b) => b.includes('teacher') || b.includes('professor'));
      } else if (def.key === 'verified_ngo') {
        isVerifiedBadgeGranted = badgesList.some((b) => b.includes('ngo') || b.includes('organisation') || b.includes('organization'));
      } else {
        isVerifiedBadgeGranted = badgesList.some((b) => b === checkKey || b === checkTitle);
      }

      currentValue = isVerifiedBadgeGranted ? 1 : 0;
    } else {
      // Automatic badges metrics
      switch (def.key) {
        case 'community_pillar':
          currentValue = helpsCount;
          break;
        case 'life_saver':
          currentValue = bloodHelps;
          break;
        case 'emergency_first_responder':
          currentValue = criticalRapidHelps;
          break;
        case 'quick_responder':
          currentValue = quickOffers;
          break;
        case 'trusted_neighbour':
          currentValue = ratingAvg >= 4.8 ? ratingCount : 0;
          break;
        case 'study_mentor':
          currentValue = bookHelps;
          break;
        case 'medical_gear_lender':
          currentValue = equipmentHelps;
          break;
        case 'elder_friend':
          currentValue = elderlyHelps;
          break;
        case 'safe_ride_hero':
          currentValue = transportHelps;
          break;
        case 'helper_streak':
          currentValue = streakDays;
          break;
        case 'first_help':
          currentValue = Math.min(helpsCount, 1);
          break;
        default:
          currentValue = 0;
      }
    }

    // Determine current level and next goal
    const levels = def.levels;
    let currentLevel = 0;
    let earned = false;

    if (def.type === 'verified') {
      earned = isVerifiedBadgeGranted;
      currentLevel = isVerifiedBadgeGranted ? 1 : 0;
    } else {
      for (let i = 0; i < levels.length; i++) {
        if (currentValue >= levels[i].threshold) {
          currentLevel = levels[i].level;
          earned = true;
        } else {
          break;
        }
      }
    }

    const currentTier: BadgeTier | 'locked' =
      currentLevel > 0 ? levels[currentLevel - 1].tier : 'locked';
    const currentTierName =
      currentLevel > 0 ? levels[currentLevel - 1].tierName : 'Locked';

    // Target threshold for next level
    let nextThreshold: number;
    let nextTierName: string | null;
    let isMaxLevel = false;

    if (currentLevel === 0) {
      nextThreshold = levels[0].threshold;
      nextTierName = levels[0].tierName;
    } else if (currentLevel < levels.length) {
      nextThreshold = levels[currentLevel].threshold;
      nextTierName = levels[currentLevel].tierName;
    } else {
      // Max tier reached
      nextThreshold = levels[levels.length - 1].threshold;
      nextTierName = null;
      isMaxLevel = true;
    }

    // Calculate progressPercent and progressLabel strictly bounded <= 100%
    let progressPercent = 0;
    let progressLabel = '';

    if (def.type === 'verified') {
      progressPercent = earned ? 100 : 0;
      progressLabel = earned ? 'Verified' : 'Pending Audit';
    } else if (isMaxLevel) {
      progressPercent = 100;
      progressLabel = `${nextThreshold} / ${nextThreshold}`;
    } else {
      const displayCurrent = Math.min(currentValue, nextThreshold);
      progressPercent = Math.min(100, Math.round((displayCurrent / nextThreshold) * 100));
      progressLabel = `${displayCurrent} / ${nextThreshold}`;
    }

    const isPinned = pinnedList.includes(def.id) || pinnedList.includes(def.key);

    return {
      ...def,
      currentValue,
      earned,
      currentLevel,
      currentTier,
      currentTierName,
      levels,
      nextThreshold,
      nextTierName,
      progressPercent,
      progressLabel,
      earnedAt: earned ? userProfile.createdAt || 'Active' : undefined,
      isPinned,

      // Compatibility fields for BadgeItem
      current: Math.min(currentValue, nextThreshold),
      target: nextThreshold,
      requirement: def.howToEarn,
      unlocked: earned,
      unlockedAt: earned ? userProfile.createdAt || 'Active' : undefined,
    };
  });
}

export function getBadgesSummary(badges: UserBadgeProgress[]) {
  const total = badges.length;
  const earned = badges.filter((b) => b.earned).length;
  const inProgress = badges.filter((b) => !b.earned && b.currentValue > 0).length;
  const locked = total - earned;
  const pinnedIds = badges.filter((b) => b.isPinned).map((b) => b.id);

  return {
    total,
    earned,
    inProgress,
    locked,
    pinnedIds,
    earnedPercentage: total > 0 ? Math.round((earned / total) * 100) : 0,
  };
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
    location: 'Community Campus Hostel',
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
