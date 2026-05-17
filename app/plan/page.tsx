import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server-client';
import PlanView from '@/components/plan/plan-view';

export const metadata = { title: 'Training plan — Stride' };

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <PlanView />;
}
