export const maxDuration = 60;
import { getAuthUser } from '@/lib/auth-user';
import { supabaseAdmin } from '@/lib/supabase-server';
import { streamResponse, MODEL } from '@/lib/anthropic';
import { planSystemPrompt, threadToMessages } from '@/lib/prompts';
import { getWeeksForAthlete } from '@/lib/db-queries';
import type { ChatMessage, PlannerRec } from '@/types';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { thread, message, rec } = await request.json() as { thread: ChatMessage[]; message: string; rec: PlannerRec };
  const { data: athlete } = await supabaseAdmin.from('athletes').select('*').eq('id', user.id).single();
  if (!athlete) return new Response('Athlete not found', { status: 404 });
  const weeks = await getWeeksForAthlete(supabaseAdmin, user.id);
  const sys = planSystemPrompt({ name: athlete.name, goal: athlete.goal, plan: athlete.training_plan, initials: '', sport: athlete.sport, units: athlete.units }, rec, weeks);
  const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: sys }, ...threadToMessages(thread), { role: 'user', content: message }];
  return streamResponse({ model: MODEL, max_tokens: 300, messages });
}
