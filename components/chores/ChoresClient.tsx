'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Chore, ChoreLog, Profile, POINTS } from '@/types'
import { logActivity } from '@/lib/activity'
import { awardPoints } from '@/lib/points'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { Plus, X, Check, ChevronLeft, ChevronRight, Edit2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

type LogWithProfile = ChoreLog & { completer: Pick<Profile, 'id' | 'display_name'> }
type Props = {
  initialChores: Chore[]
  initialLogs: LogWithProfile[]
  profiles: Profile[]
  currentUserId: string
  householdId: string
}

const WK_LABELS = ['Jun 9–15', 'Jun 2–8', 'May 26–Jun 1', 'May 19–25']

export default function ChoresClient({ initialChores, initialLogs, profiles, currentUserId, householdId }: Props) {
  const [chores, setChores] = useState(initialChores)
  const [logs, setLogs] = useState(initialLogs)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [wkOffset, setWkOffset] = useState(0)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const supabase = createClient()

  // Chore add form state
  const [newName, setNewName] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [newTarget, setNewTarget] = useState(1)

  const logsForChore = (choreId: string) => logs.filter(l => l.chore_id === choreId && !l.deleted_at)

  const totalTarget = chores.reduce((s, c) => s + c.target_per_week, 0)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
  const weekLogs = logs.filter(l => !l.deleted_at && new Date(l.created_at) >= weekStart && new Date(l.created_at) <= weekEnd)
  const pct = totalTarget > 0 ? Math.min(100, Math.round(weekLogs.length / totalTarget * 100)) : 0

  async function addChore() {
    if (!newName.trim()) return
    const { data, error } = await supabase.from('chores').insert({
      household_id: householdId, created_by: currentUserId,
      name: newName.trim(), room: newRoom.trim() || null, target_per_week: newTarget,
    }).select().single()
    if (error) { toast.error('Failed to add chore'); return }
    setChores(prev => [...prev, data])
    setNewName(''); setNewRoom(''); setNewTarget(1); setShowAddForm(false)
    toast.success('Chore added')
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'chore_created', entityType: 'chore', entityId: data.id, entityTitle: data.name })
  }

  async function logChore(chore: Chore) {
    const { data, error } = await supabase.from('chore_logs')
      .insert({ chore_id: chore.id, household_id: householdId, completed_by: currentUserId })
      .select('*, completer:profiles!chore_logs_completed_by_fkey(id, display_name)').single()
    if (error) { toast.error('Failed to log chore'); return }
    setLogs(prev => [data as LogWithProfile, ...prev])
    toast.success(`${chore.name} done! +${POINTS.CHORE_COMPLETE} pts`)
    await awardPoints(supabase, householdId, currentUserId, 'CHORE_COMPLETE')
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'chore_completed', entityType: 'chore', entityId: chore.id, entityTitle: chore.name })
  }

  async function saveLogEdit(logId: string, oldNotes: string | null) {
    const { error } = await supabase.from('chore_logs').update({ notes: editNotes || null }).eq('id', logId)
    if (error) { toast.error('Failed to save edit'); return }
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, notes: editNotes || null } : l))
    // Record the edit in activity_logs
    await logActivity({
      supabase, householdId, userId: currentUserId,
      action: 'chore_log_edited', entityType: 'chore_log', entityId: logId,
      entityTitle: selectedChore?.name,
      oldValues: { notes: oldNotes },
      newValues: { notes: editNotes || null },
    })
    setEditingLogId(null)
    toast.success('Log updated')
  }

  // Filtered logs for detail view
  const detailLogs = selectedChore ? logs.filter(l => {
    if (l.chore_id !== selectedChore.id || l.deleted_at) return false
    if (period === 'week') {
      const d = new Date(l.created_at)
      const ws = startOfWeek(new Date(Date.now() - wkOffset * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 })
      const we = endOfWeek(ws, { weekStartsOn: 1 })
      return d >= ws && d <= we
    }
    if (period === 'month') {
      const d = new Date(l.created_at)
      const ms = startOfMonth(new Date()); const me = endOfMonth(new Date())
      return d >= ms && d <= me
    }
    return true
  }) : []

  const rCount  = detailLogs.filter(l => l.completed_by === profiles[0]?.id).length
  const rbCount = detailLogs.filter(l => l.completed_by === profiles[1]?.id).length

  if (selectedChore) {
    return (
      <div className="page-container">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setSelectedChore(null)}>
          <ArrowLeft size={14} /> Back to chores
        </button>
        <h1 className="page-title">{selectedChore.name}</h1>
        <p className="page-sub">{selectedChore.room ?? 'General'} · target {selectedChore.target_per_week}× per week · +{POINTS.CHORE_COMPLETE} pts each</p>

        {/* Score boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {profiles.slice(0, 2).map((p, i) => {
            const count = detailLogs.filter(l => l.completed_by === p.id).length
            return (
              <div key={p.id} style={{
                padding: '10px 12px', textAlign: 'center', borderRadius: 12,
                background: i === 0 ? 'var(--cbg)' : 'var(--tbg)',
                border: `1px solid ${i === 0 ? 'var(--cmid)' : 'var(--tmid)'}`,
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 600, color: i === 0 ? 'var(--coral)' : 'var(--teal)' }}>{count}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: i === 0 ? 'var(--coral)' : 'var(--teal)', marginTop: 2 }}>{p.display_name}</div>
              </div>
            )
          })}
          <div style={{ padding: '10px 12px', textAlign: 'center', borderRadius: 12, background: 'var(--s2)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--ink)' }}>{detailLogs.length}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ink2)', marginTop: 2 }}>Total</div>
          </div>
        </div>

        {/* Period nav */}
        <div className="period-nav" style={{
          display: 'flex', marginBottom: 12, background: 'var(--surface)',
          borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden',
        }}>
          {(['week','month','all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              flex: 1, padding: '8px 4px', border: 'none',
              borderRight: p !== 'all' ? '1px solid var(--border)' : 'none',
              background: period === p ? 'var(--coral)' : 'transparent',
              color: period === p ? '#fff' : 'var(--ink2)',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
            }}>
              {p === 'all' ? 'All time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {period === 'week' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWkOffset(o => o + 1)}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)' }}>
              {WK_LABELS[wkOffset] ?? `${wkOffset} weeks ago`}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWkOffset(o => Math.max(0, o - 1))} disabled={wkOffset === 0}><ChevronRight size={14} /></button>
          </div>
        )}

        {/* History */}
        <div className="card" style={{ padding: '4px 14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink2)', padding: '9px 0 7px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>History <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(edit but never delete)</span></span>
          </div>
          {detailLogs.length === 0 ? (
            <p style={{ color: 'var(--ink3)', fontSize: '0.8rem', padding: '14px 0', textAlign: 'center' }}>No completions this period</p>
          ) : detailLogs.map(log => {
            const completer = profiles.find(p => p.id === log.completed_by)
            const isFirst = profiles[0]?.id === log.completed_by
            return (
              <div key={log.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: isFirst ? 'var(--cbg)' : 'var(--tbg)',
                    border: `1px solid ${isFirst ? 'var(--cmid)' : 'var(--tmid)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, color: isFirst ? 'var(--coral)' : 'var(--teal)',
                  }}>
                    {completer?.display_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                      {completer?.display_name ?? 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink2)', marginTop: 1 }}>
                      {format(new Date(log.created_at), 'EEE MMM d, h:mma')}
                    </div>
                    {log.notes && editingLogId !== log.id && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink2)', marginTop: 3, fontStyle: 'italic' }}>
                        &ldquo;{log.notes}&rdquo;
                      </div>
                    )}
                    {editingLogId === log.id && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          className="input" style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          placeholder="Add a note..."
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => saveLogEdit(log.id, log.notes)}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingLogId(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {editingLogId !== log.id && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingLogId(log.id); setEditNotes(log.notes ?? '') }}>
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
          onClick={() => logChore(selectedChore)}>
          <Check size={15} /> Mark done (+{POINTS.CHORE_COMPLETE} pts)
        </button>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
        <div>
          <h1 className="page-title">Chores</h1>
          <p className="page-sub">Tap any chore for history</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={15} /> Add
        </button>
      </div>

      {/* Progress */}
      <div className="card" style={{ padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>This week</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--coral)', letterSpacing: '-.02em' }}>{pct}%</span>
        </div>
        <div className="prog-wrap"><div className="prog-bar" style={{ width: `${pct}%` }} /></div>
        <div style={{ fontSize: '0.75rem', color: 'var(--ink2)', marginTop: 5 }}>{weekLogs.length} of {totalTarget} completions</div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.875rem' }}>New chore</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Chore name</label>
              <input className="input" placeholder="e.g. Vacuuming" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Room</label>
              <input className="input" placeholder="e.g. Bedroom" value={newRoom} onChange={e => setNewRoom(e.target.value)} />
            </div>
            <div>
              <label className="label">Times/week</label>
              <input type="number" className="input" min={1} max={14} value={newTarget} onChange={e => setNewTarget(Number(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={addChore}>Add chore</button>
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Chore list */}
      {chores.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧹</div>
          <h3 style={{ fontWeight: 600, marginBottom: 4 }}>No chores yet</h3>
          <p style={{ fontSize: '0.8rem' }}>Add your first household chore above</p>
        </div>
      ) : chores.map(chore => {
        const choreLogs = logsForChore(chore.id)
        const thisWeekLogs = choreLogs.filter(l => new Date(l.created_at) >= weekStart && new Date(l.created_at) <= weekEnd)
        const done = thisWeekLogs.length
        const target = chore.target_per_week
        const last = choreLogs[0]

        return (
          <div key={chore.id} className="chore-item" onClick={() => setSelectedChore(chore)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{chore.name}</span>
              {chore.room && <span className="badge badge-muted">{chore.room}</span>}
              <span className="badge-pts">⭐ +{POINTS.CHORE_COMPLETE}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="dot-row">
                {Array.from({ length: target }).map((_, i) => (
                  <div key={i} className={`dot${i < done ? ' on' : ''}`} />
                ))}
                <span style={{ fontSize: '0.7rem', color: 'var(--ink2)', marginLeft: 5 }}>{done}/{target}</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--ink2)' }}>
                {last ? `${last.completer?.display_name ?? '?'} · ${format(new Date(last.created_at), 'EEE')}` : 'Not done yet'}
                <ChevronRight size={11} style={{ verticalAlign: -1, marginLeft: 2 }} />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
