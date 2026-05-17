export const maxDuration = 60;
import { getAuthUser } from '@/lib/auth-user';
import { supabaseAdmin } from '@/lib/supabase-server';
import { streamResponse, MODEL } from '@/lib/anthropic';
import { analyzePrompt } from '@/lib/prompts';
import { getWeeksForAthlete } from '@/lib/db-queries';
import type { ParsedWorkout } from '@/types';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { parsed } = await request.json() as { parsed: ParsedWorkout };
  const { data: athlete } = await supabaseAdmin.from('athletes').select('*').eq('id', user.id).single();
  if (!athlete) return new Response('Athlete not found', { status: 404 });
  const weeks = await getWeeksForAthlete(supabaseAdmin, user.id);
  const prompt = analyzePrompt({ name: athlete.name, goal: athlete.goal, plan: athlete.training_plan, initials: '', sport: athlete.sport, units: athlete.units }, parsed, weeks);
  return streamResponse({ model: MODEL, max_tokens: 800, messages: [{ role: 'user', content: prompt }] });
}
