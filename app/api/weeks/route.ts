import { getAuthUser } from '@/lib/auth-user';
import { getWeeksForAthlete } from '@/lib/db-queries';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const range = parseInt(searchParams.get('range') ?? '8');
  const weeks = await getWeeksForAthlete(supabaseAdmin, user.id, range * 7);
  return Response.json(weeks);
}
