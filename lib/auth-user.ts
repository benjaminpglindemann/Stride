import { supabaseAdmin } from './supabase-server';

/**
 * Verifies the Bearer token in an API request's Authorization header.
 * Returns the user object, or null if missing/invalid.
 * Does NOT rely on cookies — works even when cookie-based session
 * reconstruction fails (e.g. chunked cookies in Edge runtime).
 */
export async function getAuthUser(
  request: Request,
): Promise<{ id: string; email?: string } | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}
