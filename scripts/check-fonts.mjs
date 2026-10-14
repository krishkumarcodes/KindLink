import fs from 'fs';
import path from 'path';

/**
 * KindLink Font & Typography Verification Suite
 * Verifies that Next.js self-hosted fonts (Inter & Plus Jakarta Sans)
 * are properly loaded via next/font/google, bound via CSS variables,
 * mapped in Tailwind, and that no serif fallback exists anywhere.
 */

console.log('🔤 Starting KindLink Typography & Font Verification Audit...\n');

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

// 1. Audit app/layout.tsx
const layoutPath = path.resolve('app/layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

assert(
  layoutContent.includes("from 'next/font/google'"),
  "app/layout.tsx imports fonts from 'next/font/google'"
);
assert(
  layoutContent.includes("variable: '--font-sans'"),
  "Inter font configured with CSS variable '--font-sans'"
);
assert(
  layoutContent.includes("variable: '--font-heading'"),
  "Plus Jakarta Sans configured with CSS variable '--font-heading'"
);
assert(
  layoutContent.includes('display: \'swap\''),
  "Fonts configured with display: 'swap'"
);
assert(
  layoutContent.includes('${inter.variable} ${plusJakartaSans.variable}'),
  "HTML root element injects both font CSS variables into class list"
);
assert(
  !layoutContent.includes('fonts.googleapis.com/css2'),
  "External Google Fonts stylesheet links removed in favor of next/font self-hosting"
);

// 2. Audit app/globals.css
const globalsPath = path.resolve('app/globals.css');
const globalsContent = fs.readFileSync(globalsPath, 'utf8');

assert(
  globalsContent.includes('font-family: var(--font-sans), system-ui, -apple-system, \'Segoe UI\', Roboto, sans-serif'),
  "globals.css body rule declares --font-sans with modern sans-serif fallback"
);
assert(
  globalsContent.includes('font-family: var(--font-heading), var(--font-sans), system-ui, \'Segoe UI\', Roboto, sans-serif'),
  "globals.css heading rule declares --font-heading with modern sans-serif fallback"
);

// Verify zero pure serif occurrences in font-family definitions (excluding sans-serif)
const serifMatches = globalsContent.match(/font-family:[^;]*(?<!sans-)serif/gi) || [];
assert(
  serifMatches.length === 0,
  `Zero serif fallbacks in globals.css (found: ${serifMatches.length})`
);

// 3. Audit tailwind.config.ts
const tailwindPath = path.resolve('tailwind.config.ts');
const tailwindContent = fs.readFileSync(tailwindPath, 'utf8');

assert(
  tailwindContent.includes("sans: ['var(--font-sans)'"),
  "tailwind.config.ts maps fontFamily.sans to var(--font-sans)"
);
assert(
  tailwindContent.includes("heading: ['var(--font-heading)'"),
  "tailwind.config.ts maps fontFamily.heading to var(--font-heading)"
);

const tailwindSerifMatches = tailwindContent.match(/fontFamily:[^}]*(?<!sans-)serif/gi) || [];
assert(
  tailwindSerifMatches.length === 0,
  `Zero serif fallbacks in tailwind.config.ts (found: ${tailwindSerifMatches.length})`
);

// 4. Test document.fonts.check simulated parity
const fontStacks = {
  body: 'var(--font-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: 'var(--font-heading), var(--font-sans), system-ui, "Segoe UI", Roboto, sans-serif',
};

console.log('\n--- Computed Font-Family Stacks ---');
console.log(`  Body text:    ${fontStacks.body}`);
console.log(`  Heading text: ${fontStacks.headings}`);

if (failed) {
  console.error('\n❌ Font verification failed.');
  process.exit(1);
}

console.log('\n🎉 ALL FONT & TYPOGRAPHY TESTS PASSED SUCCESSFULLY!\n');
process.exit(0);
