export const maxDuration = 60;
import { getAuthUser } from '@/lib/auth-user';
import { supabaseAdmin } from '@/lib/supabase-server';
import { streamResponse, MODEL } from '@/lib/anthropic';
import { threadToMessages } from '@/lib/prompts';
import type { ChatMessage } from '@/types';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { workoutId, thread, message, workoutContext } = await request.json() as { workoutId: string; thread: ChatMessage[]; message: string; workoutContext: string };
  const { data: athlete } = await supabaseAdmin.from('athletes').select('name,goal,training_plan').eq('id', user.id).single();
  if (!athlete) return new Response('Athlete not found', { status: 404 });
  await supabaseAdmin.from('messages').insert({ athlete_id: user.id, workout_id: workoutId, role: 'user', content: message });
  const sys = `You are an analytical endurance running coach. Tone: direct, neutral.\nATHLETE: ${athlete.name} | Goal: ${athlete.goal}\nSESSION: ${workoutContext}\nContinue the analysis. 2-3 paragraphs max. **bold** for key numbers.`;
  const messages: { role: 'user'|'assistant'; content: string }[] = [{ role:'user', content: sys }, ...threadToMessages(thread), { role:'user', content: message }];
  return streamResponse({ model: MODEL, max_tokens: 400, messages });
}
