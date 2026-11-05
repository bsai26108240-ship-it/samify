import { createClient } from '@supabase/supabase-js';

// Environment variables loaded by Vite (must start with VITE_)
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://brigerbdlrbqbbpymjsf.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_JUSCZiDvOTpdLUicvtu9Cg_qHm17-OI';

// Fallback safety check if keys are not yet configured in local environment
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export default supabase;

