import { DataAdapter } from './adapter';
import { supabaseAdapter } from './supabase-adapter';
import { mockAdapter } from './mock-adapter';

const isMock =
  process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock' ||
  process.env.DATA_SOURCE === 'mock';

export const dataAdapter: DataAdapter = isMock ? mockAdapter : supabaseAdapter;

export * from './types';
export * from './distance';
export * from './adapter';
export * from './categoryColors';
export * from './ownership';
