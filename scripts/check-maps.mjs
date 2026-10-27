#!/usr/bin/env node
/**
 * KindLink Maps Architectural Guard (npm run check:maps)
 * 
 * Scans all client-side code (excluding server provider adapters and server API routes).
 * Enforces strict zero direct-coupling policy:
 * Fails if any client code contains direct URLs of:
 * - nominatim.openstreetmap.org
 * - router.project-osrm.org
 * - overpass (e.g. overpass-api.de, overpass.kumi.systems)
 * - basemaps.cartocdn.com
 * 
 * All client map operations MUST use /api/maps/* endpoints or <MapTileLayer />.
 */

import fs from 'node:fs';
import path from 'node:path';

// ANSI Colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

const CHECK = `${GREEN}✔${RESET}`;
const CROSS = `${RED}✖${RESET}`;
const WARN = `${YELLOW}⚠${RESET}`;

console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}${CYAN} KindLink Maps Client-Side Code Guard Audit                     ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

const FORBIDDEN_RULES = [
  {
    name: 'OSM Nominatim direct URL',
    pattern: /nominatim\.openstreetmap\.org/i,
    fix: 'Use server proxy /api/maps/geocode or /api/maps/reverse instead of direct Nominatim calls.',
  },
  {
    name: 'OSRM direct URL',
    pattern: /router\.project-osrm\.org/i,
    fix: 'Use server proxy /api/maps/route instead of direct OSRM calls.',
  },
  {
    name: 'Overpass API direct URL',
    pattern: /(overpass-api\.de|overpass\.kumi\.systems|overpass-api)/i,
    fix: 'Use server proxy /api/maps/places instead of direct Overpass interpreter queries.',
  },
  {
    name: 'CARTO basemaps direct URL',
    pattern: /basemaps\.cartocdn\.com/i,
    fix: 'Use <MapTileLayer /> from @/components/map/MapTileLayer instead of direct CARTO tile URLs.',
  },
];

// Directories containing client code
const CLIENT_DIRS = ['components', 'app', 'lib'];

// Paths strictly excluded (server provider adapters, server routes, scripts, docs, node_modules)
const EXCLUDED_PATH_PATTERNS = [
  /^[/\\]?node_modules/,
  /^[/\\]?\.next/,
  /^[/\\]?\.git/,
  /^[/\\]?public/,
  /^[/\\]?docs/,
  /^[/\\]?scripts/,
  /^[/\\]?supabase/,
  // Server-side provider adapters & engine are permitted to contain external URLs:
  /^[/\\]?lib[/\\]maps[/\\]adapters/,
  /^[/\\]?lib[/\\]maps/,
  // Server-side Next.js API routes are permitted to proxy:
  /^[/\\]?app[/\\]api/,
  // MapTileLayer is the designated client-side tile engine component:
  /^[/\\]?components[/\\]map[/\\]MapTileLayer\.tsx/,
];

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function isExcluded(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath);

    if (isExcluded(relPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (CODE_EXTENSIONS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

let filesToScan = [];
for (const dirName of CLIENT_DIRS) {
  const fullDirPath = path.resolve(process.cwd(), dirName);
  scanDirectory(fullDirPath, filesToScan);
}

console.log(`${DIM}Scanning ${filesToScan.length} client files across components/, app/, and lib/ (excluding server adapters)...${RESET}\n`);

let violationCount = 0;
const violationsByFile = new Map();

for (const filePath of filesToScan) {
  const relPath = path.relative(process.cwd(), filePath);
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    continue;
  }

  const lines = content.split('\n');
  lines.forEach((lineText, idx) => {
    // Ignore comments that explicitly discuss banned URLs (e.g. documentation or warnings)
    const trimmed = lineText.trim();
    if (trimmed.startsWith('//') && /banned|forbidden|guard|legacy|deprecated/i.test(trimmed)) {
      return;
    }

    for (const rule of FORBIDDEN_RULES) {
      if (rule.pattern.test(lineText)) {
        violationCount++;
        if (!violationsByFile.has(relPath)) {
          violationsByFile.set(relPath, []);
        }
        violationsByFile.get(relPath).push({
          lineNum: idx + 1,
          ruleName: rule.name,
          fix: rule.fix,
          snippet: trimmed,
        });
      }
    }
  });
}

if (violationCount > 0) {
  console.log(`${CROSS} ${BOLD}${RED}FAILED:${RESET} Found ${violationCount} forbidden direct provider URL violation(s) in client-side code:\n`);

  for (const [file, items] of violationsByFile.entries()) {
    console.log(`  ${BOLD}${file}${RESET}`);
    for (const item of items) {
      console.log(`    Line ${item.lineNum}: ${RED}${item.ruleName}${RESET}`);
      console.log(`    ${DIM}Code:${RESET} ${item.snippet.slice(0, 100)}`);
      console.log(`    ${YELLOW}Fix :${RESET} ${item.fix}\n`);
    }
  }

  console.log(`${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${RED}Direct map provider URLs in client code compromise security, leak keys,`);
  console.log(`bypass rate limiters/circuit breakers, and break offline fallbacks.${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${CHECK} ${BOLD}${GREEN}PASSED:${RESET} Zero direct map provider URLs found in client-side code.`);
  console.log(`   ${DIM}All map operations are strictly routed through server proxies and adapters.${RESET}\n`);
  process.exit(0);
}
