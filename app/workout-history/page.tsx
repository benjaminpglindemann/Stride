import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server-client';
import HistoryList from '@/components/history/history-list';

export const metadata = { title: 'Workout history — Stride' };

export default async function WorkoutHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <HistoryList />;
}
