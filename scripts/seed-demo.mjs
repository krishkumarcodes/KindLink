#!/usr/bin/env node

/**
 * KindLink - Demo Seeding Runner
 *
 * Populates realistic demo accounts, aid requests, offers, notifications,
 * and ratings across Asansol, Durgapur, Dhanbad, and neighboring regions.
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 *   npm run seed:demo
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedScript = path.resolve(__dirname, 'seed.mjs');

console.log('🌱 Starting KindLink Demo Seeding...');

const child = spawn(process.execPath, [seedScript], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
