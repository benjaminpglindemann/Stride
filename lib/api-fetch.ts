'use client';

import { createClient } from './supabase-browser';

/**
 * Authenticated fetch — attaches the current Supabase access token
 * as a Bearer header so API routes don't depend on cookie parsing.
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

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
