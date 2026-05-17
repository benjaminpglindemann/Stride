import { createServerClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in API route handlers.
 * Reads auth cookies directly from the Request object (more reliable
 * than cookies() from next/headers in route handler context).
 */
export function createRouteClient(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = cookieHeader
    .split(';')
    .filter(Boolean)
    .map(c => {
      const idx = c.indexOf('=');
      return idx === -1
        ? { name: c.trim(), value: '' }
        : { name: c.slice(0, idx).trim(), value: c.slice(idx + 1).trim() };
    });

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookies,
        setAll:  () => {},   // route handlers don't set cookies
      },
    },
  );
}
