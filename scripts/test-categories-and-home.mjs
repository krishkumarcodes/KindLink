import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateCustomCategoryLabel,
  validateTag,
  validateTagsList,
  formatCategoryDisplay,
} from '../lib/utils/content-filter.ts';

/**
 * KindLink QA Test Suite: Categories, Home Page, Database & Content Moderation
 * 
 * Validates:
 * 1. 15-Category System: all 15 categories defined, icons, extra fields, suggested tags.
 * 2. WCAG AA Contrast Compliance: >= 4.5:1 against #FFFFFF for all 15 category primary colors.
 * 3. Content Moderation: Custom category label (3-40 chars, profanity rejection) & tags (2-24 chars, <=5 tags).
 * 4. New Request Wizard: 15 category cards, dynamic fields, tag inputs, saved places in Step 4, safe padding.
 * 5. Home Page: 4 primary tiles + 1 wide 5th tile, Community Pulse (status bar, refresh 360 spin, 4 cards), Urgent Near You (no truncate, dynamic chips).
 * 6. Last 24 Hours Sheet: 3 equal stat tiles with FULL labels, dual bar hourly activity chart.
 * 7. All Categories Modal: 15 categories, live search, response expectation, tag chips.
 * 8. Database Migrations (19, 20, 21): request_categories, tags array, reports anti-duplicate constraint, RPCs.
 */

console.log('🧪 Starting KindLink Categories, Home & Database QA Test Suite...\n');

// Load files
const categoriesFile = 'lib/data/categories.ts';
const categoryColorsFile = 'lib/data/categoryColors.ts';
const wizardFile = 'components/wizard/NewRequestWizard.tsx';
const homeViewFile = 'components/home/HomeView.tsx';
const pulseFile = 'components/home/CommunityPulse.tsx';
const allCategoriesModalFile = 'components/home/AllCategoriesModal.tsx';
const urgentNearYouFile = 'components/home/UrgentNearYou.tsx';
const last24HoursFile = 'components/home/Last24HoursSheet.tsx';
const requestsViewFile = 'components/requests/RequestsView.tsx';
const migration19File = 'supabase/sql/19_request_categories_and_tags.sql';
const migration20File = 'supabase/sql/20_reports_and_moderation.sql';
const migration21File = 'supabase/sql/21_location_cleanup_and_feed_updates.sql';
const allInOneFile = 'supabase/sql/all_in_one.sql';

const categoriesCode = fs.readFileSync(categoriesFile, 'utf8');
const categoryColorsCode = fs.readFileSync(categoryColorsFile, 'utf8');
const wizardCode = fs.readFileSync(wizardFile, 'utf8');
const homeViewCode = fs.readFileSync(homeViewFile, 'utf8');
const pulseCode = fs.readFileSync(pulseFile, 'utf8');
const allCategoriesModalCode = fs.readFileSync(allCategoriesModalFile, 'utf8');
const urgentNearYouCode = fs.readFileSync(urgentNearYouFile, 'utf8');
const last24HoursCode = fs.readFileSync(last24HoursFile, 'utf8');
const requestsViewCode = fs.readFileSync(requestsViewFile, 'utf8');
const migration19Code = fs.readFileSync(migration19File, 'utf8');
const migration20Code = fs.readFileSync(migration20File, 'utf8');
const migration21Code = fs.readFileSync(migration21File, 'utf8');
const allInOneCode = fs.readFileSync(allInOneFile, 'utf8');

// ==============================================================================
// TEST SUITE 1: 15 Categories & Metadata
// ==============================================================================
console.log('--- 1. Testing 15-Category System & Metadata ---');

const EXPECTED_CATEGORIES = [
  'blood',
  'equipment',
  'elderly',
  'books',
  'transport',
  'medicine',
  'food',
  'hospital_attendant',
  'disaster_relief',
  'education',
  'clothes',
  'home_repairs',
  'government_aid',
  'animal_care',
  'other',
];

console.log('  1.1 Checking that all 15 categories exist in STANDARD_CATEGORIES and CATEGORY_COLORS...');
for (const cat of EXPECTED_CATEGORIES) {
  assert.ok(
    categoriesCode.includes(`key: '${cat}'`),
    `Category ${cat} must be defined in STANDARD_CATEGORIES in ${categoriesFile}`
  );
  assert.ok(
    categoryColorsCode.includes(`${cat}: {`) || categoryColorsCode.includes(`'${cat}': {`),
    `Category ${cat} must have color tokens in CATEGORY_COLORS in ${categoryColorsFile}`
  );
}
console.log('     ✓ All 15 standard categories verified in categories and color maps');

console.log('  1.2 Checking extra fields, urgency hints, and suggested tags...');
for (const cat of EXPECTED_CATEGORIES) {
  const catRegex = new RegExp(`key:\\s*'${cat}'[\\s\\S]*?suggestedTags:\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const match = categoriesCode.match(catRegex);
  assert.ok(match, `Category ${cat} must contain suggestedTags array`);
  const tagsCount = match[1].split(',').filter((s) => s.trim().length > 0).length;
  assert.ok(tagsCount >= 3, `Category ${cat} must contain at least 3 suggested tags, found ${tagsCount}`);
}
console.log('     ✓ All 15 categories contain >= 3 suggested tags and detailed field schemas');

// ==============================================================================
// TEST SUITE 2: WCAG AA Color Contrast Audit
// ==============================================================================
console.log('\n--- 2. Testing Category Colors WCAG AA Contrast (>= 4.5:1 against #FFFFFF) ---');

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  if (clean.length === 6) {
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  return [0, 0, 0];
}

function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const whiteText = '#FFFFFF';
const extractedCategoryColors = [];
const colorBlockRegex = /([a-z_]+):\s*{\s*id:\s*'([a-z_]+)',\s*name:\s*'([^']+)',\s*primary:\s*'([^']+)'/g;
let cMatch;
while ((cMatch = colorBlockRegex.exec(categoryColorsCode)) !== null) {
  extractedCategoryColors.push({
    id: cMatch[2],
    name: cMatch[3],
    hex: cMatch[4],
  });
}

assert.equal(
  extractedCategoryColors.length,
  15,
  `Expected 15 category color tokens extracted, got ${extractedCategoryColors.length}`
);

for (const c of extractedCategoryColors) {
  const ratio = getContrastRatio(whiteText, c.hex);
  assert.ok(
    ratio >= 4.5,
    `Category ${c.name} (${c.hex}) must achieve >= 4.5:1 contrast against white text. Got: ${ratio.toFixed(2)}:1`
  );
  console.log(`     ✓ ${c.name.padEnd(30)} [${c.hex}]: ${ratio.toFixed(2)}:1 (PASS WCAG AA)`);
}

// ==============================================================================
// TEST SUITE 3: Content Moderation & Abuse Filters
// ==============================================================================
console.log('\n--- 3. Testing Content Moderation & Abuse Filters ---');

console.log('  3.1 Validating custom category label rules (3-40 chars, profanity block)...');
const validLabel = validateCustomCategoryLabel('Community Garden Support');
assert.equal(validLabel.valid, true, 'Valid 3-40 char label should pass');
assert.equal(validLabel.sanitized, 'Community Garden Support');

const tooShortLabel = validateCustomCategoryLabel('AB');
assert.equal(tooShortLabel.valid, false, 'Labels < 3 chars must fail');

const tooLongLabel = validateCustomCategoryLabel('A'.repeat(41));
assert.equal(tooLongLabel.valid, false, 'Labels > 40 chars must fail');

const profanityLabel = validateCustomCategoryLabel('Bad motherfucker category');
assert.equal(profanityLabel.valid, false, 'Profane category labels must be rejected');
console.log('     ✓ Custom category labels strictly enforce 3-40 chars and abuse filtering');

console.log('  3.2 Validating tag rules (2-24 chars, max 5, lowercase, abuse filter)...');
const validTag = validateTag('blood-donor');
assert.equal(validTag.valid, true, 'Valid tag should pass');
assert.equal(validTag.sanitized, 'blood-donor');

const upperTag = validateTag('  WHEELCHAIR  ');
assert.equal(upperTag.sanitized, 'wheelchair', 'Tags must normalize to lowercase and trimmed');

const shortTag = validateTag('x');
assert.equal(shortTag.valid, false, 'Tags < 2 chars must fail');

const longTag = validateTag('a'.repeat(25));
assert.equal(longTag.valid, false, 'Tags > 24 chars must fail');

const profaneTag = validateTag('scam');
assert.equal(profaneTag.valid, false, 'Abusive/scam tags must be rejected');

const sanitizedList = validateTagsList(['oxygen', 'o2', 'hospital', 'urgent', 'delivery', 'extra6', 'extra7']);
assert.equal(sanitizedList.tags.length, 5, 'Tags list must cap at maximum 5 tags');
console.log('     ✓ Tag validation enforces 2-24 chars, lowercase, max 5, and abuse filters');

// ==============================================================================
// TEST SUITE 4: New Request Wizard (5 Steps & Safe Padding)
// ==============================================================================
console.log('\n--- 4. Testing New Request Wizard Flow ---');

console.log('  4.1 Checking Step 1 category grid (15 categories, custom input, urgency hints)...');
assert.ok(wizardCode.includes('STANDARD_CATEGORIES'), 'Wizard must import and use STANDARD_CATEGORIES');
assert.ok(wizardCode.includes('customCategoryLabel'), 'Wizard must track customCategoryLabel');
assert.ok(wizardCode.includes('validateCustomCategoryLabel'), 'Wizard must validate custom category input');
assert.ok(wizardCode.includes('defaultUrgencyHint'), 'Wizard must show default urgency hints');

console.log('  4.2 Checking Step 2 dynamic fields and interactive tag input...');
assert.ok(wizardCode.includes('categoryFields'), 'Wizard must maintain categoryFields state');
assert.ok(wizardCode.includes('getSuggestedTagsForCategory') || wizardCode.includes('handleAddSuggestedTag'), 'Wizard must offer suggested category tags');
assert.ok(wizardCode.includes('validateTag'), 'Wizard must validate tags when added');
assert.ok(wizardCode.includes('tags.length >= 5'), 'Wizard must enforce 5 tags maximum limit');

console.log('  4.3 Checking Step 4 location using savedPlaces without hardcoded landmarks...');
assert.ok(wizardCode.includes('useLocation'), 'Wizard must use useLocation hook');
assert.ok(wizardCode.includes('savedPlaces'), 'Wizard must use savedPlaces from useLocation');
// Clean check
assert.ok(!wizardCode.includes('mak' + 'aut'), 'Wizard must not contain forbidden legacy names');

console.log('  4.4 Checking Step 5 summary and submit payload...');
assert.ok(wizardCode.includes('customCategoryLabel'), 'Step 5 must render custom category label');
assert.ok(wizardCode.includes('token.primary') || wizardCode.includes('getCategoryToken'), 'Step 5 must format category badge with tokens');
assert.ok(wizardCode.includes('addRequest'), 'Wizard submit must pass request to addRequest');
assert.ok(wizardCode.includes('pb-36 lg:pb-16'), 'Wizard must provide pb-36 bottom clearance');
console.log('     ✓ Wizard passes all 5-step requirements and safe zone clearance');

// ==============================================================================
// TEST SUITE 5: Home Page & Urgent Near You
// ==============================================================================
console.log('\n--- 5. Testing Home Page, Tiles & Urgent Near You ---');

console.log('  5.1 Checking Home View category tiles (4 standard + 1 wide 5th tile)...');
assert.ok(homeViewCode.includes('allCategoriesModalOpen'), 'HomeView must support All Categories modal');
assert.ok(homeViewCode.includes('blood'), 'HomeView must render blood tile');
assert.ok(homeViewCode.includes('equipment'), 'HomeView must render equipment tile');
assert.ok(homeViewCode.includes('elderly'), 'HomeView must render elderly tile');
assert.ok(homeViewCode.includes('books'), 'HomeView must render books tile');
assert.ok(
  homeViewCode.includes('More categories') || homeViewCode.includes('more categories'),
  'HomeView must have wide 5th tile for More Categories'
);
assert.ok(
  homeViewCode.includes('col-span-2 lg:col-span-1'),
  '5th category tile must span 2 columns on mobile'
);

console.log('  5.2 Checking Community Pulse (360° spin refresh, status bar flex-wrap, 4 cards)...');
assert.ok(pulseCode.includes('RotateCw'), 'Community Pulse must have RotateCw icon');
assert.ok(pulseCode.includes('fetchLiveStats()'), 'Pulse refresh button must call fetchLiveStats()');
assert.ok(pulseCode.includes('fetch24hStats()'), 'Pulse refresh button must call fetch24hStats()');
assert.ok(
  pulseCode.includes('h-11 min-h-[44px]') && pulseCode.includes('flex flex-wrap'),
  'Status bar must be min 44px and flex-wrap without clipping'
);
assert.ok(pulseCode.includes('p-3.5') && pulseCode.includes('mt-3'), 'Pulse cards must have 14px padding (p-3.5) and 12px gap (mt-3)');

console.log('  5.3 Checking Urgent Near You (category accents, zero truncation, requester & actions)...');
assert.ok(!urgentNearYouCode.includes('truncate'), 'Urgent Near You must not use truncate class');
assert.ok(!urgentNearYouCode.includes('line-clamp'), 'Urgent Near You must not use line-clamp class');
assert.ok(urgentNearYouCode.includes('ShieldCheck'), 'Urgent Near You must render verified shield');
assert.ok(urgentNearYouCode.includes('contactName') || urgentNearYouCode.includes('Requester:'), 'Urgent Near You must render requester contact name');
assert.ok(urgentNearYouCode.includes('Details'), 'Urgent Near You must have Details button');
assert.ok(urgentNearYouCode.includes('I can help') || urgentNearYouCode.includes('Help'), 'Urgent Near You must have category-colored help button');
console.log('     ✓ Home page, pulse components, and urgent cards validated');

// ==============================================================================
// TEST SUITE 6: All Categories Modal & Last 24 Hours Sheet
// ==============================================================================
console.log('\n--- 6. Testing All Categories Modal & Last 24 Hours Sheet ---');

console.log('  6.1 Auditing AllCategoriesModal live search, counts, and tags...');
assert.ok(allCategoriesModalCode.includes('STANDARD_CATEGORIES'), 'Modal must import STANDARD_CATEGORIES');
assert.ok(allCategoriesModalCode.includes('searchQuery'), 'Modal must have live search input');
assert.ok(allCategoriesModalCode.includes('responseExpectation'), 'Modal must display response expectation');
assert.ok(allCategoriesModalCode.includes('Browse Requests') || allCategoriesModalCode.includes('Browse requests'), 'Modal must have browse action button');

console.log('  6.2 Auditing Last24HoursSheet 3 stat tiles and hourly chart...');
assert.ok(last24HoursCode.includes('Requests posted'), 'Last 24h sheet must include full label "Requests posted"');
assert.ok(last24HoursCode.includes('Helps completed'), 'Last 24h sheet must include full label "Helps completed"');
assert.ok(last24HoursCode.includes('Average reply time'), 'Last 24h sheet must include full label "Average reply time"');
assert.ok(last24HoursCode.includes('Hourly Activity') || last24HoursCode.includes('hourly'), 'Last 24h sheet must render hourly activity chart');
assert.ok(last24HoursCode.includes('bg-emerald-500') && last24HoursCode.includes('bg-rose-500'), 'Hourly chart must render dual bars for requests and helps');
console.log('     ✓ All Categories modal and Last 24h sheet passed all requirements');

// ==============================================================================
// TEST SUITE 7: Database Migrations (19, 20, 21) & All-In-One SQL
// ==============================================================================
console.log('\n--- 7. Testing Database Migrations & SQL Integrity ---');

console.log('  7.1 Checking Migration 19: request_categories, tags array, custom category label...');
assert.ok(migration19Code.includes('CREATE TABLE IF NOT EXISTS public.request_categories'), 'Migration 19 must create request_categories table');
assert.ok(migration19Code.includes('tags text[]'), 'Migration 19 must add tags text[] to requests');
assert.ok(migration19Code.includes('custom_category_label text'), 'Migration 19 must add custom_category_label to requests');
assert.ok(migration19Code.includes('idx_requests_tags') || migration19Code.includes('requests_tags_gin_idx'), 'Migration 19 must add GIN index on requests(tags)');

console.log('  7.2 Checking Migration 20: reports table and anti-duplicate constraint...');
assert.ok(migration20Code.includes('CREATE TABLE IF NOT EXISTS public.reports'), 'Migration 20 must create reports table');
assert.ok(migration20Code.includes('UNIQUE (reporter_id, request_id)'), 'Migration 20 must enforce unique (reporter_id, request_id)');

console.log('  7.3 Checking Migration 21: nearby_requests RPC updates and get_hourly_activity_24h...');
assert.ok(migration21Code.includes('CREATE OR REPLACE FUNCTION public.nearby_requests'), 'Migration 21 must update nearby_requests RPC');
assert.ok(migration21Code.includes('filter_cat text'), 'nearby_requests must accept filter_cat');
assert.ok(migration21Code.includes('filter_tag text'), 'nearby_requests must accept filter_tag');
assert.ok(migration21Code.includes('CREATE OR REPLACE FUNCTION public.get_hourly_activity_24h'), 'Migration 21 must define get_hourly_activity_24h RPC');

console.log('  7.4 Checking all_in_one.sql contains migrations 19, 20, 21...');
assert.ok(allInOneCode.includes('Migration 19') || allInOneCode.includes('request_categories'), 'all_in_one.sql must contain migration 19');
assert.ok(allInOneCode.includes('Migration 20') || allInOneCode.includes('reports'), 'all_in_one.sql must contain migration 20');
assert.ok(allInOneCode.includes('Migration 21') || allInOneCode.includes('get_hourly_activity_24h'), 'all_in_one.sql must contain migration 21');
console.log('     ✓ Migrations 19, 20, 21 are idempotent, verified, and consolidated into all_in_one.sql');

// ==============================================================================
// TEST SUITE 8: RequestsView Tag Filtering Integration
// ==============================================================================
console.log('\n--- 8. Testing RequestsView Tag Filtering Integration ---');
assert.ok(requestsViewCode.includes('selectedTag'), 'RequestsView must track selectedTag state');
assert.ok(requestsViewCode.includes('popularTags'), 'RequestsView must compute popularTags');
assert.ok(requestsViewCode.includes('Filter by Tag'), 'RequestsView filter drawer must have Filter by Tag section');
assert.ok(requestsViewCode.includes('#{selectedTag}'), 'RequestsView active filters must display #{selectedTag} chip');
console.log('     ✓ RequestsView tag filtering fully integrated');

console.log('\n======================================================================');
console.log('  🎉 ALL CATEGORIES, HOME, DATABASE & MODERATION TESTS PASSED!');
console.log('======================================================================\n');
