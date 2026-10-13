export type Locale =
  // Indian Languages
  | 'en'
  | 'hi'
  | 'bn'
  | 'bho'
  | 'mai'
  | 'ne'
  | 'ur'
  | 'sat'
  | 'or'
  | 'as'
  | 'mr'
  | 'gu'
  | 'pa'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  // Jharkhand Beta Languages
  | 'sck'
  | 'kht'
  | 'kru'
  | 'unr'
  | 'hoc'
  // International Languages
  | 'fr'
  | 'es'
  | 'de'
  | 'pt'
  | 'it'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'id'
  | 'tr';

export type TextDirection = 'ltr' | 'rtl';

export interface LanguageMeta {
  code: Locale;
  name: string;
  nativeName: string;
  script: string;
  dir: TextDirection;
  group: 'indian' | 'international';
  isBeta?: boolean;
  region?: string;
}

export interface CommonDictionary {
  appName: string;
  tagline: string;
  loading: string;
  cancel: string;
  save: string;
  close: string;
  search: string;
  searchPlaceholder: string;
  back: string;
  next: string;
  submit: string;
  confirm: string;
  edit: string;
  delete: string;
  status: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  justNow: string;
  distance: string;
  all: string;
  filter: string;
  change: string;
  active: string;
  completed: string;
}

export interface NavDictionary {
  home: string;
  requests: string;
  map: string;
  newRequest: string;
  physics: string;
  profile: string;
  settings: string;
  help: string;
  admin: string;
  login: string;
  signup: string;
  logout: string;
}

export interface HeaderDictionary {
  verifiedCommunity: string;
  emergencySos: string;
  switchLanguage: string;
  notifications: string;
  markAllRead: string;
  noNotifications: string;
  asansolLocation: string;
  toggleTheme: string;
}

export interface ActionsDictionary {
  offerHelp: string;
  helpOffered: string;
  helped: string;
  share: string;
  directions: string;
  call: string;
  chat: string;
  report: string;
  verify: string;
  viewDetails: string;
  whyRank: string;
  translateDescription: string;
  showOriginal: string;
  translating: string;
  copyLink: string;
  linkCopied: string;
}

export interface CategoriesDictionary {
  all: string;
  blood: string;
  medical: string;
  equipment: string;
  elderly: string;
  books: string;
  transport: string;
  food: string;
  physical: string;
  technical: string;
  safety: string;
  other: string;
}

export interface UrgenciesDictionary {
  critical: string;
  high: string;
  medium: string;
  low: string;
  emergency: string;
}

export interface SosDictionary {
  emergencyTitle: string;
  emergencySubtitle: string;
  call112: string;
  callAmbulance: string;
  callPolice: string;
  callWomenHelpline: string;
  bloodEmergency: string;
  triggerBeacon: string;
  cancelEmergency: string;
  activeEmergency: string;
  disclaimer: string;
}

export interface WizardDictionary {
  step1: string;
  step2: string;
  step3: string;
  createRequest: string;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  categoryLabel: string;
  urgencyLabel: string;
  locationLabel: string;
  submitRequest: string;
  contactLabel: string;
  bloodGroupLabel: string;
  unitsNeededLabel: string;
  itemTypeLabel: string;
}

export interface HelpFlowDictionary {
  offerHelpTitle: string;
  offerHelpDesc: string;
  contactRequester: string;
  etaLabel: string;
  arrivalNotice: string;
  matchConfirmed: string;
  safetyNotice: string;
}

export interface ProfileDictionary {
  reputation: string;
  verifiedResident: string;
  volunteerScore: string;
  totalHelps: string;
  totalRequests: string;
  activeBadges: string;
  settings: string;
  languagePreference: string;
  editProfile: string;
  memberSince: string;
  verificationStatus: string;
}

export interface BadgesDictionary {
  bloodDonor: string;
  firstResponder: string;
  verifiedStudent: string;
  trustedNeighbor: string;
  topHelper: string;
  techWizard: string;
  communityShield: string;
}

export interface EmptyStatesDictionary {
  noRequestsTitle: string;
  noRequestsDesc: string;
  noNotificationsTitle: string;
  noNotificationsDesc: string;
  noSearchResultsTitle: string;
  noSearchResultsDesc: string;
}

export interface ErrorsDictionary {
  genericError: string;
  networkError: string;
  locationDenied: string;
  invalidInput: string;
  authRequired: string;
}

export interface Dictionary {
  common: CommonDictionary;
  nav: NavDictionary;
  header: HeaderDictionary;
  actions: ActionsDictionary;
  categories: CategoriesDictionary;
  urgencies: UrgenciesDictionary;
  sos: SosDictionary;
  wizard: WizardDictionary;
  helpFlow: HelpFlowDictionary;
  profile: ProfileDictionary;
  badges: BadgesDictionary;
  emptyStates: EmptyStatesDictionary;
  errors: ErrorsDictionary;
}
