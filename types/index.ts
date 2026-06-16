// ─── Core ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Household = {
  id: string
  name: string
  owner_id: string
  max_members: number
  created_at: string
  updated_at: string
}

export type HouseholdMember = {
  id: string
  household_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export type Invitation = {
  id: string
  household_id: string
  token: string
  invited_email: string | null
  created_by: string
  used_by: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

// ─── Points ──────────────────────────────────────────────────────────────────

export type PointsLedger = {
  id: string
  household_id: string
  user_id: string
  month: string          // 'YYYY-MM'
  points: number
  created_at: string
  updated_at: string
}

export const POINTS = {
  CHORE_COMPLETE: 20,
  TASK_COMPLETE: 10,
} as const

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus   = 'todo' | 'in_progress' | 'waiting' | 'completed' | 'archived'

export type Task = {
  id: string
  household_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string | null
  created_by: string
  due_date: string | null
  completed_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type TaskComment = {
  id: string
  task_id: string
  user_id: string
  content: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ─── Chores ──────────────────────────────────────────────────────────────────

export type Chore = {
  id: string
  household_id: string
  name: string
  room: string | null
  target_per_week: number
  created_by: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ChoreLog = {
  id: string
  chore_id: string
  household_id: string
  completed_by: string
  notes: string | null
  deleted_at: string | null   // soft delete — never hard delete
  created_at: string
  updated_at: string
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

export type Reminder = {
  id: string
  household_id: string
  title: string
  note: string | null
  assigned_to: string | null
  due_date: string
  recurrence: RecurrenceType
  snoozed_until: string | null
  is_done: boolean
  deleted_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export type NoteHighlight = {
  line_index: number
  color: 'gold' | 'teal' | 'purple'
}

export type Note = {
  id: string
  household_id: string
  title: string
  content: string
  highlights: NoteHighlight[]
  created_by: string
  last_edited_by: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ─── Activity ────────────────────────────────────────────────────────────────

export type ActivityAction =
  | 'task_created' | 'task_updated' | 'task_completed' | 'task_archived'
  | 'chore_created' | 'chore_completed' | 'chore_log_edited'
  | 'reminder_created' | 'reminder_completed' | 'reminder_updated' | 'reminder_snoozed'
  | 'note_created' | 'note_updated'
  | 'member_joined' | 'member_invited'

export type ActivityLog = {
  id: string
  household_id: string
  user_id: string
  action: ActivityAction
  entity_type: string
  entity_id: string
  entity_title: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

// ─── Enriched / View types ────────────────────────────────────────────────────

export type TaskWithProfiles = Task & {
  assignee: Pick<Profile, 'id' | 'display_name'> | null
  creator:  Pick<Profile, 'id' | 'display_name'>
}

export type ChoreLogWithProfile = ChoreLog & {
  completer: Pick<Profile, 'id' | 'display_name'>
}

export type ActivityLogWithProfile = ActivityLog & {
  actor: Pick<Profile, 'id' | 'display_name'>
}

export type HouseholdWithMembers = Household & {
  members: (HouseholdMember & { profile: Profile })[]
}

export type MonthlyLeaderboard = {
  user_id: string
  display_name: string
  points: number
  pound_value: number   // points / 100
  is_winning: boolean
}
