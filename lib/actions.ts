'use server';

import { createClient } from './supabase-server-client';

/**
 * Server Action — runs on the server with full cookie access.
 * Returns a valid (auto-refreshed) Supabase access token, or null.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = await createClient();

    // getUser() validates the token against Supabase — auto-refreshes via the
    // server client's cookie setAll handler if the stored token is expired.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // After getUser(), the session cookie may have been refreshed.
    // Read the (possibly updated) session to get the current access token.
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}
