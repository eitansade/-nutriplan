/**
 * /src/lib/supabase.js
 * Frontend Supabase client — uses ANON key only (safe for browser)
 *
 * NEVER use SUPABASE_SERVICE_ROLE_KEY here.
 * The service role key is only in /api/paypal-webhook.js (server-side).
 */
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnon) {
 console.error(
 "Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env"
 );
}
export const supabase = createClient(supabaseUrl, supabaseAnon);
