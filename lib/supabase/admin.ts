import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from './client';

// Helper to resolve admin/service role key supporting legacy JWT and modern 2024+ aliases
export function getServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  );
}

export function createAdminClient() {
  const serviceKey = getServiceRoleKey();
  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
