export const maxDuration = 60;

import { createClient } from '@/lib/supabase-server-client';
import { streamResponse, MODEL } from '@/lib/anthropic';
import { chatSystemPrompt, threadToMessages } from '@/lib/prompts';
import { getWeeksForAthlete } from '@/lib/db-queries';
import type { ParsedWorkout, ChatMessage } from '@/types';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { parsed, thread, message, initialAnalysis } = await request.json() as {
    parsed: ParsedWorkout;
    thread: ChatMessage[];
    message: string;
    initialAnalysis: string;
  };

  const { data: athlete } = await supabase
    .from('athletes').select('*').eq('id', user.id).single();
  if (!athlete) return new Response('Athlete not found', { status: 404 });

  const weeks = await getWeeksForAthlete(supabase, user.id);

  const systemPrompt = chatSystemPrompt(
    { name: athlete.name, goal: athlete.goal, plan: athlete.training_plan,
      initials: '', sport: athlete.sport, units: athlete.units },
    parsed, weeks, initialAnalysis,
  );

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: systemPrompt },
    ...threadToMessages(thread),
    { role: 'user', content: message },
  ];

  return streamResponse({ model: MODEL, max_tokens: 600, messages });
}
