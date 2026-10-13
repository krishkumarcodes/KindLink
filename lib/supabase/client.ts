import { createBrowserClient } from '@supabase/ssr';

// Helper to resolve public Supabase URL
export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://pwfvaajngfmnmsfmqgyx.supabase.co'
  );
}

// Helper to resolve public keys supporting both legacy JWT and modern 2024+ naming styles
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZnZhYWpuZ2Ztbm1zZm1xZ3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4ODc3ODUsImV4cCI6MjEwNzQ2Mzc4NX0.LSbxXDJJe0PfZsf_JUPD88f5W9KAJVfyKMHIyTLDnWg'
  );
}

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
