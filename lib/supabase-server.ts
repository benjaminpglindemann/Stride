import { createClient } from '@supabase/supabase-js';

const url          = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client — never expose in browser bundles
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
