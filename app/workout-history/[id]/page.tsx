import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server-client';
import HistoryDetail from '@/components/history/history-detail';

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { id } = await params;
  return <HistoryDetail workoutId={id} />;
}
