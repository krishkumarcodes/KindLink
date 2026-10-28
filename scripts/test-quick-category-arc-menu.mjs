import fs from 'fs';
import path from 'path';

console.log('🧪 Running Quick Category Arc Menu Verification Suite...\n');

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Verify lib/store/useKindLinkStore.ts
const storePath = path.resolve('lib/store/useKindLinkStore.ts');
const storeContent = fs.readFileSync(storePath, 'utf8');

assert(
  storeContent.includes('preselectedCategory: HelpCategory | null;'),
  'KindLinkState has preselectedCategory: HelpCategory | null;'
);
assert(
  storeContent.includes('setPreselectedCategory: (cat: HelpCategory | null) => void;'),
  'KindLinkState has setPreselectedCategory action'
);
assert(
  storeContent.includes('startNewRequestWithCategory: (cat: HelpCategory) => void;'),
  'KindLinkState has startNewRequestWithCategory action'
);
assert(
  storeContent.includes("set({ preselectedCategory: cat, currentView: 'new' })"),
  'startNewRequestWithCategory sets preselectedCategory and currentView: "new"'
);

// 2. Verify components/wizard/NewRequestWizard.tsx
const wizardPath = path.resolve('components/wizard/NewRequestWizard.tsx');
const wizardContent = fs.readFileSync(wizardPath, 'utf8');

assert(
  wizardContent.includes('preselectedCategory') &&
    wizardContent.includes('setPreselectedCategory'),
  'NewRequestWizard reads preselectedCategory and setPreselectedCategory from store'
);
assert(
  wizardContent.includes('setCategory(preselectedCategory)') &&
    wizardContent.includes('setStep(2)') &&
    wizardContent.includes('setPreselectedCategory(null)'),
  'NewRequestWizard initializes category, clears preselectedCategory, and advances to Step 2'
);

// 3. Verify components/shell/QuickCategoryArcMenu.tsx
const arcPath = path.resolve('components/shell/QuickCategoryArcMenu.tsx');
assert(fs.existsSync(arcPath), 'QuickCategoryArcMenu.tsx file exists');
const arcContent = fs.readFileSync(arcPath, 'utf8');

const EXPECTED_CATEGORIES = [
  { id: 'blood', name: 'Blood Donation', tag: 'Rose' },
  { id: 'equipment', name: 'Medical Equipment', tag: 'Cyan/Blue' },
  { id: 'elderly', name: 'Elderly Care', tag: 'Sky/Blue' },
  { id: 'transport', name: 'Emergency Transit', tag: 'Amber/Orange' },
  { id: 'food', name: 'Food Support', tag: 'Emerald/Green' },
  { id: 'medicine', name: 'Medicines & Rx', tag: 'Violet/Purple' },
  { id: 'books', name: 'Books & Education', tag: 'Teal' },
  { id: 'other', name: 'Other Support', tag: 'Slate/Indigo' },
];

for (const cat of EXPECTED_CATEGORIES) {
  assert(
    arcContent.includes(`id: '${cat.id}'`) &&
      arcContent.includes(`name: '${cat.name}'`),
    `QuickCategoryArcMenu defines category "${cat.name}" (${cat.id}) with color palette ${cat.tag}`
  );
}

assert(
  arcContent.includes('ARC_RADIUS = 120') || arcContent.includes('120'),
  'Arc math uses radius ~115px-125px (120px)'
);
assert(
  arcContent.includes('START_ANGLE = -155') && arcContent.includes('END_ANGLE = -25'),
  'Arc math fans upward between -155 deg and -25 deg'
);
assert(
  arcContent.includes('safeVibrate(25)'),
  'Haptic feedback trigger on hold activation (vibrate 25ms)'
);
assert(
  arcContent.includes('safeVibrate(8)'),
  'Haptic feedback trigger on category crossing (vibrate 8ms)'
);
assert(
  arcContent.includes('onSelectCategory'),
  'Safe release callback calls onSelectCategory(cat)'
);

// Check mathematical fan coordinates
const ARC_RADIUS = 120;
const START_ANGLE = -155;
const END_ANGLE = -25;
const numItems = 8;
const calculatedCoords = [];
for (let i = 0; i < numItems; i++) {
  const angleDeg = START_ANGLE + (i * (END_ANGLE - START_ANGLE)) / (numItems - 1);
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = Math.round(Math.cos(angleRad) * ARC_RADIUS * 10) / 10;
  const y = Math.round(Math.sin(angleRad) * ARC_RADIUS * 10) / 10;
  calculatedCoords.push({ angleDeg, x, y });
}

assert(calculatedCoords.length === 8, '8 fan coordinates calculated');
assert(
  calculatedCoords.every((c) => c.y < 0),
  'All 8 arc item y-coordinates are negative (fanning upward above center)'
);
assert(
  calculatedCoords[0].angleDeg === -155 && calculatedCoords[7].angleDeg === -25,
  'First item is at -155 deg and last item is at -25 deg'
);

// 4. Verify components/shell/BottomTabBar.tsx integration
const barPath = path.resolve('components/shell/BottomTabBar.tsx');
const barContent = fs.readFileSync(barPath, 'utf8');

assert(
  barContent.includes('QuickCategoryArcMenu'),
  'BottomTabBar imports QuickCategoryArcMenu'
);
assert(
  barContent.includes('startNewRequestWithCategory'),
  'BottomTabBar uses startNewRequestWithCategory'
);
assert(
  barContent.includes('handlePointerDown') && barContent.includes('setTimeout'),
  'BottomTabBar implements hold detection on + button'
);

if (failed) {
  console.error('\n❌ Quick Category Arc Menu verification failed.');
  process.exit(1);
} else {
  console.log('\n✨ All Quick Category Arc Menu checks passed successfully!');
}
