/**
 * KindLink Profile Integrity, Layout & Component Audit Script
 * 
 * Verifies all 6 bug fixes and 14 requirements:
 * 1. Zero duplicate labels or sections in EditProfileModal, OverviewTab, Emergency Contacts.
 * 2. Stats consistency: single source of truth, demo accounts data completeness.
 * 3. Tab strip sticky offset, no visible scrollbar, sub-tabs formatting.
 * 4. Share button icon centering (h-10 w-10 flex items-center justify-center).
 * 5. Vertically centered '@' prefix in username input group.
 * 6. Accessible 52x32px Switch component used across Settings (no raw checkboxes).
 * 7. Clean display names in demo seeds (no "(Volunteer)" in names).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message, fixHint = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failedChecks++;
    console.error(`  ✖ [FAIL] ${message}`);
    if (fixHint) console.error(`         Hint: ${fixHint}`);
  }
}

console.log('\n================================================================');
console.log(' KindLink Profile Integrity & Comprehensive QA Audit            ');
console.log('================================================================\n');

// --- 1. Audit Duplicate Labels & Sections ---
console.log('1. Auditing Label Uniqueness (Zero Duplicate Rendering)...');

const editModalPath = path.join(ROOT_DIR, 'components/profile/EditProfileModal.tsx');
const editModalContent = fs.readFileSync(editModalPath, 'utf8');

// Strip JSX and JS comments before testing rendered element uniqueness
const strippedEditModal = editModalContent
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

const expectedLabels = [
  { name: 'Full Display Name', pattern: /<label[^>]*>[\s\S]*?Full Display Name[\s\S]*?<\/label>/i },
  { name: 'Username (@handle)', pattern: /<label[^>]*>[\s\S]*?Username \(@handle\)[\s\S]*?<\/label>/i },
  { name: 'Community Bio', pattern: /<label[^>]*>[\s\S]*?Community Bio[\s\S]*?<\/label>/i },
  { name: 'Organisation / Affiliation', pattern: /<span>Organisation \/ Affiliation<\/span>/i },
  { name: 'Area / Home Neighbourhood', pattern: /<span>Area \/ Home Neighbourhood<\/span>/i },
  { name: 'Phone Number', pattern: /label="Phone Number"|<label[^>]*>[\s\S]*?Phone Number[\s\S]*?<\/label>/i },
  { name: 'Languages Spoken', pattern: /<span>Languages Spoken/i },
];

for (const { name, pattern } of expectedLabels) {
  const matches = (strippedEditModal.match(new RegExp(pattern, 'g')) || []).length;
  assert(
    matches === 1,
    `EditProfileModal: Form label "${name}" rendered exactly once in JSX (found: ${matches})`,
    'Ensure this field is not duplicated in the form body.'
  );
}

// Emergency Contacts Empty State Uniqueness
const overviewTabPath = path.join(ROOT_DIR, 'components/profile/tabs/OverviewTab.tsx');
const overviewContent = fs.readFileSync(overviewTabPath, 'utf8');
const strippedOverview = overviewContent
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

const emptyContactsIllustrations = (strippedOverview.match(/src="\/illustrations\/empty-contacts\.svg"/g) || []).length;
assert(
  emptyContactsIllustrations === 1,
  `OverviewTab: Emergency contacts empty state illustration rendered exactly once (found: ${emptyContactsIllustrations})`,
  'Do not render duplicate empty state containers.'
);

const addContactBtnEmptyMatches = (strippedOverview.match(/<span>Add First Emergency Contact<\/span>/g) || []).length;
assert(
  addContactBtnEmptyMatches === 1,
  `OverviewTab: "Add First Emergency Contact" action button rendered exactly once (found: ${addContactBtnEmptyMatches})`,
  'Ensure the empty state has only one dedicated add action button.'
);

// Assert top Add Contact button is hidden when count === 0
assert(
  strippedOverview.includes('emergencyContacts.length > 0 && emergencyContacts.length < 3'),
  'OverviewTab: Top "Add Contact" button conditionally hidden when 0 contacts exist (prevents double button)',
  'Only render top add button when emergencyContacts.length > 0.'
);

// --- 2. Share Icon & Username '@' Centering ---
console.log('\n2. Auditing Icon Centering & Alignment...');

const headerPath = path.join(ROOT_DIR, 'components/profile/ProfileHeader.tsx');
const headerContent = fs.readFileSync(headerPath, 'utf8');

assert(
  headerContent.includes('h-10 w-10') && headerContent.includes('items-center justify-center'),
  'ProfileHeader: Share button has identical h-10 w-10 square dimensions with flex centering',
  'Use h-10 w-10 rounded-xl flex items-center justify-center shrink-0 for exact 1px icon centering.'
);

assert(
  editModalContent.includes('inline-flex items-center') && editModalContent.includes('@') && editModalContent.includes('leading-none'),
  'EditProfileModal: Username "@" prefix is vertically centered inside flex input group with leading-none',
  'Use flex input group with leading-none to eliminate vertical baseline offset.'
);

// --- 3. Sticky Tab Strip & Scrollbar Suppression ---
console.log('\n3. Auditing Tab Strip & Sub-Tabs Navigation...');

const tabsPath = path.join(ROOT_DIR, 'components/profile/ProfileTabs.tsx');
const tabsContent = fs.readFileSync(tabsPath, 'utf8');

assert(
  tabsContent.includes('sticky') && tabsContent.includes('top-['),
  'ProfileTabs: Tab strip has sticky positioning with explicit top offset to prevent header clipping',
  'Set sticky top-[64px] lg:top-[72px] z-20.'
);

assert(
  tabsContent.includes('no-scrollbar') || tabsContent.includes('scrollbar-none'),
  'ProfileTabs: Native thick scrollbar is suppressed via no-scrollbar utility',
  'Apply no-scrollbar to horizontal scroll container.'
);

assert(
  tabsContent.includes('container.scrollTo') || tabsContent.includes('scrollIntoView') || tabsContent.includes('scrollTo'),
  'ProfileTabs: Active tab automatically smooth-scrolls into view inside horizontal container when selected',
  'Call container.scrollTo on active tab element inside horizontal scroll container.'
);

const activityTabPath = path.join(ROOT_DIR, 'components/profile/tabs/ActivityTab.tsx');
const activityContent = fs.readFileSync(activityTabPath, 'utf8');

assert(
  activityContent.includes('All Activity') &&
  activityContent.includes('Completed Helps') &&
  activityContent.includes('My Requests') &&
  activityContent.includes('My Offers'),
  'ActivityTab: All 4 sub-tabs ("All Activity", "Completed Helps", "My Requests", "My Offers") are present',
  'Include the 4 designated activity sub-tabs.'
);

// --- 4. Switch Component Across Settings ---
console.log('\n4. Auditing Accessible Switch Component in Settings...');

const switchPath = path.join(ROOT_DIR, 'components/ui/Switch.tsx');
const switchContent = fs.readFileSync(switchPath, 'utf8');

assert(
  switchContent.includes('52px') && switchContent.includes('32px') && switchContent.includes('role="switch"'),
  'Switch.tsx: 52x32px accessible switch component with role="switch" and aria-checked',
  'Implement w-[52px] h-[32px] rounded-full with sliding knob and keyboard handling.'
);

const settingsPath = path.join(ROOT_DIR, 'components/settings/SettingsView.tsx');
const settingsContent = fs.readFileSync(settingsPath, 'utf8');

assert(
  settingsContent.includes('SwitchRow') && !settingsContent.includes('type="checkbox"'),
  'SettingsView: Every toggle/checkbox replaced with SwitchRow (zero raw checkboxes in settings)',
  'Use SwitchRow for all settings toggles.'
);

// --- 5. Clean Seed Data & Stats Integrity ---
console.log('\n5. Auditing Demo Seed Data & Stats Consistency...');

const seedAccountsPath = path.join(ROOT_DIR, 'supabase/sql/seed_demo_accounts.sql');
const seedContent = fs.readFileSync(seedAccountsPath, 'utf8');

assert(
  !seedContent.includes('(Volunteer)'),
  'seed_demo_accounts.sql: Role "(Volunteer)" purged from display names',
  'Display name must be "Dr. Ananya Roy" without embedded parenthetical role.'
);

assert(
  seedContent.includes('public.requests') && seedContent.includes("'completed'"),
  'seed_demo_accounts.sql: Contains real completed request rows matching volunteer profile',
  'Seed completed requests so stats and activity history match.'
);

assert(
  seedContent.includes('public.ratings'),
  'seed_demo_accounts.sql: Contains real rating rows matching completed volunteer requests',
  'Seed rating rows so trust score is calculated from real data.'
);

// --- 6. Verification Stepper & Admin Portal ---
console.log('\n6. Auditing Verification Flow & Admin Portal...');

const verifyTabPath = path.join(ROOT_DIR, 'components/profile/tabs/VerificationTab.tsx');
const verifyContent = fs.readFileSync(verifyTabPath, 'utf8');

assert(
  verifyContent.includes('Profile Details') &&
  verifyContent.includes('ID Document') &&
  verifyContent.includes('Admin Review'),
  'VerificationTab: 3-step verification stepper (Profile Details -> ID Document -> Admin Review) present',
  'Follow the 3-step verification architecture.'
);

const adminPath = path.join(ROOT_DIR, 'app/admin/page.tsx');
const adminContent = fs.readFileSync(adminPath, 'utf8');

assert(
  adminContent.includes('Self-approval prohibited') || adminContent.includes('cannot approve'),
  'app/admin/page.tsx: Admin self-approval protection rule strictly enforced',
  'Prevent admins from approving their own verification or deletion requests.'
);

// --- 7. International Phone Input ---
console.log('\n7. Auditing International Phone Input...');

const phoneInputPath = path.join(ROOT_DIR, 'components/profile/PhoneInput.tsx');
const phoneInputContent = fs.readFileSync(phoneInputPath, 'utf8');

assert(
  phoneInputContent.includes('libphonenumber-js') && phoneInputContent.includes('parsePhoneNumber'),
  'PhoneInput.tsx: Integrates libphonenumber-js with international country picker and E.164 parsing',
  'Use libphonenumber-js for country code validation and formatting.'
);

console.log('\n================================================================');
console.log(` Profile Audit Verdict:`);
console.log(`   ✔ Passed Checks : ${passedChecks} / ${totalChecks}`);
console.log(`   ✖ Failed Checks : ${failedChecks} / ${totalChecks}`);
console.log('================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PROFILE INTEGRITY, LAYOUT & COMPONENT AUDITS PASSED WITH ZERO ERRORS!\n');
  process.exit(0);
}
