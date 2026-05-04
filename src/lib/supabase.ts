import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration status
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Database features will be disabled.');
}

// Create a dummy client that doesn't throw on initialization or use
const createMockClient = () => {
  const handler = {
    get: (target: any, prop: string) => {
      if (['from', 'select', 'insert', 'update', 'delete', 'single', 'order', 'eq'].includes(prop)) {
        return () => new Proxy({}, handler);
      }
      return async () => ({ data: null, error: { message: 'Supabase not configured' } });
    }
  };
  return new Proxy({}, handler);
};

// Only initialize if we have the required URL
let client: ReturnType<typeof createClient>;
try {
  client = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createMockClient() as ReturnType<typeof createClient>;
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
  client = createMockClient() as ReturnType<typeof createClient>;
}

export const supabase = client as any;
