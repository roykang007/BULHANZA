import { createClient } from '@supabase/supabase-js';

// Resolve from build-time environment OR runtime localStorage configuration
const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Safe load in browser environment
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('CUSTOM_SUPABASE_URL') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('CUSTOM_SUPABASE_ANON_KEY') : null;

  return {
    url: localUrl || envUrl || "",
    key: localKey || envKey || ""
  };
};

const { url, key } = getSupabaseConfig();

if (!url || !key) {
  console.log("Supabase URL or Anon Key is loaded as empty. Operating in offline/database fallbacks mode.");
}

export const supabase = (url && key) 
  ? createClient(url, key)
  : null as any;

