export const maxDuration = 60;

import { createClient } from '@/lib/supabase-server-client';
import { streamResponse, MODEL } from '@/lib/anthropic';
import { briefPrompt } from '@/lib/prompts';
import { getWeeksForAthlete } from '@/lib/db-queries';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: athlete } = await supabase
    .from('athletes').select('*').eq('id', user.id).single();
  if (!athlete) return new Response('Athlete not found', { status: 404 });

  const weeks = await getWeeksForAthlete(supabase, user.id);

  const prompt = briefPrompt(
    { name: athlete.name, goal: athlete.goal, plan: athlete.training_plan,
      initials: '', sport: athlete.sport, units: athlete.units },
    weeks,
  );

  return streamResponse({ model: MODEL, max_tokens: 300, messages: [{ role: 'user', content: prompt }] });
}
