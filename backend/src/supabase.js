import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
}
if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
  throw new Error('SUPABASE_URL must be the https://<project-ref>.supabase.co project URL.');
}
if (key.startsWith('sb_publishable_') || key.startsWith('sb_anon_')) {
  throw new Error('Use the Supabase service_role key in SUPABASE_SERVICE_ROLE_KEY, not a publishable or anon key.');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});
export const ASSETS_BUCKET = process.env.SUPABASE_ASSETS_BUCKET || 'app-assets';
export const DOWNLOADS_BUCKET = process.env.SUPABASE_DOWNLOADS_BUCKET || 'app-downloads';
