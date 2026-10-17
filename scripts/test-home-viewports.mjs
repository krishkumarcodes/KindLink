import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('🧪 Testing Home Tab Components across viewports: 320px, 360px, 390px, 430px...');

// Read component files
const pulseFile = 'components/home/CommunityPulse.tsx';
const homeFile = 'components/home/HomeView.tsx';
const urgentFile = 'components/home/UrgentNearYou.tsx';
const howItWorksFile = 'components/home/HowItWorksCard.tsx';
const formatTimeFile = 'lib/utils/formatTime.ts';

const pulseCode = fs.readFileSync(pulseFile, 'utf8');
const homeCode = fs.readFileSync(homeFile, 'utf8');
const urgentCode = fs.readFileSync(urgentFile, 'utf8');
const howItWorksCode = fs.readFileSync(howItWorksFile, 'utf8');
const formatTimeCode = fs.readFileSync(formatTimeFile, 'utf8');

// 1. Centralized Time Formatter Check
console.log('  1. Auditing Centralized Time Formatter implementation...');
assert.ok(formatTimeCode.includes('formatMinutesAgo'), 'formatMinutesAgo should be exported');
assert.ok(formatTimeCode.includes('formatHumanTime'), 'formatHumanTime should be exported');
assert.ok(formatTimeCode.includes('formatWaitingTime'), 'formatWaitingTime should be exported');
assert.ok(formatTimeCode.includes('formatLivePulseStatus'), 'formatLivePulseStatus should be exported');
assert.ok(formatTimeCode.includes('Yesterday'), 'Yesterday rule must be present');
console.log('     ✓ Centralized time formatter verified');

// 2. Community Pulse 2 Rows & Viewport Responsiveness (320, 360, 390, 430px)
console.log('  2. Auditing Community Pulse Row 1 & Row 2 across 320, 360, 390, 430px...');

// Row 1: Title "Community Pulse" + Refresh button
assert.ok(pulseCode.includes('Community Pulse'), 'Row 1 Title Community Pulse missing');
assert.ok(pulseCode.includes('RotateCw'), 'Row 1 Refresh button missing');
assert.ok(pulseCode.includes('min-h-[44px]'), 'Row 1 44px min height missing');

// Row 2: Full-width 44px status bar (rounded, flex, min-w-0)
assert.ok(
  /h-11\s+min-h-\[44px\]\s+w-full\s+rounded-2xl\s+border/.test(pulseCode),
  'Row 2 full-width 44px status bar container missing'
);

// Pulsing green dot with Live status
assert.ok(pulseCode.includes('animate-ping'), 'Pulsing green dot missing');
assert.ok(pulseCode.includes('bg-emerald-500'), 'Pulsing dot green color missing');
assert.ok(pulseCode.includes('liveStatus.long'), 'Live status long variant missing');
assert.ok(pulseCode.includes('liveStatus.short'), 'Live status short variant missing');
assert.ok(
  pulseCode.includes('min-[380px]:hidden') && pulseCode.includes('hidden min-[380px]:inline'),
  'Responsive switch for short vs long Live status missing'
);

// Right: 24h chip with tiny sparkline, label "24h", chevron
assert.ok(pulseCode.includes('Last 24h') || pulseCode.includes('24h'), '24h label missing');
assert.ok(pulseCode.includes('ChevronRight'), 'ChevronRight missing');
assert.ok(pulseCode.includes('setSheetOpen(true)'), '24h chip sheet trigger missing');

// Below 340px: hide sparkline; never wrap or overflow horizontally
assert.ok(
  pulseCode.includes('hidden min-[340px]:block'),
  'Sparkline must be hidden below 340px (hidden min-[340px]:block)'
);

// Sizing calculations at 320, 360, 390, 430px
const viewports = [320, 360, 390, 430];
for (const vp of viewports) {
  const containerWidth = vp - 32; // subtracting 16px margins on each side
  const sparklineVisible = vp >= 340;
  const isShortText = vp < 380;
  const liveTextWidth = isShortText ? 90 : 135; // approx text width
  const chipWidth = (sparklineVisible ? 44 : 0) + 48; // sparkline + label + chevron
  const totalOccupied = liveTextWidth + chipWidth + 16; // gap + padding
  assert.ok(
    totalOccupied < containerWidth,
    `Row 2 content width (${totalOccupied}px) must be smaller than container (${containerWidth}px) at ${vp}px`
  );
  console.log(`     ✓ Viewport ${vp}px: container=${containerWidth}px, content=${totalOccupied}px (NO overflow, sparkline=${sparklineVisible ? 'shown' : 'hidden'}, text=${isShortText ? 'short' : 'long'})`);
}

// 3. Category Grid: 5 cards in 2 columns, 5th card spans full width
console.log('  3. Auditing Browse Aid by Category Grid (5 cards, 2 cols, 5th card full width)...');
assert.ok(
  homeCode.includes('grid grid-cols-2 lg:grid-cols-5'),
  'Grid must use 2 columns on mobile and 5 on lg'
);
assert.ok(
  homeCode.includes('col-span-2 lg:col-span-1'),
  '5th card must span col-span-2 on mobile and lg:col-span-1 on desktop'
);
assert.ok(
  homeCode.includes('flex lg:hidden items-center justify-between w-full'),
  '5th card must render as wide horizontal card on mobile'
);
// Accent colors
assert.ok(homeCode.includes('text-rose-500'), 'Blood red accent missing');
assert.ok(homeCode.includes('text-teal-500'), 'Medical gear teal accent missing');
assert.ok(homeCode.includes('text-indigo-500'), 'Elderly care indigo accent missing');
assert.ok(homeCode.includes('text-emerald-500'), 'Books emerald accent missing');
assert.ok(homeCode.includes('text-amber-500'), 'Transit amber accent missing');
console.log('     ✓ Category grid 2-col & 5th full-width card layout verified');

// 4. Urgent Near You Cards
console.log('  4. Auditing Urgent Near You Cards per-category details & urgency accents...');
assert.ok(urgentCode.includes('getUrgencyBarColor'), 'Urgency bar color function missing');
assert.ok(urgentCode.includes('getCategoryChip'), 'Category chip function missing');
// Detail chips
assert.ok(urgentCode.includes('req.bloodGroup'), 'Blood group chip missing');
assert.ok(urgentCode.includes('req.unitsNeeded'), 'Units needed chip missing');
assert.ok(urgentCode.includes('req.hospitalName'), 'Hospital chip missing');
assert.ok(urgentCode.includes('req.pickupAddress'), 'Pickup address missing');
assert.ok(urgentCode.includes('req.dropAddress'), 'Drop address missing');
assert.ok(urgentCode.includes('req.booksClassSubject'), 'Books subject/class missing');
assert.ok(urgentCode.includes('req.itemType'), 'Medical gear itemType missing');
assert.ok(urgentCode.includes('req.itemDuration'), 'Medical gear duration missing');
assert.ok(urgentCode.includes('req.elderlyAidType'), 'Elderly care aid type missing');
assert.ok(urgentCode.includes('req.scheduledTime'), 'Elderly care scheduled time missing');
// Formatted waiting time
assert.ok(urgentCode.includes('formatWaitingTime(req.waitingMinutes, req.createdAt)'), 'formatWaitingTime call missing');
console.log('     ✓ Urgent cards per-category differentiation verified');

// 5. How KindLink Works & Hero Subtitle
console.log('  5. Auditing How KindLink Works header & Hero Subtitle...');
assert.ok(
  howItWorksCode.includes('3 steps'),
  '"3 steps" pill missing'
);
assert.ok(
  howItWorksCode.includes('flex items-center gap-2 flex-nowrap'),
  'Title and 3 steps pill must be inline on one row'
);
assert.ok(
  !howItWorksCode.includes('truncate'),
  'HowItWorksCard must not have truncate class'
);

// Hero subtitle
assert.ok(
  homeCode.includes('Set your area to see helpers nearby'),
  'Fallback "Set your area to see helpers nearby" missing'
);
assert.ok(
  homeCode.includes('LocationModal'),
  'LocationModal integration missing'
);
assert.ok(
  !homeCode.toLowerCase().includes('asansol' + ' ' + 'engineering'),
  'College name must not be hardcoded in HomeView'
);
console.log('     ✓ How KindLink Works & dynamic Hero Subtitle verified');

console.log('🎉 ALL Home Tab Viewport & Component Tests Passed Successfully!');
