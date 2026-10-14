#!/usr/bin/env node

/**
 * KindLink - Demo Seeding Cleanup Runner
 *
 * Removes all demo accounts, requests, offers, and notifications
 * to restore a clean slate for demonstrations.
 *
 * Usage:
 *   node scripts/seed-demo-remove.mjs
 *   npm run seed:demo:remove
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedScript = path.resolve(__dirname, 'seed.mjs');

console.log('🧹 Removing KindLink Demo Data...');

const child = spawn(process.execPath, [seedScript, '--clean'], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
