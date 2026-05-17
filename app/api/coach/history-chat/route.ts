export const maxDuration = 60;

import { createRouteClient } from '@/lib/supabase-route-client';
import { streamResponse, MODEL } from '@/lib/anthropic';
import { threadToMessages } from '@/lib/prompts';
import type { ChatMessage } from '@/types';

export async function POST(request: Request) {
  const supabase = createRouteClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { workoutId, thread, message, workoutContext } = await request.json() as {
    workoutId: string;
    thread: ChatMessage[];
    message: string;
    workoutContext: string;
  };

  const { data: athlete } = await supabase
    .from('athletes').select('name, goal, training_plan').eq('id', user.id).single();
  if (!athlete) return new Response('Athlete not found', { status: 404 });

  const system = `You are an analytical, evidence-based endurance running coach. Tone: direct, neutral, no motivational filler. Reference specific numbers.

ATHLETE: ${athlete.name} | Goal: ${athlete.goal}
PLAN: ${athlete.training_plan}

SESSION CONTEXT:
${workoutContext}

You are continuing the analysis conversation for this session. Keep replies tight — 2-3 paragraphs max. Use **bold** for key numbers.`;

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: system },
    ...threadToMessages(thread),
    { role: 'user', content: message },
  ];

  // Save user message to DB
  await supabase.from('messages').insert({
    athlete_id: user.id,
    workout_id: workoutId,
    role: 'user',
    content: message,
  });

  return streamResponse({ model: MODEL, max_tokens: 400, messages });
}
