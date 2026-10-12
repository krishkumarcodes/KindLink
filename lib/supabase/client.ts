import { createBrowserClient } from '@supabase/ssr';

// Helper to resolve public keys supporting both naming styles
export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://hxrysrpymeleaipgofqj.supabase.co'
  );
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTIwMDgsImV4cCI6MjEwNzM2ODAwOH0.a7Vra1vcmPmxAr2zd9mOGRpWR9w34kcj7sEVbwdFFXg'
  );
}

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
