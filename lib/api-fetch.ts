'use client';

import { getAccessToken } from './actions';

/**
 * Authenticated fetch — retrieves the Supabase access token via a Server Action
 * (which has full cookie access server-side) and sends it as a Bearer header.
 * This bypasses all client-side cookie/session retrieval issues.
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();

  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
