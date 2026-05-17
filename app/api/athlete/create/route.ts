import { supabaseAdmin } from '@/lib/supabase-server';

// Public endpoint — called right after signUp before the session is established.
// Uses service role to insert so RLS timing issues don't block new user setup.
export async function POST(request: Request) {
  const body = await request.json();
  const { id, email, name, sport, goal, training_plan, units } = body;
  if (!id || !email) return new Response('Missing fields', { status: 400 });

  const { error } = await supabaseAdmin.from('athletes').upsert({
    id, email, name: name || email.split('@')[0],
    sport: sport || 'running',
    goal: goal || '',
    training_plan: training_plan || '',
    units: units || 'metric',
    coaching_notes: '',
  }, { onConflict: 'id' });

  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true });
}
