import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RemindersClient from '@/components/reminders/RemindersClient'
import { Profile } from '@/types'

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const [{ data: reminders }, { data: members }] = await Promise.all([
    supabase
      .from('reminders')
      .select('*')
      .eq('household_id', membership.household_id)
      .is('deleted_at', null)
      .order('due_date'),

    supabase
      .from('household_members')
      .select('user_id, profiles(id, display_name, avatar_url)')
      .eq('household_id', membership.household_id),
  ])

  const profiles: Profile[] = members?.map(m => m.profiles as unknown as Profile).filter(Boolean) ?? []

  return (
    <RemindersClient
      initialReminders={reminders ?? []}
      profiles={profiles}
      currentUserId={user.id}
      householdId={membership.household_id}
    />
  )
}
