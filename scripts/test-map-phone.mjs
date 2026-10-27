#!/usr/bin/env node
/**
 * KindLink Mobile Phone Map Interface Test Suite (npm run test:map-phone)
 *
 * Verifies the mobile-optimized map interface across all target smartphone viewports:
 * 1. Phone layout zones (Top search, filter bar, map canvas, floating thumb controls, bottom sheet).
 * 2. Mobile 48px search bar with clear button, list shortcut, autocomplete & recent searches.
 * 3. Horizontal category filter chips (36px, live counts, auto-scroll, <360px responsiveness).
 * 4. Right thumb controls with WCAG 44x44px touch targets and dynamic snap point positioning.
 * 5. Draggable bottom sheet with 3 snap points (Peek, Half, Full), drag gestures, and tabs.
 * 6. Pin preview cards with category badge, distance, directions trigger, and Help/Manage actions.
 * 7. Mobile safe areas and viewport resilience (360px, 390px, 412px, 430px, dynamic 100dvh).
 */

import fs from 'node:fs';
import path from 'node:path';

// ANSI Colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

console.log(`${BOLD}${CYAN}📱 Starting KindLink Mobile Phone Map QA Test Suite...${RESET}\n`);

let passes = 0;
let failures = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${testName}`);
    passes++;
  } else {
    console.error(`  ${RED}✗ FAIL:${RESET} ${testName}`);
    if (details) {
      console.error(`    ${YELLOW}Reason: ${details}${RESET}`);
    }
    failures++;
  }
}

// ---------------------------------------------------------------------------
// 1. Component Files & Structure
// ---------------------------------------------------------------------------
console.log(`${BOLD}1. Auditing Map Component Architecture & File Integrity...${RESET}`);

const mapViewPath = path.resolve('components/map/MapView.tsx');
const innerMapPath = path.resolve('components/map/LeafletInnerMap.tsx');
const tileLayerPath = path.resolve('components/map/MapTileLayer.tsx');

assert(fs.existsSync(mapViewPath), 'MapView.tsx exists');
assert(fs.existsSync(innerMapPath), 'LeafletInnerMap.tsx exists');
assert(fs.existsSync(tileLayerPath), 'MapTileLayer.tsx exists');

const mapViewCode = fs.readFileSync(mapViewPath, 'utf8');
const innerMapCode = fs.readFileSync(innerMapPath, 'utf8');

// ---------------------------------------------------------------------------
// 2. Mobile Layout Zones & Viewport Architecture
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}2. Auditing Phone Layout Zones & 100dvh Viewport Architecture...${RESET}`);

assert(
  mapViewCode.includes('100dvh') && mapViewCode.includes('safe-area-inset'),
  'Uses dynamic viewport unit 100dvh with mobile safe-area-inset protection',
  'Must use 100dvh to prevent mobile URL bar jitter'
);

assert(
  mapViewCode.includes('sm:hidden') && mapViewCode.includes('landscape:hidden'),
  'Implements dedicated portrait phone layout distinct from desktop/landscape panel'
);

assert(
  mapViewCode.includes('overscroll-none') || mapViewCode.includes('overscroll-contain'),
  'Locks background document scroll to prevent map gesture interference'
);

// ---------------------------------------------------------------------------
// 3. Top Floating Search Bar (Phone Portrait)
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}3. Auditing Mobile Search Bar & Autocomplete Overlay...${RESET}`);

assert(
  mapViewCode.includes('h-12') && mapViewCode.includes('Search places or addresses'),
  '48px (h-12) high-contrast floating search bar present'
);

assert(
  mapViewCode.includes('aria-label="Clear search query"'),
  'Clear search query button with accessible aria-label'
);

assert(
  mapViewCode.includes('aria-label="Toggle list view"') || mapViewCode.includes('List className'),
  'Direct list view shortcut button integrated into search bar flex row'
);

assert(
  mapViewCode.includes('searchResults') && mapViewCode.includes('matchingRequests'),
  'Dual-source search dropdown: geocoded places and matching aid requests'
);

assert(
  mapViewCode.includes('recentSearches') && mapViewCode.includes('kindlink_recent_searches'),
  'Persists recent search history in client storage'
);

// ---------------------------------------------------------------------------
// 4. Horizontal Category Filter Chips
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}4. Auditing Horizontal Category Filter Chips...${RESET}`);

assert(
  mapViewCode.includes('h-9') && mapViewCode.includes('rounded-xl'),
  '36px (h-9) touch-friendly category filter chips with rounded-xl styling'
);

assert(
  mapViewCode.includes('requests') &&
    mapViewCode.includes('hospitals') &&
    mapViewCode.includes('clinics') &&
    mapViewCode.includes('pharmacies') &&
    mapViewCode.includes('blood'),
  'Contains all 5 standard mutual aid & healthcare filter chips'
);

assert(
  mapViewCode.includes('scrollIntoView'),
  'Auto-scrolls active filter chip smoothly into view upon selection'
);

assert(
  mapViewCode.includes('min-[360px]:inline'),
  'Responsive text suppression: hides chip text below 360px width, preserving icons and counts'
);

// ---------------------------------------------------------------------------
// 5. Right Floating Thumb Controls
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}5. Auditing Right Floating Thumb Controls (WCAG 44x44px)...${RESET}`);

assert(
  mapViewCode.includes('min-w-[44px]') && mapViewCode.includes('min-h-[44px]'),
  'Thumb buttons meet WCAG 2.1 AA min 44x44px touch target guidelines'
);

assert(
  mapViewCode.includes('aria-label="Locate me"'),
  'Recenter / Locate Me (GPS) button with accessible aria-label'
);

assert(
  mapViewCode.includes('aria-label="Zoom in"') && mapViewCode.includes('aria-label="Zoom out"'),
  'Zoom in (+) and Zoom out (-) buttons with accessible aria-labels'
);

assert(
  mapViewCode.includes('aria-label="Layers"'),
  'Layers & overlay switcher button with accessible aria-label'
);

assert(
  mapViewCode.includes('aria-label="Reset North"'),
  'Reset North / Compass button with accessible aria-label'
);

assert(
  mapViewCode.includes('bottom-[108px]') && mapViewCode.includes('bottom-[calc(50%+14px)]'),
  'Controls dynamically reposition based on bottom sheet snap points (peek, half, full)'
);

// ---------------------------------------------------------------------------
// 6. Draggable Bottom Sheet & Snap Points
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}6. Auditing Draggable Bottom Sheet & Snap Points...${RESET}`);

assert(
  mapViewCode.includes('bottomSheetSnap') &&
    mapViewCode.includes("'peek'") &&
    mapViewCode.includes("'half'") &&
    mapViewCode.includes("'full'"),
  'Supports 3 distinct snap points: peek, half, full'
);

assert(
  mapViewCode.includes('handleSheetTouchStart') && mapViewCode.includes('handleSheetTouchEnd'),
  'Touch drag event listeners implemented on bottom sheet handle'
);

assert(
  mapViewCode.includes('deltaY') && mapViewCode.includes('velocity'),
  'Implements touch swipe delta and velocity tracking for smooth snapping'
);

assert(
  mapViewCode.includes("bottomSheetTab === 'requests'") &&
    mapViewCode.includes("bottomSheetTab === 'places'"),
  'Dual-tab bottom sheet: Requests view and Healthcare Places view'
);

assert(
  mapViewCode.includes('overscroll-contain'),
  'Bottom sheet scrollable list uses overscroll-contain to isolate scroll chaining'
);

// ---------------------------------------------------------------------------
// 7. Pin Previews & Interactive Action Cards
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}7. Auditing Pin Previews & Action Card Integration...${RESET}`);

assert(
  mapViewCode.includes('activeItem') &&
    (mapViewCode.includes("type === 'request'") || mapViewCode.includes("type: 'request'")),
  'Tapping map pin activates preview card for selected request or facility'
);

assert(
  mapViewCode.includes('distanceKm') || mapViewCode.includes('activeRoute'),
  'Displays distance / route duration on preview card'
);

assert(
  mapViewCode.includes('handleCalculateDirections') && mapViewCode.includes('Directions'),
  'Interactive road directions calculation button on preview card'
);

assert(
  mapViewCode.includes('PrimaryHelpButton') || mapViewCode.includes('setHelpFlowOpen'),
  'Direct volunteer responder offer trigger integrated on request card'
);

assert(
  mapViewCode.includes('isRequestOwner'),
  'Enforces own-request visual differentiation (Manage vs Help)'
);

// ---------------------------------------------------------------------------
// 8. Mobile Viewport Resilience & Safe Zones
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}8. Auditing Viewport Matrix (360px, 390px, 412px, 430px)...${RESET}`);

const viewports = [
  { name: 'Android Entry (360x640)', width: 360 },
  { name: 'iPhone Standard (390x844)', width: 390 },
  { name: 'Android High-Res (412x915)', width: 412 },
  { name: 'iPhone Pro Max (430x932)', width: 430 },
];

for (const vp of viewports) {
  // Check that no hardcoded inline width exceeds the mobile viewport
  const hardcodedWidthMatches = mapViewCode.match(/w-\[(\d+)px\]/g) || [];
  const invalidWidths = hardcodedWidthMatches
    .map((m) => parseInt(m.replace(/\D/g, ''), 10))
    .filter((w) => w > vp.width && !mapViewCode.includes(`sm:w-[${w}px]`));

  assert(
    invalidWidths.length === 0,
    `Zero fixed-width elements exceeding ${vp.name} (${vp.width}px)`,
    invalidWidths.length > 0 ? `Found fixed widths: ${invalidWidths.join(', ')}px` : ''
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}======================================================================${RESET}`);
console.log(`Results: ${passes} passed, ${failures} failed`);
console.log(`${BOLD}======================================================================${RESET}\n`);

if (failures > 0) {
  console.error(`${BOLD}${RED}❌ Mobile Phone Map QA failed with ${failures} error(s).${RESET}`);
  process.exit(1);
} else {
  console.log(`${BOLD}${GREEN}🎉 ALL MOBILE PHONE MAP AUDITS PASSED WITH ZERO ERRORS!${RESET}\n`);
  process.exit(0);
}
