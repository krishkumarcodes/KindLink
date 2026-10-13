#!/usr/bin/env node

/**
 * KindLink - Demo Accounts Authentication Verification Script
 * Validates GoTrue authentication across all primary and alias showcase credentials.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hxrysrpymeleaipgofqj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTIwMDgsImV4cCI6MjEwNzM2ODAwOH0.a7Vra1vcmPmxAr2zd9mOGRpWR9w34kcj7sEVbwdFFXg';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTc5MjAwOCwiZXhwIjoyMTA3MzY4MDA4fQ.hdrH0c9RGEVLej2Cle-ukUyLewuZmqqGY1Z3QS7QIhM';

console.log('================================================================');
console.log('KindLink - Demo Accounts Auth Verification');
console.log('Project URL:', SUPABASE_URL);
console.log('================================================================\n');

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Verify get_email_by_username RPC
  console.log('--- 1. Testing Username-to-Email RPC Resolution ---');
  const testUsernames = ['kind_volunteer', 'need_aid', 'admin_kindlink'];
  for (const username of testUsernames) {
    const { data: email, error: rpcErr } = await anonClient.rpc('get_email_by_username', { p_username: username });
    if (rpcErr) {
      console.log(`❌ RPC [${username}]: Error - ${rpcErr.message}`);
    } else {
      console.log(`✓ RPC [${username}] -> ${email}`);
    }
  }

  // 2. Verify Showcase Accounts Login
  console.log('\n--- 2. Testing signInWithPassword for All Demo Credentials ---');
  const credentials = [
    { label: 'Volunteer (Primary)', email: 'volunteer@kindlink.demo', pass: 'KindLink#Volunteer2026' },
    { label: 'Volunteer (Universal)', email: 'volunteer@kindlink.demo', pass: 'KindLink#2026' },
    { label: 'Volunteer Alias', email: 'kind_volunteer@kindlink.demo', pass: 'KindLink#2026' },
    { label: 'Requester (Primary)', email: 'requester@kindlink.demo', pass: 'KindLink#Requester2026' },
    { label: 'Requester (Universal)', email: 'requester@kindlink.demo', pass: 'KindLink#2026' },
    { label: 'Requester Alias', email: 'need_aid@kindlink.demo', pass: 'KindLink#2026' },
    { label: 'Admin (Primary)', email: 'admin@kindlink.demo', pass: 'KindLink#Admin2026' },
    { label: 'Admin (Universal)', email: 'admin@kindlink.demo', pass: 'KindLink#2026' },
    { label: 'Admin Alias', email: 'admin_kindlink@kindlink.demo', pass: 'KindLink#2026' },
  ];

  let passCount = 0;
  for (const cred of credentials) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: cred.email,
      password: cred.pass,
    });

    if (error) {
      console.log(`❌ FAIL [${cred.label}] ${cred.email} / ${cred.pass}: ${error.message} (status: ${error.status})`);
    } else {
      passCount++;
      console.log(`✅ SUCCESS [${cred.label}] ${cred.email} / ${cred.pass} -> UID: ${data.user.id}`);
    }
  }

  // 3. Verify Profiles synchronization
  console.log('\n--- 3. Verifying Public Profiles Synchronization ---');
  const { data: profiles, error: pErr } = await adminClient
    .from('profiles')
    .select('id, username, email, role, verification_status, display_name')
    .in('username', [
      'kind_volunteer', 'need_aid', 'admin_kindlink',
      'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
    ]);

  if (pErr) {
    console.error('Failed to query profiles:', pErr.message);
  } else {
    console.table(profiles);
  }

  console.log(`\nResults: ${passCount} / ${credentials.length} credential checks passed.`);
  if (passCount === 0) {
    console.log('\n👉 NOTE: Demo accounts have not been refreshed yet in the Supabase database.');
    console.log('   Please copy and execute `supabase/sql/auth_fix/18_refresh_demo_accounts.sql`');
    console.log('   in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/hxrysrpymeleaipgofqj/sql)');
    console.log('   to complete the GoTrue repair and demo account provisioning.');
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
