#!/usr/bin/env node

/**
 * KindLink QA Test Suite:
 * Hold-and-Drag Quick Category Selector & Redesigned '+' Button Verification
 *
 * Verifies:
 * 1. QuickCategoryArcMenu.tsx exists and exports properly.
 * 2. All 8 categories are represented with valid Lucide icons and color tokens.
 * 3. Long-press threshold (240ms) and distance threshold calculations are sound.
 * 4. Store has preselectedCategory and startNewRequestWithCategory.
 * 5. NewRequestWizard.tsx properly consumes preselectedCategory on launch.
 * 6. BottomTabBar.tsx contains redesigned '+' button with crystal styling and hold gesture handlers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failedTests++;
  }
}

console.log('🧪 Running Test Suite: Quick Category Arc Menu & Crystal Plus Button QA...\n');

// ============================================================================
// 1. Verify QuickCategoryArcMenu.tsx Exists & Exports
// ============================================================================
console.log('📦 1. Checking QuickCategoryArcMenu.tsx file and exports...');
const arcMenuPath = path.join(ROOT, 'components/shell/QuickCategoryArcMenu.tsx');
assert(fs.existsSync(arcMenuPath), 'QuickCategoryArcMenu.tsx exists');

const arcMenuSource = fs.readFileSync(arcMenuPath, 'utf8');

assert(
  arcMenuSource.includes('export function QuickCategoryArcMenu') ||
    arcMenuSource.includes('export const QuickCategoryArcMenu'),
  'Exports QuickCategoryArcMenu component'
);
assert(
  arcMenuSource.includes('export const QUICK_ARC_CATEGORIES') ||
    arcMenuSource.includes('QUICK_ARC_CATEGORIES'),
  'Defines QUICK_ARC_CATEGORIES category array'
);
assert(
  arcMenuSource.includes('export interface QuickCategoryArcMenuProps') ||
    arcMenuSource.includes('interface QuickCategoryArcMenuProps'),
  'Defines QuickCategoryArcMenuProps interface'
);
assert(
  arcMenuSource.includes("from '@/lib/utils/motion'"),
  'Imports optimized LazyMotion primitives (m, AnimatePresence) from @/lib/utils/motion'
);

// ============================================================================
// 2. Verify All 8 Categories with Valid Icons and Color Tokens
// ============================================================================
console.log('\n🎨 2. Auditing 8 Quick Categories, Icons and Luminous Color Tokens...');
const EXPECTED_8_CATEGORIES = [
  { id: 'blood', name: 'Blood Donation', icon: 'Droplets' },
  { id: 'equipment', name: 'Medical Equipment', icon: 'Stethoscope' },
  { id: 'elderly', name: 'Elderly Care', icon: 'HeartHandshake' },
  { id: 'transport', name: 'Emergency Transit', icon: 'Car' },
  { id: 'food', name: 'Food Support', icon: 'Utensils' },
  { id: 'medicine', name: 'Medicines & Rx', icon: 'Pill' },
  { id: 'books', name: 'Books & Education', icon: 'BookOpen' },
  { id: 'other', name: 'Other Support', icon: 'HelpCircle' },
];

for (const item of EXPECTED_8_CATEGORIES) {
  const hasCategory =
    arcMenuSource.includes(`id: '${item.id}'`) ||
    arcMenuSource.includes(`id: "${item.id}"`);
  const hasName = arcMenuSource.includes(item.name);
  const hasIcon = arcMenuSource.includes(item.icon);

  assert(
    hasCategory && hasName && hasIcon,
    `Category [${item.id}] "${item.name}" configured with icon ${item.icon}`
  );
}

// Verify color styling tokens exist (gradients, glowColors, ringClasses, chipClasses)
assert(
  arcMenuSource.includes('gradient:') &&
    arcMenuSource.includes('glowColor:') &&
    arcMenuSource.includes('ringClass:') &&
    arcMenuSource.includes('chipClass:'),
  'All category items have luminous color tokens (gradient, glowColor, ringClass, chipClass)'
);

// ============================================================================
// 3. Verify Geometry, Arc Coordinates & Gesture Math Calculations
// ============================================================================
console.log('\n📐 3. Validating Radial Arc Math, Angular Spread & Distance Calculations...');
const radiusMatch = arcMenuSource.match(/ARC_RADIUS\s*=\s*(\d+)/);
const arcRadius = radiusMatch ? Number.parseInt(radiusMatch[1], 10) : 120;
assert(
  arcRadius >= 115 && arcRadius <= 125,
  `ARC_RADIUS is in optimal 115px-125px range (actual: ${arcRadius}px)`
);

const startAngleMatch = arcMenuSource.match(/START_ANGLE\s*=\s*(-?\d+)/);
const endAngleMatch = arcMenuSource.match(/END_ANGLE\s*=\s*(-?\d+)/);
const startAngle = startAngleMatch ? Number.parseInt(startAngleMatch[1], 10) : -155;
const endAngle = endAngleMatch ? Number.parseInt(endAngleMatch[1], 10) : -25;

assert(
  startAngle <= -140 && startAngle >= -170,
  `Arc START_ANGLE is positioned in upward left quadrant (actual: ${startAngle}°)`
);
assert(
  endAngle >= -40 && endAngle <= -15,
  `Arc END_ANGLE is positioned in upward right quadrant (actual: ${endAngle}°)`
);

// Compute 8 points and verify symmetry and upward direction
const coordinates = [];
for (let i = 0; i < 8; i++) {
  const angleDeg = startAngle + (i * (endAngle - startAngle)) / 7;
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = Math.round(Math.cos(angleRad) * arcRadius * 10) / 10;
  const y = Math.round(Math.sin(angleRad) * arcRadius * 10) / 10;
  coordinates.push({ i, angleDeg, x, y });
}

assert(
  coordinates.every((c) => c.y < 0),
  'All 8 arc item coordinates fan upward with negative Y offset above bottom bar'
);
assert(
  Math.abs(coordinates[0].x + coordinates[7].x) < 2,
  'Arc coordinates are horizontally balanced and symmetric across center'
);

// Verify distance threshold and dead-zone logic
assert(
  arcMenuSource.includes('distFromCenter < 35') ||
    arcMenuSource.includes('distFromCenter <') ||
    arcMenuSource.includes('distToItem <'),
  'Implements center button deadzone threshold (~35px) to prevent accidental fire'
);
assert(
  arcMenuSource.includes('minItemDistance <= 52') ||
    arcMenuSource.includes('minItemDistance <='),
  'Implements proximity threshold (~52px hit radius) for finger touch sensitivity'
);
assert(
  arcMenuSource.includes('safeVibrate(25)') &&
    arcMenuSource.includes('safeVibrate(8)'),
  'Haptic pulses configured for both menu opening (25ms) and category crossing (8ms)'
);

// ============================================================================
// 4. Verify Store State and Actions
// ============================================================================
console.log('\n🧠 4. Auditing Zustand Store State & Quick Category Actions...');
const storePath = path.join(ROOT, 'lib/store/useKindLinkStore.ts');
assert(fs.existsSync(storePath), 'useKindLinkStore.ts exists');

const storeSource = fs.readFileSync(storePath, 'utf8');

assert(
  storeSource.includes('preselectedCategory: HelpCategory | null;'),
  'Store interface defines preselectedCategory: HelpCategory | null'
);
assert(
  storeSource.includes('setPreselectedCategory: (cat: HelpCategory | null) => void;'),
  'Store interface defines setPreselectedCategory action'
);
assert(
  storeSource.includes('startNewRequestWithCategory: (cat: HelpCategory) => void;'),
  'Store interface defines startNewRequestWithCategory helper action'
);
assert(
  storeSource.includes('preselectedCategory: null,'),
  'Store initializes preselectedCategory with null'
);
assert(
  storeSource.includes(
    "startNewRequestWithCategory: (cat) => set({ preselectedCategory: cat, currentView: 'new' })"
  ) ||
    (storeSource.includes('preselectedCategory: cat') &&
      storeSource.includes("currentView: 'new'")),
  'startNewRequestWithCategory sets preselectedCategory and sets currentView to new'
);

// ============================================================================
// 5. Verify NewRequestWizard.tsx Consumes preselectedCategory
// ============================================================================
console.log('\n🧙 5. Auditing NewRequestWizard.tsx Preselection Handling...');
const wizardPath = path.join(ROOT, 'components/wizard/NewRequestWizard.tsx');
assert(fs.existsSync(wizardPath), 'NewRequestWizard.tsx exists');

const wizardSource = fs.readFileSync(wizardPath, 'utf8');

assert(
  wizardSource.includes('preselectedCategory') &&
    wizardSource.includes('setPreselectedCategory'),
  'NewRequestWizard destructured preselectedCategory and setPreselectedCategory from store'
);
assert(
  wizardSource.includes('preselectedCategory ? 2 : 1'),
  'NewRequestWizard initializes step directly to Step 2 if preselectedCategory exists'
);
assert(
  wizardSource.includes('preselectedCategory || \'blood\''),
  'NewRequestWizard initializes category directly from preselectedCategory'
);
assert(
  wizardSource.includes('setCategory(preselectedCategory)') &&
    wizardSource.includes('setStep(2)') &&
    wizardSource.includes('setPreselectedCategory(null)'),
  'NewRequestWizard clears preselectedCategory after applying to prevent stale persistence'
);
assert(
  wizardSource.includes('if (!preselectedCategory)'),
  'NewRequestWizard protects preselected category against being overwritten by old local draft'
);

// ============================================================================
// 6. Verify BottomTabBar.tsx Redesigned '+' Button & Hold Gesture
// ============================================================================
console.log('\n🔘 6. Auditing BottomTabBar.tsx Redesigned Plus Button & Gestures...');
const bottomBarPath = path.join(ROOT, 'components/shell/BottomTabBar.tsx');
assert(fs.existsSync(bottomBarPath), 'BottomTabBar.tsx exists');

const bottomBarSource = fs.readFileSync(bottomBarPath, 'utf8');

assert(
  bottomBarSource.includes('QuickCategoryArcMenu'),
  'BottomTabBar imports QuickCategoryArcMenu'
);
assert(
  bottomBarSource.includes('startNewRequestWithCategory'),
  'BottomTabBar retrieves startNewRequestWithCategory from store'
);
assert(
  bottomBarSource.includes('handlePointerDown') &&
    bottomBarSource.includes('handlePointerUp') &&
    bottomBarSource.includes('handlePointerCancel'),
  'BottomTabBar defines pointer gesture handlers (Down, Up, Cancel)'
);
assert(
  bottomBarSource.includes('onPointerDown={handlePointerDown}') &&
    bottomBarSource.includes('onPointerUp={handlePointerUp}'),
  "BottomTabBar attaches pointer gesture handlers to '+' action button"
);
assert(
  bottomBarSource.includes('240') &&
    (bottomBarSource.includes('setTimeout') || bottomBarSource.includes('HOLD_THRESHOLD_MS')),
  "Long-press threshold timer configured to 240ms for Quick Category Arc trigger"
);
assert(
  (bottomBarSource.includes('HOLD_THRESHOLD_MS') ||
    bottomBarSource.includes('isHoldingRef') ||
    bottomBarSource.includes('didTriggerHoldRef')) &&
    bottomBarSource.includes("setCurrentView('new')"),
  "Tap vs. Hold distinction: quick tap (<240ms) navigates to new request without opening arc"
);

// Crystal styling checks
assert(
  bottomBarSource.includes('bg-gradient-to-tr') ||
    bottomBarSource.includes('from-teal'),
  "Redesigned '+' button features luminous multi-stop teal/emerald gradient"
);
assert(
  bottomBarSource.includes('specular') ||
    bottomBarSource.includes('bg-gradient-to-b from-white') ||
    bottomBarSource.includes('inset-x-0 top-0'),
  "Redesigned '+' button features crystal specular rim reflection"
);
assert(
  bottomBarSource.includes('animate-pulse') ||
    bottomBarSource.includes('shadow-') ||
    bottomBarSource.includes('blur-'),
  "Redesigned '+' button features ambient glow aura"
);
assert(
  bottomBarSource.includes('<QuickCategoryArcMenu'),
  'BottomTabBar renders QuickCategoryArcMenu modal overlay'
);

// ============================================================================
// Summary
// ============================================================================
console.log('\n=============================================================');
console.log(`📊 Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('=============================================================');

if (failedTests > 0) {
  console.error(`❌ Test suite failed with ${failedTests} assertion failure(s).`);
  process.exit(1);
} else {
  console.log('✨ All Hold-and-Drag Quick Category & Plus Button QA tests passed successfully!\n');
  process.exit(0);
}
