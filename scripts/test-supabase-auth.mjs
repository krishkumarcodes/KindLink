#!/usr/bin/env node

/**
 * KindLink - Supabase Auth Diagnostic and Validation Script
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hxrysrpymeleaipgofqj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTIwMDgsImV4cCI6MjEwNzM2ODAwOH0.a7Vra1vcmPmxAr2zd9mOGRpWR9w34kcj7sEVbwdFFXg';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTc5MjAwOCwiZXhwIjoyMTA3MzY4MDA4fQ.hdrH0c9RGEVLej2Cle-ukUyLewuZmqqGY1Z3QS7QIhM';

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
