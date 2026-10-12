import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from './client';

export function getServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTc5MjAwOCwiZXhwIjoyMTA3MzY4MDA4fQ.hdrH0c9RGEVLej2Cle-ukUyLewuZmqqGY1Z3QS7QIhM'
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
