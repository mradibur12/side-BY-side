import { SupabaseClient } from '@supabase/supabase-js'
import { ActivityAction } from '@/types'

interface LogActivityParams {
  supabase: SupabaseClient
  householdId: string
  userId: string
  action: ActivityAction
  entityType: string
  entityId: string
  entityTitle?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}

export async function logActivity({
  supabase, householdId, userId, action,
  entityType, entityId, entityTitle, oldValues, newValues,
}: LogActivityParams) {
  const { error } = await supabase.from('activity_logs').insert({
    household_id: householdId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_title: entityTitle ?? null,
    old_values: oldValues ?? null,
    new_values: newValues ?? null,
  })
  if (error) console.error('Activity log failed:', error.message)
}

export function formatActivity(
  action: ActivityAction,
  entityTitle: string | null,
  actorName: string,
  pts?: number
): string {
  const t = entityTitle ?? 'something'
  const a = actorName
  const p = pts ? ` (+${pts} pts)` : ''

  switch (action) {
    case 'task_created':      return `${a} added task "${t}"`
    case 'task_completed':    return `${a} completed "${t}"${p}`
    case 'task_updated':      return `${a} updated "${t}"`
    case 'task_archived':     return `${a} archived "${t}"`
    case 'chore_completed':   return `${a} did ${t}${p}`
    case 'chore_created':     return `${a} added chore "${t}"`
    case 'chore_log_edited':  return `${a} edited a log for "${t}"`
    case 'reminder_created':  return `${a} set reminder "${t}"`
    case 'reminder_completed':return `${a} marked "${t}" done`
    case 'reminder_updated':  return `${a} updated reminder "${t}"`
    case 'reminder_snoozed':  return `${a} snoozed "${t}"`
    case 'note_created':      return `${a} created note "${t}"`
    case 'note_updated':      return `${a} edited "${t}"`
    case 'member_joined':     return `${a} joined the household`
    case 'member_invited':    return `${a} invited a partner`
    default:                  return `${a} did something`
  }
}
