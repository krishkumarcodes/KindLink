#!/usr/bin/env node

/**
 * KindLink - Supabase Auth Diagnostic and Validation Script
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

for (const envFile of ['.env.local', '.env', '.env.render']) {
  const fullPath = path.join(projectRoot, envFile);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      }
    } catch {}
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pwfvaajngfmnmsfmqgyx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZnZhYWpuZ2Ztbm1zZm1xZ3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4ODc3ODUsImV4cCI6MjEwNzQ2Mzc4NX0.LSbxXDJJe0PfZsf_JUPD88f5W9KAJVfyKMHIyTLDnWg';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required. Please set it in .env.local or pass as env var.');
  process.exit(1);
}

console.log('--- SUPABASE CONFIGURATION ---');
console.log('URL:', SUPABASE_URL);

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('\n--- 1. LISTING AUTH USERS VIA ADMIN CLIENT ---');
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 100 });
  if (listError) {
    console.error('Failed to list users:', listError);
  } else {
    console.log(`Found ${usersData.users.length} users:`);
    for (const u of usersData.users) {
      console.log(`- ID: ${u.id}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Confirmed: ${u.email_confirmed_at}`);
      console.log(`  Identities: ${JSON.stringify(u.identities?.map(i => ({ id: i.id, provider: i.provider })))}`);
      console.log(`  User Metadata: ${JSON.stringify(u.user_metadata)}`);
      console.log(`  App Metadata: ${JSON.stringify(u.app_metadata)}`);
    }
  }

  console.log('\n--- 2. TESTING signInWithPassword FOR DEMO ACCOUNTS ---');
  const testCombos = [
    { email: 'volunteer@kindlink.demo', password: 'KindLink#Volunteer2026' },
    { email: 'volunteer@kindlink.demo', password: 'KindLink#2026' },
    { email: 'kind_volunteer@kindlink.demo', password: 'KindLink#Volunteer2026' },
    { email: 'kind_volunteer@kindlink.demo', password: 'KindLink#2026' },
    { email: 'requester@kindlink.demo', password: 'KindLink#Requester2026' },
    { email: 'requester@kindlink.demo', password: 'KindLink#2026' },
    { email: 'need_aid@kindlink.demo', password: 'KindLink#NeedAid2026' },
    { email: 'need_aid@kindlink.demo', password: 'KindLink#Requester2026' },
    { email: 'need_aid@kindlink.demo', password: 'KindLink#2026' },
    { email: 'admin@kindlink.demo', password: 'KindLink#Admin2026' },
    { email: 'admin@kindlink.demo', password: 'KindLink#2026' },
    { email: 'admin_kindlink@kindlink.demo', password: 'KindLink#Admin2026' },
    { email: 'admin_kindlink@kindlink.demo', password: 'KindLink#2026' },
  ];

  for (const combo of testCombos) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: combo.email,
      password: combo.password,
    });
    if (error) {
      console.log(`❌ FAIL [${combo.email} | ${combo.password}]: ${error.message} (status: ${error.status})`);
    } else {
      console.log(`✅ SUCCESS [${combo.email} | ${combo.password}]: User ID ${data.user.id}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
