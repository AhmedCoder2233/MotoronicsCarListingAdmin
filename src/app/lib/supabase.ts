// lib/supabase.ts

import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Export as createClient
export const createClient = () => {
  return supabaseCreateClient(supabaseUrl, supabaseAnonKey);
};

// For direct supabase instance (if needed)
export const supabase = createClient();