'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Reminder, RecurrenceType, Profile } from '@/types'
import { logActivity } from '@/lib/activity'
import { format, isPast, isToday } from 'date-fns'
import { Plus, X, Check, Edit2, Clock, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'

type Props = { initialReminders: Reminder[]; profiles: Profile[]; currentUserId: string; householdId: string }

export default function RemindersClient({ initialReminders, profiles, currentUserId, householdId }: Props) {
  const [reminders, setReminders] = useState(initialReminders)
  const [showForm, setShowForm] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  function isOverdue(r: Reminder) { return !r.is_done && isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date)) && !r.snoozed_until }
  function isDueToday(r: Reminder) { return !r.is_done && isToday(new Date(r.due_date)) }

  const filtered = reminders.filter(r => {
    if (filter === 'overdue')  return isOverdue(r)
    if (filter === 'today')    return isDueToday(r)
    if (filter === 'upcoming') return !r.is_done && !isOverdue(r) && !isDueToday(r)
    if (filter === 'done')     return r.is_done
    return !r.is_done
  })

  async function handleCreate(data: Partial<Reminder>) {
    const { data: newR, error } = await supabase.from('reminders')
      .insert({ ...data, household_id: householdId, created_by: currentUserId })
      .select().single()
    if (error) { toast.error('Failed to create'); return }
    setReminders(prev => [...prev, newR].sort((a, b) => a.due_date.localeCompare(b.due_date)))
    setShowForm(false)
    toast.success('Reminder set')
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'reminder_created', entityType: 'reminder', entityId: newR.id, entityTitle: newR.title })
  }

  async function handleUpdate(reminder: Reminder, data: Partial<Reminder>) {
    const { data: updated, error } = await supabase.from('reminders').update(data).eq('id', reminder.id).select().single()
    if (error) { toast.error('Failed to update'); return }
    setReminders(prev => prev.map(r => r.id === reminder.id ? updated : r))
    setEditingReminder(null)
    toast.success('Updated')
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'reminder_updated', entityType: 'reminder', entityId: reminder.id, entityTitle: reminder.title })
  }

  async function handleDone(reminder: Reminder) {
    if (reminder.recurrence !== 'none') {
      const next = getNextDate(reminder.due_date, reminder.recurrence)
      const { data: updated } = await supabase.from('reminders').update({ due_date: next, snoozed_until: null }).eq('id', reminder.id).select().single()
      if (updated) setReminders(prev => prev.map(r => r.id === reminder.id ? updated : r))
      toast.success(`Next ${reminder.recurrence} reminder set`)
      return
    }
    const { data: updated } = await supabase.from('reminders').update({ is_done: true }).eq('id', reminder.id).select().single()
    if (updated) setReminders(prev => prev.map(r => r.id === reminder.id ? updated : r))
    toast.success('Done ✓')
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'reminder_completed', entityType: 'reminder', entityId: reminder.id, entityTitle: reminder.title })
  }

  async function handleSnooze(reminder: Reminder) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0)
    const { data: updated } = await supabase.from('reminders').update({ snoozed_until: tomorrow.toISOString() }).eq('id', reminder.id).select().single()
    if (updated) setReminders(prev => prev.map(r => r.id === reminder.id ? updated : r))
    toast.success('Snoozed until tomorrow 9am')
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'reminder_snoozed', entityType: 'reminder', entityId: reminder.id, entityTitle: reminder.title })
  }

  async function handleSoftDelete(reminder: Reminder) {
    await supabase.from('reminders').update({ deleted_at: new Date().toISOString() }).eq('id', reminder.id)
    setReminders(prev => prev.filter(r => r.id !== reminder.id))
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
        <div><h1 className="page-title">Reminders</h1><p className="page-sub">{filtered.length} showing</p></div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingReminder(null) }}><Plus size={15} />Add</button>
      </div>

      <div className="tabs">
        {['all','overdue','today','upcoming','done'].map(f => (
          <button key={f} className={`tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>

      {(showForm || editingReminder) && (
        <ReminderForm
          reminder={editingReminder} profiles={profiles}
          onSubmit={editingReminder ? (d) => handleUpdate(editingReminder, d) : handleCreate}
          onCancel={() => { setShowForm(false); setEditingReminder(null) }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔔</div><h3 style={{ fontWeight: 600, marginBottom: 4 }}>No reminders</h3><p style={{ fontSize: '0.8rem' }}>Add your first reminder</p></div>
        ) : filtered.map(reminder => {
          const overdue = isOverdue(reminder); const dueToday = isDueToday(reminder)
          const snoozed = !!reminder.snoozed_until
          const assignee = profiles.find(p => p.id === reminder.assigned_to)
          const cls = snoozed ? 'rem-card snoozed' : overdue ? 'rem-card overdue' : dueToday ? 'rem-card today' : 'rem-card upcoming'

          return (
            <div key={reminder.id} className={cls}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>{reminder.title}</span>
                    {reminder.recurrence !== 'none' && (
                      <span className="recur-chip"><RefreshCcw size={9} />{reminder.recurrence}</span>
                    )}
                    {snoozed && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'var(--s2)', color: 'var(--ink2)', padding: '2px 7px', borderRadius: 999, border: '1px solid var(--border)' }}>💤 Snoozed</span>}
                  </div>
                  {reminder.note && <p style={{ fontSize: '0.8rem', color: 'var(--ink2)', marginBottom: 3 }}>{reminder.note}</p>}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: overdue || dueToday ? 700 : 400, color: overdue ? 'var(--rust)' : dueToday ? 'var(--gold)' : 'var(--ink2)' }}>
                      {overdue ? '⚠️ Overdue · ' : dueToday ? '📅 Today · ' : '📅 '}
                      {format(new Date(reminder.due_date), 'MMM d, yyyy')}
                    </span>
                    {assignee && <span style={{ fontSize: '0.7rem', color: 'var(--ink2)' }}>👤 {assignee.display_name}</span>}
                  </div>
                  <div className="rem-actions">
                    <button className="btn-done btn btn-sm" onClick={() => handleDone(reminder)}><Check size={11} />Done</button>
                    {!snoozed && !reminder.is_done && (
                      <button className="btn-snooze btn btn-sm" onClick={() => handleSnooze(reminder)}><Clock size={11} />Snooze 1 day</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingReminder(reminder); setShowForm(false) }}><Edit2 size={11} />Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rust)' }} onClick={() => handleSoftDelete(reminder)}><X size={11} /></button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReminderForm({ reminder, profiles, onSubmit, onCancel }: {
  reminder: Reminder | null; profiles: Profile[]
  onSubmit: (d: Partial<Reminder>) => void; onCancel: () => void
}) {
  const [title, setTitle]       = useState(reminder?.title ?? '')
  const [note, setNote]         = useState(reminder?.note ?? '')
  const [assignedTo, setAssignedTo] = useState(reminder?.assigned_to ?? '')
  const [dueDate, setDueDate]   = useState(reminder?.due_date ? reminder.due_date.slice(0,16) : '')
  const [recurrence, setRecurrence] = useState<RecurrenceType>(reminder?.recurrence ?? 'none')

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !dueDate) return
    onSubmit({ title: title.trim(), note: note.trim() || null, assigned_to: assignedTo || null, due_date: new Date(dueDate).toISOString(), recurrence })
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>{reminder ? 'Edit reminder' : 'New reminder'}</div>
      <form onSubmit={onSubmitForm}>
        <div className="form-group"><label className="label">Title</label><input className="input" placeholder="What to remember?" value={title} onChange={e => setTitle(e.target.value)} required autoFocus /></div>
        <div className="form-group"><label className="label">Note</label><input className="input" placeholder="Optional details" value={note} onChange={e => setNote(e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="label">Date & time</label><input type="datetime-local" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} required /></div>
          <div className="form-group"><label className="label">Recurrence</label><select className="input" value={recurrence} onChange={e => setRecurrence(e.target.value as RecurrenceType)}><option value="none">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
          <div className="form-group"><label className="label">Assign to</label><select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}><option value="">Anyone</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary">{reminder ? 'Save changes' : 'Set reminder'}</button>
        </div>
      </form>
    </div>
  )
}

function getNextDate(current: string, recurrence: RecurrenceType): string {
  const d = new Date(current)
  if (recurrence === 'daily')   d.setDate(d.getDate() + 1)
  if (recurrence === 'weekly')  d.setDate(d.getDate() + 7)
  if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}
