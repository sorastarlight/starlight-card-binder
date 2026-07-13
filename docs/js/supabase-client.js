import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl =
"https://noxfauxbfdqgoxgiwrpu.supabase.co";

const supabaseAnonKey =
"sb_publishable_2M6ZMyz6KXAkaKD6AI6Bvg_DxCh1-JW";

export const supabase =
createClient(
    supabaseUrl,
    supabaseAnonKey
);