#!/usr/bin/env node
/**
 * KindLink Map Phone Layout & Bottom Sheet Comprehensive Audit Script
 * Audits Map page across:
 * - 320x568 (iPhone SE 1st gen)
 * - 360x740 (Standard Android / Galaxy S8)
 * - 390x844 (iPhone 12/13/14)
 * - 412x915 (Pixel 7 / S21)
 * - 768x1024 (iPad / Tablet)
 * - Landscape Phone (844x390 / 740x360 landscape)
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MAP_VIEW_FILE = path.join(ROOT, 'components/map/MapView.tsx');
const APP_PAGE_FILE = path.join(ROOT, 'app/app/page.tsx');
const MAP_PAGE_FILE = path.join(ROOT, 'app/map/page.tsx');
const TAB_BAR_FILE = path.join(ROOT, 'components/shell/BottomTabBar.tsx');

const VIEWPORTS = [
  { name: 'iPhone SE 1st Gen (Ultra-Compact)', width: 320, height: 568, orientation: 'portrait', isUltraSmall: true },
  { name: 'Samsung Galaxy S8 / Standard Android', width: 360, height: 740, orientation: 'portrait', isUltraSmall: false },
  { name: 'iPhone 12/13/14 (Modern Compact)', width: 390, height: 844, orientation: 'portrait', isUltraSmall: false },
  { name: 'Google Pixel 7 / Galaxy S21 (Modern Large)', width: 412, height: 915, orientation: 'portrait', isUltraSmall: false },
  { name: 'iPad / Tablet Portrait', width: 768, height: 1024, orientation: 'portrait', isTablet: true },
  { name: 'Modern Landscape Phone', width: 844, height: 390, orientation: 'landscape', isLandscape: true },
  { name: 'Compact Landscape Phone (Galaxy S8)', width: 740, height: 360, orientation: 'landscape', isLandscape: true },
];

console.log('================================================================');
console.log(' KindLink Map Phone Layout & Bottom Sheet Architecture Audit');
console.log('================================================================\n');

const mapViewCode = fs.readFileSync(MAP_VIEW_FILE, 'utf8');
const appPageCode = fs.readFileSync(APP_PAGE_FILE, 'utf8');
const mapPageCode = fs.readFileSync(MAP_PAGE_FILE, 'utf8');
const tabBarCode = fs.readFileSync(TAB_BAR_FILE, 'utf8');

const auditResults = [];

// 1. Audit Document Scroll Locking
const hasBodyLock = mapViewCode.includes("document.body.style.overscrollBehavior = 'none'");
const hasHtmlLock = mapViewCode.includes("document.documentElement.style.overscrollBehavior = 'none'");
const hasMainLock = appPageCode.includes("currentView === 'map' ? 'overflow-hidden overscroll-none' : 'overflow-y-auto'");
const hasSheetListContain = mapViewCode.includes('overscroll-contain');

auditResults.push({
  feature: 'Document Scroll Locking',
  passed: hasBodyLock && hasHtmlLock && hasMainLock && hasSheetListContain,
  details: { hasBodyLock, hasHtmlLock, hasMainLock, hasSheetListContain }
});

// 2. Audit Top Floating Search Bar (48px, single flex row)
const has48pxSearch = mapViewCode.includes('h-12 w-full') || mapViewCode.includes('h-12');
const hasSearchPlaceholder = mapViewCode.includes('placeholder="Search places or addresses"');
const hasClearButton = mapViewCode.includes('aria-label="Clear search query"');
const hasListShortcut = mapViewCode.includes('title="Toggle list view"') && mapViewCode.includes('<List');
const isSingleFlexRow = mapViewCode.includes('flex items-center h-12 w-full');

auditResults.push({
  feature: 'Top 48px Floating Search Bar',
  passed: has48pxSearch && hasSearchPlaceholder && hasClearButton && hasListShortcut && isSingleFlexRow,
  details: { has48pxSearch, hasSearchPlaceholder, hasClearButton, hasListShortcut, isSingleFlexRow }
});

// 3. Audit Filter Chips (36px, live counts, solid high-contrast backgrounds)
const has36pxChips = mapViewCode.includes('h-9 px-3') || mapViewCode.includes('h-9 px-2.5');
const hasRequestsChip = mapViewCode.includes("label: 'Requests'");
const hasHospitalsChip = mapViewCode.includes("label: 'Hospitals'");
const hasClinicsChip = mapViewCode.includes("label: 'Clinics'");
const hasPharmaciesChip = mapViewCode.includes("label: 'Pharmacies'");
const hasBloodBanksChip = mapViewCode.includes("label: 'Blood banks'");
const hasUnder360Logic = mapViewCode.includes('hidden min-[360px]:inline');
const hasActiveScrollIntoView = mapViewCode.includes('scrollIntoView');
const hasSolidContrastBg = mapViewCode.includes('bg-teal-700 text-white') && mapViewCode.includes('bg-blue-700 text-white');

auditResults.push({
  feature: 'Filter Chips (36px, Live Counts, Solid High Contrast)',
  passed: has36pxChips && hasRequestsChip && hasHospitalsChip && hasClinicsChip && hasPharmaciesChip && hasBloodBanksChip && hasUnder360Logic && hasActiveScrollIntoView && hasSolidContrastBg,
  details: { has36pxChips, hasRequestsChip, hasHospitalsChip, hasClinicsChip, hasPharmaciesChip, hasBloodBanksChip, hasUnder360Logic, hasActiveScrollIntoView, hasSolidContrastBg }
});

// 4. Audit Right Thumb Controls (44px buttons, dynamic vertical group)
const has44pxControls = mapViewCode.includes('w-11 h-11') && mapViewCode.includes('min-w-[44px]');
const hasLocateMe = mapViewCode.includes('title="Locate me (GPS)"');
const hasZoomIn = mapViewCode.includes('title="Zoom in"');
const hasZoomOut = mapViewCode.includes('title="Zoom out"');
const hasLayers = mapViewCode.includes('title="Map Layers & Overlays"');
const hasResetNorth = mapViewCode.includes('title="Reset North & view"');
const movesUpWithSheet = mapViewCode.includes("bottom-[calc(50%+14px)]");
const hidesOnFullSheet = mapViewCode.includes("opacity-0 pointer-events-none translate-y-6");
const shrinksOn320 = mapViewCode.includes("max-[359px]:w-10 max-[359px]:h-10");

auditResults.push({
  feature: 'Right Thumb Controls (44px, Dynamic Movement & Hiding)',
  passed: has44pxControls && hasLocateMe && hasZoomIn && hasZoomOut && hasLayers && hasResetNorth && movesUpWithSheet && hidesOnFullSheet && shrinksOn320,
  details: { has44pxControls, hasLocateMe, hasZoomIn, hasZoomOut, hasLayers, hasResetNorth, movesUpWithSheet, hidesOnFullSheet, shrinksOn320 }
});

// 5. Audit Draggable Bottom Sheet (3 Snap Points: Peek, Half, Full)
const hasPeekSnap = mapViewCode.includes("h-[96px] max-[359px]:h-[80px]");
const hasHalfSnap = mapViewCode.includes("h-[50%]");
const hasFullSnap = mapViewCode.includes("h-[calc(100%-112px)]");
const hasHandleDragOnly = mapViewCode.includes("onTouchStart={handleSheetTouchStart}") && mapViewCode.includes("cursor-grab active:cursor-grabbing");
const hasSummaryString = mapViewCode.includes("nearby");
const listScrollsAtHalfOrFull = mapViewCode.includes("bottomSheetSnap !== 'peek'") && mapViewCode.includes("overflow-y-auto overscroll-contain");

auditResults.push({
  feature: 'Draggable Bottom Sheet (3 Snap Points & Delegation)',
  passed: hasPeekSnap && hasHalfSnap && hasFullSnap && hasHandleDragOnly && hasSummaryString && listScrollsAtHalfOrFull,
  details: { hasPeekSnap, hasHalfSnap, hasFullSnap, hasHandleDragOnly, hasSummaryString, listScrollsAtHalfOrFull }
});

// 6. Audit Landscape & Desktop Layout (360px Left Side Panel)
const has360pxPanel = mapViewCode.includes("w-[360px] shrink-0 border-r border-border bg-card");
const hasPanelOnLandscape = mapViewCode.includes("hidden sm:flex landscape:flex flex-col w-[360px]");
const hasSearchInsidePanel = mapViewCode.includes("ref={desktopSearchContainerRef}");
const hasControlsOnRight = mapViewCode.includes("hidden sm:flex landscape:flex absolute top-4 right-4");
const hasTabBarHiddenOnLandscape = tabBarCode.includes("landscape:hidden");

auditResults.push({
  feature: 'Landscape & Desktop Layout (360px Left Side Panel)',
  passed: has360pxPanel && hasPanelOnLandscape && hasSearchInsidePanel && hasControlsOnRight && hasTabBarHiddenOnLandscape,
  details: { has360pxPanel, hasPanelOnLandscape, hasSearchInsidePanel, hasControlsOnRight, hasTabBarHiddenOnLandscape }
});

// 7. Audit Mathematical Safe Zones across All Viewports
console.log('Auditing Viewport Geometry & Math Calculations:\n');

for (const vp of VIEWPORTS) {
  const headerHeight = 56;
  let bottomBarHeight = 0;
  let layoutType = '';
  let mapHeight = 0;
  let peekHeight = 0;
  let peekRatio = 0;
  let panelWidth = 0;

  if (vp.isTablet || vp.width >= 640 || vp.isLandscape) {
    layoutType = 'Desktop/Landscape (360px Side Panel + Full Height Map)';
    bottomBarHeight = 0;
    panelWidth = 360;
    mapHeight = vp.height - headerHeight;
    peekHeight = 0;
    peekRatio = 0;
  } else {
    layoutType = 'Phone Portrait (Floating Top Bar + Draggable Bottom Sheet)';
    bottomBarHeight = 64;
    panelWidth = 0;
    mapHeight = vp.height - headerHeight - bottomBarHeight;
    peekHeight = vp.width < 360 ? 80 : 96;
    peekRatio = (peekHeight / mapHeight) * 100;
  }

  const peekWithin18Percent = vp.width < 360 ? peekRatio <= 18.0 : true;

  console.log(`📱 ${vp.name} (${vp.width}x${vp.height}):`);
  console.log(`   • Layout Mode    : ${layoutType}`);
  console.log(`   • Header Height  : ${headerHeight}px`);
  console.log(`   • Bottom Bar     : ${bottomBarHeight}px`);
  console.log(`   • Available Map  : ${mapHeight}px height x ${vp.width - panelWidth}px width`);
  if (peekHeight > 0) {
    console.log(`   • Peek Height    : ${peekHeight}px (${peekRatio.toFixed(2)}% of map height, target <=18% on small: ${peekWithin18Percent ? 'PASSED' : 'FAILED'})`);
    console.log(`   • Half Snap      : ${Math.round(mapHeight * 0.5)}px (50%)`);
    console.log(`   • Full Snap      : ${mapHeight - 112}px (below 48px search + 36px filter chips)`);
  } else {
    console.log(`   • Side Panel     : ${panelWidth}px fixed width (Map canvas: ${vp.width - panelWidth}px width)`);
  }
  console.log('');
}

console.log('----------------------------------------------------------------');
console.log('Feature Audit Verdict:');
let allPassed = true;
for (const res of auditResults) {
  console.log(`${res.passed ? '✔ PASS' : '✖ FAIL'}: ${res.feature}`);
  if (!res.passed) {
    allPassed = false;
    console.log('  Details:', res.details);
  }
}
console.log('----------------------------------------------------------------');

if (allPassed) {
  console.log('\n🎉 ALL ARCHITECTURAL REQUIREMENTS VERIFIED AND PASSED!\n');
} else {
  console.error('\n❌ SOME AUDIT REQUIREMENTS FAILED!\n');
  process.exit(1);
}
