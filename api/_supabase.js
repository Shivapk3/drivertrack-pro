import { createClient } from '@supabase/supabase-js';
import { triggerRestore } from './_wake.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 🛑 CHANGED THIS LINE TO THE ANON KEY 🛑
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      fetch: async (url, options) => {
        const res = await fetch(url, options);
        // If the database is asleep (500 error), trigger the wake up script
        if (!res.ok && res.status >= 500) {
           console.warn("Database appears asleep. Triggering restore...");
           triggerRestore();
        }
        return res;
      },
    },
  }
);

export default supabase;
