import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import InviteSection from '@/components/dashboard/InviteSection'
import Leaderboard from '@/components/dashboard/Leaderboard'
import { formatActivity } from '@/lib/activity'
import { ActivityLog, Profile } from '@/types'
import { getMonthlyLeaderboard } from '@/lib/points'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('household_members').select('household_id, role')
    .eq('user_id', user.id).single()
  if (!membership) redirect('/auth/signup')

  const hid = membership.household_id

  const [
    { data: todayTasks },
    { data: overdueTasks },
    { data: upcomingReminders },
    { data: choreProgress },
    { data: activity },
    { data: members },
  ] = await Promise.all([
    supabase.from('tasks').select('id,title,priority,assigned_to')
      .eq('household_id', hid).eq('due_date', format(new Date(), 'yyyy-MM-dd'))
      .not('status', 'in', '("completed","archived")').is('deleted_at', null),
    supabase.from('tasks').select('id,title,priority')
      .eq('household_id', hid).lt('due_date', format(new Date(), 'yyyy-MM-dd'))
      .not('status', 'in', '("completed","archived")').is('deleted_at', null).limit(5),
    supabase.from('reminders').select('id,title,due_date,recurrence,assigned_to')
      .eq('household_id', hid).eq('is_done', false).is('deleted_at', null)
      .gte('due_date', new Date().toISOString()).order('due_date').limit(5),
    supabase.from('chores').select('id,target_per_week').eq('household_id', hid).is('deleted_at', null),
    supabase.from('activity_logs')
      .select('*, actor:profiles!activity_logs_user_id_fkey(id,display_name)')
      .eq('household_id', hid).order('created_at', { ascending: false }).limit(8),
    supabase.from('household_members').select('user_id,role').eq('household_id', hid),
  ])

  // Chore % this week
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const { data: choreLogs } = await supabase.from('chore_logs')
    .select('chore_id').eq('household_id', hid)
    .gte('created_at', weekStart.toISOString()).is('deleted_at', null)
  const totalTarget = choreProgress?.reduce((s, c) => s + c.target_per_week, 0) ?? 0
  const totalDone = choreLogs?.length ?? 0
  const chorePercent = totalTarget > 0 ? Math.min(100, Math.round(totalDone / totalTarget * 100)) : 0

  const hasPartner = (members?.length ?? 0) >= 2
  const leaderboard = await getMonthlyLeaderboard(supabase as Parameters<typeof getMonthlyLeaderboard>[0], hid)

  function SectionHeader({ title, href, count }: { title: string; href?: string; count?: number }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ink)' }}>
          {title}
          {count != null && count > 0 && (
            <span style={{ marginLeft: 7, fontSize: '0.7rem', background: 'var(--s2)', color: 'var(--ink2)', padding: '1px 7px', borderRadius: 999 }}>{count}</span>
          )}
        </span>
        {href && <Link href={href} style={{ fontSize: '0.75rem', color: 'var(--coral)', fontWeight: 600 }}>View all →</Link>}
      </div>
    )
  }

  const PRIORITY_CLASS: Record<string, string> = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Good {getTimeOfDay()}</h1>
        <p className="page-sub">Here&apos;s your day</p>
      </div>

      {!hasPartner && membership.role === 'owner' && (
        <InviteSection householdId={hid} userId={user.id} />
      )}

      <Leaderboard players={leaderboard} />

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card" style={{ background: 'rgba(240,165,0,.08)', borderColor: 'var(--gmid)' }}>
          <div className="stat-num" style={{ color: 'var(--gold)' }}>{todayTasks?.length ?? 0}</div>
          <div className="stat-lbl" style={{ color: 'var(--gold)' }}>Due today</div>
        </div>
        <div className="stat-card" style={{ background: 'rgba(224,80,80,.08)', borderColor: '#3A1515' }}>
          <div className="stat-num" style={{ color: 'var(--rust)' }}>{overdueTasks?.length ?? 0}</div>
          <div className="stat-lbl" style={{ color: 'var(--rust)' }}>Overdue</div>
        </div>
        <div className="stat-card" style={{ background: 'rgba(255,107,74,.08)', borderColor: 'var(--cmid)' }}>
          <div className="stat-num" style={{ color: 'var(--coral)' }}>{chorePercent}%</div>
          <div className="stat-lbl" style={{ color: 'var(--coral)' }}>Chores done</div>
        </div>
        <div className="stat-card" style={{ background: 'rgba(0,201,167,.07)', borderColor: 'var(--tmid)' }}>
          <div className="stat-num" style={{ color: 'var(--teal)' }}>{upcomingReminders?.length ?? 0}</div>
          <div className="stat-lbl" style={{ color: 'var(--teal)' }}>Reminders</div>
        </div>
      </div>

      {/* Due today */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 10 }}>
        <SectionHeader title="Due today" href="/tasks" count={todayTasks?.length} />
        {todayTasks && todayTasks.length > 0 ? todayTasks.slice(0, 5).map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
            <span className={`badge ${PRIORITY_CLASS[t.priority]}`}>{t.priority}</span>
            <span style={{ flex: 1, fontSize: '0.875rem' }}>{t.title}</span>
          </div>
        )) : (
          <p style={{ color: 'var(--ink3)', fontSize: '0.8rem', padding: '8px 0' }}>Nothing due today 🎉</p>
        )}
      </div>

      {/* Upcoming reminders */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 10 }}>
        <SectionHeader title="Upcoming reminders" href="/reminders" count={upcomingReminders?.length} />
        {upcomingReminders && upcomingReminders.length > 0 ? upcomingReminders.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink2)', whiteSpace: 'nowrap' }}>
              {format(new Date(r.due_date), 'MMM d')}
            </span>
            <span style={{ flex: 1 }}>{r.title}</span>
            {r.recurrence !== 'none' && (
              <span className="recur-chip">{r.recurrence}</span>
            )}
          </div>
        )) : (
          <p style={{ color: 'var(--ink3)', fontSize: '0.8rem', padding: '8px 0' }}>No upcoming reminders</p>
        )}
      </div>

      {/* Activity */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 10 }}>
        <SectionHeader title="Recent activity" />
        {activity && activity.length > 0 ? activity.map((a: ActivityLog & { actor: Pick<Profile, 'id' | 'display_name'> }) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'var(--cbg)', border: '1px solid var(--cmid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: 'var(--coral)',
            }}>
              {a.actor?.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink)' }}>
                {formatActivity(a.action as Parameters<typeof formatActivity>[0], a.entity_title, a.actor?.display_name ?? 'Someone')}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--ink3)', marginTop: 2 }}>
                {format(new Date(a.created_at), 'MMM d, h:mm a')}
              </p>
            </div>
          </div>
        )) : (
          <p style={{ color: 'var(--ink3)', fontSize: '0.8rem', padding: '8px 0' }}>No activity yet — get started!</p>
        )}
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
