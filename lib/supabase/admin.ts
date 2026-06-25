// Service-role Supabase client. BYPASSES row-level security — server-only.
// Used for trusted server tasks: writing the append-only audit_log (which has
// no client INSERT policy) and resolving message audiences / bulk sends.
//
// NEVER import this into a Client Component. The service-role key must stay on
// the server. It is read from SUPABASE_SERVICE_ROLE_KEY (see .env.example).
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set for " +
        "server tasks like audit logging and sending messages. Add it to .env.local."
    );
  }

  if (!cached) {
    cached = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
