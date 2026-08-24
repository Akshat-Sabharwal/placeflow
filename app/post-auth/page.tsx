import { redirect } from 'next/navigation'
import { getVerifiedViewer } from '@/lib/auth'

export default async function PostAuthPage() {
  const viewer = await getVerifiedViewer()
  if (!viewer) redirect('/login')
  if (viewer.role === 'coordinator') redirect('/coordinator')

  const { data: profile } = await viewer.supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', viewer.userId)
    .maybeSingle()

  redirect(profile?.onboarding_completed_at ? '/student' : '/student/onboarding')
}
