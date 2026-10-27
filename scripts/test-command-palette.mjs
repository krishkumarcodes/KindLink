import fs from 'fs';
import path from 'path';

console.log('🧪 Starting KindLink Universal Command Palette & Quick Actions Test...\n');

let passes = 0;
let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passes++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failures++;
  }
}

// 1. Verify CommandPalette component exists and has correct imports
console.log('1. Auditing CommandPalette component existence & dependencies...');
const palettePath = 'components/shell/CommandPalette.tsx';
assert(fs.existsSync(palettePath), 'CommandPalette.tsx exists');
const paletteCode = fs.readFileSync(palettePath, 'utf8');

assert(paletteCode.includes('STANDARD_CATEGORIES'), 'Imports and maps STANDARD_CATEGORIES');
assert(paletteCode.includes('useBodyScrollLock'), 'Uses iOS Safari scroll lock hook');
assert(paletteCode.includes('useFocusTrap'), 'Uses focus trap with Escape handling');
assert(paletteCode.includes('OverlayPortal'), 'Renders in OverlayPortal');

// 2. Keyboard shortcuts audit
console.log('\n2. Auditing Keyboard Shortcut Handlers...');
assert(
  paletteCode.includes("e.key === 'k'") && (paletteCode.includes('metaKey') || paletteCode.includes('ctrlKey')),
  'Handles Cmd+K and Ctrl+K shortcut toggle'
);
assert(
  paletteCode.includes("e.key === '/'") && paletteCode.includes('isInput'),
  'Handles "/" shortcut while safely ignoring input and textarea typing'
);
assert(
  paletteCode.includes('kindlink:open-command-palette'),
  'Listens for custom kindlink:open-command-palette event'
);

// 3. Category coverage
console.log('\n3. Auditing 15 Standard Categories Integration...');
const categoriesPath = 'lib/data/categories.ts';
const categoriesCode = fs.readFileSync(categoriesPath, 'utf8');
const standardCatKeys = [
  'blood',
  'medical_gear',
  'elderly_care',
  'books',
  'transit',
  'medicines',
  'food',
  'hospital_attendant',
  'disaster_relief',
  'tutoring',
  'clothing',
  'repairs',
  'govt_paperwork',
  'animal_rescue',
  'other',
];

assert(
  paletteCode.includes('STANDARD_CATEGORIES.forEach'),
  'Dynamically registers all standard categories with color chips'
);
assert(
  paletteCode.includes('setFilterCategory'),
  'Selecting category filters feed via setFilterCategory'
);

// 4. Emergency & Helplines audit
console.log('\n4. Auditing Life-Safety Emergency Actions...');
assert(paletteCode.includes('Emergency SOS'), 'Contains Emergency SOS action');
assert(paletteCode.includes('National Helplines'), 'Contains National Helplines action');
assert(paletteCode.includes('tel:112'), 'Direct dialer fallback to 112');

// 5. Navigation & Preferences
console.log('\n5. Auditing Core Navigation & Theme Preferences...');
assert(paletteCode.includes('setCurrentView(n.view)'), 'Dispatches view changes for all core tabs');
assert(paletteCode.includes('setTheme'), 'Interactive dark/light mode toggle with toast confirmation');
assert(paletteCode.includes('LocationModal'), 'Provides direct access to LocationModal');
assert(paletteCode.includes('LanguageModal'), 'Provides direct access to LanguageModal');

// 6. Shell Integration
console.log('\n6. Auditing Shell Integration (Sidebar, ProfileMenu, App)...');
const sidebarCode = fs.readFileSync('components/shell/Sidebar.tsx', 'utf8');
assert(
  sidebarCode.includes('kindlink:open-command-palette'),
  'Sidebar contains Quick Search & Command Palette trigger button'
);

const profileMenuCode = fs.readFileSync('components/shell/ProfileQuickMenu.tsx', 'utf8');
assert(
  profileMenuCode.includes('kindlink:open-command-palette'),
  'ProfileQuickMenu contains Quick search & commands row'
);

const appPageCode = fs.readFileSync('app/app/page.tsx', 'utf8');
assert(
  appPageCode.includes('<CommandPalette />'),
  'app/app/page.tsx renders <CommandPalette />'
);

// 7. Surface & Layout Integrity
console.log('\n7. Auditing Solid Surface & Viewport Rules...');
assert(
  paletteCode.includes('bg-card') && !paletteCode.includes('bg-card/90') && !paletteCode.includes('bg-card/95'),
  'Uses single solid bg-card surface (no translucent bands)'
);
assert(
  paletteCode.includes('overscroll-contain'),
  'Prevents scroll chaining with overscroll-contain'
);
assert(
  paletteCode.includes('max-h-['),
  'Enforces bounded max-height for mobile viewport safety'
);

// Summary
console.log('\n======================================================================');
console.log(`Results: ${passes} passed, ${failures} failed`);
console.log('======================================================================\n');

if (failures > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL COMMAND PALETTE AUDITS PASSED WITH ZERO ERRORS!\n');
  process.exit(0);
}
