'use server';

import { createClient } from './supabase-server-client';

/**
 * Server Action — runs on the server with full cookie access.
 * Returns the current Supabase access token, or null if not logged in.
 * Called from apiFetch so the browser never needs to read session cookies itself.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}
