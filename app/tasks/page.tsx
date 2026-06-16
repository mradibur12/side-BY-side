import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TasksClient from '@/components/tasks/TasksClient'
import { Profile } from '@/types'
import { format } from 'date-fns'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase.from('household_members')
    .select('household_id').eq('user_id', user.id).single()
  if (!membership) redirect('/dashboard')

  const hid = membership.household_id

  const [{ data: tasks }, { data: members }, { data: activityLogs }] = await Promise.all([
    supabase.from('tasks').select('*').eq('household_id', hid).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('household_members').select('user_id, profiles(id, display_name, avatar_url)').eq('household_id', hid),
    supabase.from('activity_logs')
      .select('entity_id, old_values, new_values, created_at, actor:profiles!activity_logs_user_id_fkey(display_name)')
      .eq('household_id', hid).eq('action', 'task_updated').order('created_at', { ascending: false }),
  ])

  const profiles: Profile[] = members?.map(m => m.profiles as unknown as Profile).filter(Boolean) ?? []

  // Build audit map: task_id -> array of edit summaries
  type AuditEntry = { who: string; field: string; old: string; new: string; at: string }
  const auditMap: Record<string, AuditEntry[]> = {}
  activityLogs?.forEach(log => {
    const id = log.entity_id
    if (!auditMap[id]) auditMap[id] = []
    const old = log.old_values ?? {}
    const nw  = log.new_values ?? {}
    const actor = (log.actor as { display_name: string | null })?.display_name ?? 'Someone'
    Object.keys(nw).forEach(field => {
      auditMap[id].push({
        who: actor, field,
        old: String((old as Record<string, unknown>)[field] ?? '—'),
        new: String((nw as Record<string, unknown>)[field] ?? '—'),
        at: format(new Date(log.created_at), 'MMM d, h:mma'),
      })
    })
  })

  return (
    <TasksClient
      initialTasks={tasks ?? []}
      profiles={profiles}
      currentUserId={user.id}
      householdId={hid}
      auditMap={auditMap}
    />
  )
}
