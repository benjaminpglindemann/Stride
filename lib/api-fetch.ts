'use client';

import { createClient } from './supabase-browser';

/**
 * Authenticated fetch — attaches a fresh Supabase access token
 * as a Bearer header so API routes don't depend on cookie parsing.
 * Always tries to refresh if the stored token is expired.
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const supabase = createClient();

  // getSession() returns the stored token; refreshSession() ensures freshness
  let { data: { session } } = await supabase.auth.getSession();

  // If token is expired (or about to expire in next 60s), force a refresh
  if (session && session.expires_at) {
    const expiresAt = session.expires_at * 1000;
    if (expiresAt < Date.now() + 60_000) {
      const { data } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });
      if (data.session) session = data.session;
    }
  }

  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
  });
}
