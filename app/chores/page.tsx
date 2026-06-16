import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChoresClient from '@/components/chores/ChoresClient'
import { Profile } from '@/types'
import { startOfWeek, endOfWeek } from 'date-fns'

export default async function ChoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase.from('household_members')
    .select('household_id').eq('user_id', user.id).single()
  if (!membership) redirect('/dashboard')

  const hid = membership.household_id
  const ws = startOfWeek(new Date(), { weekStartsOn: 1 })
  const we = endOfWeek(new Date(), { weekStartsOn: 1 })

  const [{ data: chores }, { data: choreLogs }, { data: members }] = await Promise.all([
    supabase.from('chores').select('*').eq('household_id', hid).is('deleted_at', null).order('name'),
    supabase.from('chore_logs')
      .select('*, completer:profiles!chore_logs_completed_by_fkey(id, display_name)')
      .eq('household_id', hid).is('deleted_at', null)
      .gte('created_at', ws.toISOString()).lte('created_at', we.toISOString()),
    supabase.from('household_members').select('user_id, profiles(id, display_name, avatar_url)').eq('household_id', hid),
  ])

  const profiles: Profile[] = members?.map(m => m.profiles as unknown as Profile).filter(Boolean) ?? []

  return (
    <ChoresClient
      initialChores={chores ?? []}
      initialLogs={choreLogs ?? []}
      profiles={profiles}
      currentUserId={user.id}
      householdId={hid}
    />
  )
}
