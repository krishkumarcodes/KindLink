#!/usr/bin/env node

/**
 * KindLink - Official Demo Accounts Provisioning & Verification Script
 * Author: KindLink Engineering (krishkumarcodes@gmail.com)
 *
 * Uses the official Supabase GoTrue Admin API to create and configure
 * showcase demo accounts natively without any SQL schema/token mismatch bugs.
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

console.log('================================================================');
console.log('KindLink - Demo Accounts Provisioning');
console.log('Project URL:', SUPABASE_URL);
console.log('================================================================\n');

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_ACCOUNTS = [
  {
    role: 'user',
    email: 'volunteer@kindlink.demo',
    password: 'KindLink#Volunteer2026',
    username: 'kind_volunteer',
    displayName: 'Dr. Ananya Roy (Volunteer)',
    phone: '+91 98320 12345',
    verificationStatus: 'verified',
    lat: 23.6889,
    lng: 86.9661,
  },
  {
    role: 'user',
    email: 'requester@kindlink.demo',
    password: 'KindLink#Requester2026',
    username: 'need_aid',
    displayName: 'Sourav Mukherjee',
    phone: '+91 98320 54321',
    verificationStatus: 'verified',
    lat: 23.6842,
    lng: 86.9745,
  },
  {
    role: 'admin',
    email: 'admin@kindlink.demo',
    password: 'KindLink#Admin2026',
    username: 'admin_kindlink',
    displayName: 'KindLink Administrator',
    phone: '+91 98320 00000',
    verificationStatus: 'verified',
    lat: 23.6870,
    lng: 86.9700,
  },
  {
    role: 'user',
    email: 'kind_volunteer@kindlink.demo',
    password: 'KindLink#2026',
    username: 'kind_volunteer_alias',
    displayName: 'Dr. Ananya Roy (Volunteer Alias)',
    phone: '+91 98320 12345',
    verificationStatus: 'verified',
    lat: 23.6889,
    lng: 86.9661,
  },
  {
    role: 'user',
    email: 'need_aid@kindlink.demo',
    password: 'KindLink#2026',
    username: 'need_aid_alias',
    displayName: 'Sourav Mukherjee (Requester Alias)',
    phone: '+91 98320 54321',
    verificationStatus: 'verified',
    lat: 23.6842,
    lng: 86.9745,
  },
  {
    role: 'admin',
    email: 'admin_kindlink@kindlink.demo',
    password: 'KindLink#2026',
    username: 'admin_kindlink_alias',
    displayName: 'KindLink Administrator (Admin Alias)',
    phone: '+91 98320 00000',
    verificationStatus: 'verified',
    lat: 23.6870,
    lng: 86.9700,
  },
];

async function main() {
  console.log('--- 1. Fetching Existing Auth Users ---');
  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }

  const existingMap = new Map();
  for (const u of usersData.users) {
    existingMap.set(u.email.toLowerCase(), u);
  }
  console.log(`Found ${usersData.users.length} existing users in Supabase.`);

  console.log('\n--- 2. Provisioning / Updating Demo Accounts ---');
  const createdUsers = [];

  for (const acc of DEMO_ACCOUNTS) {
    let userRecord = existingMap.get(acc.email.toLowerCase());

    if (!userRecord) {
      console.log(`Creating [${acc.username}] <${acc.email}>...`);
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          username: acc.username,
          display_name: acc.displayName,
        },
      });

      if (createErr) {
        console.error(`❌ Failed to create ${acc.email}:`, createErr.message);
        continue;
      }
      userRecord = createData.user;
      console.log(`✓ Created: ${userRecord.id}`);
    } else {
      console.log(`User already exists for <${acc.email}>. Updating password & metadata...`);
      const { data: updateData, error: updateErr } = await adminClient.auth.admin.updateUserById(userRecord.id, {
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          username: acc.username,
          display_name: acc.displayName,
        },
      });
      if (updateErr) {
        console.error(`❌ Failed to update ${acc.email}:`, updateErr.message);
        continue;
      }
      userRecord = updateData.user;
      console.log(`✓ Updated: ${userRecord.id}`);
    }

    // Synchronize Profile in public.profiles
    const { error: profileErr } = await adminClient.from('profiles').upsert({
      id: userRecord.id,
      username: acc.username,
      email: acc.email,
      display_name: acc.displayName,
      phone: acc.phone,
      role: acc.role,
      verification_status: acc.verificationStatus,
      rating_average: 5.0,
      rating_count: 12,
    });

    if (profileErr) {
      console.warn(`  Profile sync note for ${acc.username}:`, profileErr.message);
    } else {
      console.log(`  ✓ Profile synchronized for ${acc.username} (role: ${acc.role})`);
    }

    createdUsers.push({ ...acc, id: userRecord.id });
  }

  // 3. Seed Sample Showcase Request & Offer if requester and volunteer exist
  const volunteer = createdUsers.find((u) => u.username === 'kind_volunteer');
  const requester = createdUsers.find((u) => u.username === 'need_aid');

  if (volunteer && requester) {
    console.log('\n--- 3. Provisioning Sample Showcase Request & Offer ---');
    try {
      const sampleReqId = 'b0000000-0000-0000-0000-000000000001';
      await adminClient.from('requests').upsert({
        id: sampleReqId,
        requester_id: requester.id,
        category: 'blood',
        title: 'Urgent: B+ Blood Required for Dialysis Patient',
        description: 'Looking for verified blood donor nearby District Hospital Asansol. Patient scheduled for regular hemodialysis treatment today at 3:00 PM.',
        urgency: 'high',
        status: 'open',
        address_text: 'District Hospital, Asansol, West Bengal',
      });

      await adminClient.from('offers').upsert({
        id: 'c0000000-0000-0000-0000-000000000001',
        request_id: sampleReqId,
        helper_id: volunteer.id,
        message: 'Hello! I am a verified donor nearby at Kalyanpur. I can reach District Hospital within 15 minutes.',
        status: 'pending',
      });
      console.log('✓ Sample showcase request and offer provisioned.');
    } catch (sampleErr) {
      console.warn('Sample data seed note:', sampleErr.message);
    }
  }

  // 4. Verify Logins via Anon Client
  console.log('\n--- 4. Validating signInWithPassword across all accounts ---');
  let passCount = 0;
  for (const acc of DEMO_ACCOUNTS) {
    const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (loginErr) {
      console.log(`❌ FAIL [${acc.username}] ${acc.email} / ${acc.password}: ${loginErr.message}`);
    } else {
      passCount++;
      console.log(`✅ SUCCESS [${acc.username}] ${acc.email} / ${acc.password} -> UID: ${loginData.user.id}`);
    }
  }

  console.log(`\nProvisioning Complete! ${passCount} / ${DEMO_ACCOUNTS.length} accounts verified and ready.`);
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
