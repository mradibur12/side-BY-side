import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role, households(id, name)')
    .eq('user_id', user.id)
    .single()

  return (
    <AppShell
      profile={profile}
      household={(membership?.households as { id: string; name: string }) ?? null}
    >
      {children}
    </AppShell>
  )
}
