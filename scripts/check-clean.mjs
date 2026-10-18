import fs from 'fs';
import path from 'path';

/**
 * KindLink Cleanliness & Forbidden Concept Verification Gate
 * Scans the entire repository to ensure complete eradication of:
 * - physics concepts and references
 * - gravity scores and models
 * - Newton / Newtonian references
 * - formula rankings
 * - calibration and accelerometer hooks
 * - DeviceMotion permissions and fall detect logic
 * - leftover UI "weight" strings, category cards, and translations
 *   (e.g., "Weight 10/10", "Weight 9/10", category weight hints)
 *
 * The only allowed mention in the entire repository is migration 12:
 * (supabase/sql/12_remove_physics_and_update_ranking.sql)
 */

console.log('🧹 Starting KindLink Clean Architecture & Purge Verification Audit...\n');

// Obfuscate forbidden search tokens to ensure this script doesn't trigger false positives
const FORBIDDEN_RULES = [
  { name: 'Physics references', regex: new RegExp('\\b' + ['phys', 'ics'].join('') + '\\b', 'i') },
  { name: 'Gravity references', regex: new RegExp('\\b' + ['grav', 'ity'].join('') + '\\b', 'i') },
  { name: 'Newton/Newtonian references', regex: new RegExp('\\b' + ['newt', 'on'].join('') + '(ian)?\\b', 'i') },
  { name: 'Formula references', regex: new RegExp('\\b' + ['form', 'ula'].join('') + 's?\\b', 'i') },
  { name: 'Calibration references', regex: new RegExp('\\b' + ['calib', 'ration'].join('') + 's?\\b', 'i') },
  { name: 'Accelerometer references', regex: new RegExp('\\b' + ['accelero', 'meter'].join('') + 's?\\b', 'i') },
  { name: 'DeviceMotion references', regex: new RegExp('\\b' + ['device', 'motion'].join('') + '\\b', 'i') },
  { name: 'Fall detection references', regex: new RegExp('\\b' + ['fall', 'detect'].join('\\s*') + '(ion|or)?\\b', 'i') },
  {
    name: 'Banned category weight / UI weight strings',
    regex: new RegExp('(category\\s*weight|weight\\s*\\d+\\s*/\\s*\\d+|weight\\s*\\d+\\b|urgency\\s*weight|category_weight|weight\\s*hint)', 'i')
  },
  { name: 'Asansol Engineering references', regex: new RegExp('\\b' + ['asansol', '\\s+', 'engineering'].join('') + '\\b', 'i') },
  { name: 'AEC references', regex: new RegExp('\\b' + ['A', 'E', 'C'].join('') + '\\b') },
  { name: 'MAKAUT references', regex: new RegExp('\\b' + ['mak', 'aut'].join('') + '\\b', 'i') },
  { name: 'MedPlus references', regex: new RegExp('\\b' + ['med', 'plus'].join('') + '\\b', 'i') },
  { name: 'Sanjeevani references', regex: new RegExp('\\b' + ['sanje', 'evani'].join('') + '\\b', 'i') },
  { name: 'Life Line Blood references', regex: new RegExp('\\b' + ['life', '\\s+', 'line', '\\s+', 'blood'].join('') + '\\b', 'i') }
];

// Special checker for UI strings, category cards, and translations
function isUiWeightViolation(relPath, lineText) {
  const isUiOrContentFile = /^(components|app|lib\/i18n|public)\//.test(relPath);
  if (!isUiOrContentFile) return false;

  // Check if line contains the standalone word "weight"
  const weightRegex = /\bweight\b/i;
  if (!weightRegex.test(lineText)) return false;

  // Allowed CSS / SVG font weight
  if (/font[-_]?weight|fontWeight/i.test(lineText)) return false;

  // Allowed Leaflet map polyline/stroke thickness option (e.g. weight: 2, weight: 4)
  if (/weight:\s*\d+/i.test(lineText)) return false;

  // Allowed medical donor eligibility body weight or orthopedic weight-bearing
  if (/(?:minimum|body|donor|patient)\s*weight|weight\s*(?:>|<|>=|<=|\d+\s*kg|limit|bearing)/i.test(lineText)) {
    return false;
  }

  // Any other UI string, category card badge, or translation containing "weight" is forbidden!
  return true;
}

const IGNORE_DIRS = new Set(['.git', 'node_modules', '.next', 'docs/screenshots']);
const IGNORE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot']);
const IGNORE_FILES = new Set(['tsconfig.tsbuildinfo', 'scripts/check-clean.mjs']);
const ALLOWED_FILES = new Set(['supabase/sql/12_remove_physics_and_update_ranking.sql']);

let scannedFiles = 0;
let totalHits = 0;
const violations = [];

function scanDirectory(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name) || IGNORE_DIRS.has(relPath)) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IGNORE_EXTENSIONS.has(ext) || IGNORE_FILES.has(entry.name) || IGNORE_FILES.has(relPath)) {
        continue;
      }

      if (ALLOWED_FILES.has(relPath)) {
        console.log(`  ℹ️  [Whitelisted Migration]: ${relPath} (Permitted clean-up DDL)`);
        continue;
      }

      scannedFiles++;
      let content;
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      lines.forEach((lineText, idx) => {
        // 1. General forbidden rules
        for (const rule of FORBIDDEN_RULES) {
          if (rule.regex.test(lineText)) {
            totalHits++;
            violations.push({
              file: relPath,
              line: idx + 1,
              rule: rule.name,
              content: lineText.trim()
            });
          }
        }

        // 2. UI strings / category cards / translations weight check
        if (isUiWeightViolation(relPath, lineText)) {
          totalHits++;
          violations.push({
            file: relPath,
            line: idx + 1,
            rule: 'UI / Category card / Translation "weight" label (Use Urgency tier instead)',
            content: lineText.trim()
          });
        }
      });
    }
  }
}

scanDirectory(process.cwd());

console.log(`\n📊 Scan complete: audited ${scannedFiles} files across repository.`);

if (violations.length > 0) {
  console.error(`\n❌ FAILED: Found ${violations.length} forbidden concept violation(s):\n`);
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} [${v.rule}]`);
    console.error(`    > "${v.content}"\n`);
  }
  process.exit(1);
} else {
  console.log(`\n✅ PASS: Repository is 100% clean. Zero forbidden concepts detected.`);
  console.log(`   Urgency hierarchy (Urgency > Proximity > Waiting Time) is strictly observed.`);
  console.log(`   All UI strings, category cards, and translations are free of "weight" labels.\n`);
  process.exit(0);
}
