#!/usr/bin/env node

/**
 * KindLink Test Suite: Shared Overlay System & iOS Safari Body Scroll Lock
 *
 * Verifies:
 * 1. OverlayPortal implements strict iOS Safari fixed-position body scroll lock:
 *    - body { position: fixed; top: -${scrollY}px; width: 100%; overflow: hidden; }
 *    - window.scrollTo(0, savedScrollY) restoration
 * 2. Unification into single solid surfaces (solid bg-card, no translucent top bands / bg-card/90 / bg-card/95)
 * 3. Mobile drag handle integrated inside the header component
 * 4. Height boundary constraint max-h-[85dvh]
 * 5. overscroll-contain on modal / sheet body scroll containers
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

console.log('🧪 Running Test Suite: Shared Overlays & iOS Safari Scroll Lock...\n');

// -------------------------------------------------------------
// Test 1: OverlayPortal body scroll lock implementation
// -------------------------------------------------------------
console.log('📦 1. Checking OverlayPortal scroll lock mechanics...');
const overlayPortalPath = path.join(ROOT, 'components/ui/OverlayPortal.tsx');
assert(fs.existsSync(overlayPortalPath), 'OverlayPortal.tsx exists');

const overlayPortalSource = fs.readFileSync(overlayPortalPath, 'utf8');

assert(
  overlayPortalSource.includes('export function useBodyScrollLock'),
  'Exports useBodyScrollLock hook'
);

assert(
  overlayPortalSource.includes("document.body.style.position = 'fixed'") &&
  overlayPortalSource.includes("document.body.style.width = '100%'") &&
  overlayPortalSource.includes("document.body.style.top = `-${savedScrollY}px`"),
  'Strict iOS Safari fixed-position body lock is implemented with negative scroll offset'
);

assert(
  overlayPortalSource.includes('window.scrollTo(0, savedScrollY)'),
  'Exact scroll position is restored on close via window.scrollTo'
);

assert(
  overlayPortalSource.includes('overscroll-contain'),
  'OverlayPortal modal and popover surfaces use overscroll-contain'
);

// -------------------------------------------------------------
// Test 2: Single Solid Surface & No Translucent Top Bands
// -------------------------------------------------------------
console.log('\n🎨 2. Checking Overlay Surfaces for Clean Single Solid bg-card...');

const overlaysToCheck = [
  'components/shell/LocationModal.tsx',
  'components/home/Last24HoursSheet.tsx',
  'components/profile/BadgeDetailSheet.tsx',
  'components/profile/BadgePinningModal.tsx',
  'components/requests/HelpFlowModal.tsx',
];

for (const relPath of overlaysToCheck) {
  const filePath = path.join(ROOT, relPath);
  assert(fs.existsSync(filePath), `${relPath} exists`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify container surface uses bg-card text-card-foreground
  const hasSolidCardContainer = content.includes('bg-card text-card-foreground') || content.includes('bg-card');
  assert(hasSolidCardContainer, `${relPath} container uses solid bg-card`);

  // Verify sticky headers do not have translucent bg-card/90 or bg-card/95
  const hasTranslucentHeader = /header[^>]*bg-card\/(90|95)/i.test(content) || /sticky[^>]*bg-card\/(90|95)/i.test(content);
  assert(!hasTranslucentHeader, `${relPath} header has no translucent see-through band (bg-card/90, bg-card/95)`);

  // Verify overscroll-contain
  const hasOverscrollContain = content.includes('overscroll-contain');
  assert(hasOverscrollContain, `${relPath} body scroll container has overscroll-contain`);

  // Verify dvh bound (max-h-[85dvh] or dvh constraint)
  const hasDvhBound = content.includes('85dvh');
  assert(hasDvhBound, `${relPath} uses 85dvh bounds constraint`);
}

// -------------------------------------------------------------
// Test 3: Integrated Drag Handle
// -------------------------------------------------------------
console.log('\n🎯 3. Checking Drag Handle Placement...');

// LocationModal, Last24HoursSheet, BadgeDetailSheet must have drag handle inside the header
for (const relPath of ['components/shell/LocationModal.tsx', 'components/home/Last24HoursSheet.tsx', 'components/profile/BadgeDetailSheet.tsx']) {
  const filePath = path.join(ROOT, relPath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Find index of sticky header
  const headerIdx = content.indexOf('sticky top-0');
  const hasDragHandleInHeader = /sticky top-0[\s\S]{1,300}bg-muted-foreground\/30/.test(content);

  assert(
    headerIdx !== -1 && hasDragHandleInHeader,
    `${relPath} mobile drag handle is positioned inside the sticky header container`
  );
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('🎉 All Shared Overlay System tests passed successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Some tests failed.');
  process.exit(1);
}
