export const maxDuration = 30;

import { createRouteClient } from '@/lib/supabase-route-client';

export async function GET(request: Request) {
  const supabase = createRouteClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: athlete } = await supabase
    .from('athletes').select('*').eq('id', user.id).single();
  if (!athlete) return new Response('Not found', { status: 404 });

  return Response.json({
    name:          athlete.name,
    initials:      athlete.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
    sport:         athlete.sport,
    goal:          athlete.goal,
    units:         athlete.units,
    plan:          athlete.training_plan,
    coachingNotes: athlete.coaching_notes ?? '',
  });
}

export async function PATCH(request: Request) {
  const supabase = createRouteClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const allowed = ['name', 'goal', 'training_plan', 'coaching_notes', 'units'];
  const update: Record<string, string> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  update['updated_at'] = new Date().toISOString();

  const { error } = await supabase
    .from('athletes').update(update).eq('id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
