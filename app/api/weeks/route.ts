import { createClient } from '@/lib/supabase-server-client';
import { getWeeksForAthlete } from '@/lib/db-queries';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const range = parseInt(searchParams.get('range') ?? '8');

  const weeks = await getWeeksForAthlete(supabase, user.id, range * 7);
  return Response.json(weeks);
}
