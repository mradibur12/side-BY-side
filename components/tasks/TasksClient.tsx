'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskPriority, TaskStatus, Profile, POINTS } from '@/types'
import { logActivity } from '@/lib/activity'
import { awardPoints } from '@/lib/points'
import { format } from 'date-fns'
import { Plus, X, Check, Archive, Edit2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

type Props = {
  initialTasks: Task[]
  profiles: Profile[]
  currentUserId: string
  householdId: string
  auditMap: Record<string, { who: string; field: string; old: string; new: string; at: string }[]>
}

const PRIORITY_TABS: (TaskPriority | 'all' | 'completed')[] = ['all','critical','high','medium','low','completed']
const BADGE: Record<TaskPriority, string> = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }

export default function TasksClient({ initialTasks, profiles, currentUserId, householdId, auditMap }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTab, setActiveTab] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [openAudit, setOpenAudit] = useState<string | null>(null)
  const supabase = createClient()

  const filtered = tasks.filter(t => {
    if (activeTab === 'all')       return t.status !== 'completed' && t.status !== 'archived'
    if (activeTab === 'completed') return t.status === 'completed'
    return t.priority === activeTab && t.status !== 'archived'
  })

  async function handleCreate(data: Partial<Task>) {
    const { data: newTask, error } = await supabase.from('tasks')
      .insert({ ...data, household_id: householdId, created_by: currentUserId, status: 'todo' })
      .select().single()
    if (error) { toast.error('Failed to create task'); return }
    setTasks(prev => [newTask, ...prev])
    setShowForm(false)
    toast.success('Task added')
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'task_created', entityType: 'task', entityId: newTask.id, entityTitle: newTask.title })
  }

  async function handleUpdate(task: Task, updates: Partial<Task>) {
    const { data: updated, error } = await supabase.from('tasks').update(updates).eq('id', task.id).select().single()
    if (error) { toast.error('Failed to update'); return }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    setEditingTask(null)
    const oldVals = Object.fromEntries(Object.keys(updates).map(k => [k, (task as Record<string, unknown>)[k]]))
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'task_updated', entityType: 'task', entityId: task.id, entityTitle: task.title, oldValues: oldVals, newValues: updates })
  }

  async function handleComplete(task: Task) {
    const newStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed'
    const updates = { status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
    const { data: updated, error } = await supabase.from('tasks').update(updates).eq('id', task.id).select().single()
    if (error) { toast.error('Failed to update'); return }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    if (newStatus === 'completed') {
      toast.success(`Done! +${POINTS.TASK_COMPLETE} pts`)
      await awardPoints(supabase, householdId, currentUserId, 'TASK_COMPLETE')
      await logActivity({ supabase, householdId, userId: currentUserId, action: 'task_completed', entityType: 'task', entityId: task.id, entityTitle: task.title })
    }
  }

  async function handleArchive(task: Task) {
    await supabase.from('tasks').update({ status: 'archived' }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'archived' as TaskStatus } : t))
    toast.success('Archived')
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'task_archived', entityType: 'task', entityId: task.id, entityTitle: task.title })
  }

  async function handleSoftDelete(task: Task) {
    await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
    toast.success('Task removed')
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-sub">{tasks.filter(t => t.status !== 'archived').length} active</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingTask(null) }}>
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="tabs">
        {PRIORITY_TABS.map(tab => (
          <button key={tab} className={`tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      {(showForm || editingTask) && (
        <TaskForm
          task={editingTask} profiles={profiles}
          onSubmit={editingTask ? (d) => handleUpdate(editingTask, d) : handleCreate}
          onCancel={() => { setShowForm(false); setEditingTask(null) }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3 style={{ fontWeight: 600, marginBottom: 4 }}>All clear</h3>
            <p style={{ fontSize: '0.8rem' }}>No tasks in this category</p>
          </div>
        ) : filtered.map(task => {
          const audit = auditMap[task.id] ?? []
          const assignee = profiles.find(p => p.id === task.assigned_to)
          const done = task.status === 'completed'

          return (
            <div key={task.id} className="card" style={{ padding: '12px 14px', opacity: done ? .7 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <button className={`task-check${done ? ' done' : ''}`} onClick={() => handleComplete(task)}>
                  {done && <Check size={11} strokeWidth={3} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: done ? 'var(--ink2)' : 'var(--ink)', textDecoration: done ? 'line-through' : 'none' }}>
                      {task.title}
                    </span>
                    <span className={`badge ${BADGE[task.priority]}`}>{task.priority}</span>
                    {audit.length > 0 && (
                      <span className="edit-badge" onClick={() => setOpenAudit(openAudit === task.id ? null : task.id)}>
                        ✎ {audit.length} edit{audit.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {task.description && <p style={{ fontSize: '0.8rem', color: 'var(--ink2)', marginBottom: 5 }}>{task.description}</p>}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {task.due_date && <span style={{ fontSize: '0.7rem', color: 'var(--ink2)' }}>📅 {format(new Date(task.due_date), 'MMM d')}</span>}
                    {assignee && <span style={{ fontSize: '0.7rem', color: 'var(--ink2)' }}>👤 {assignee.display_name}</span>}
                    {!done && <span className="badge-pts">⭐ +{POINTS.TASK_COMPLETE}</span>}
                  </div>
                  {openAudit === task.id && audit.length > 0 && (
                    <div className="audit-trail open" style={{ marginTop: 8 }}>
                      {audit.map((entry, i) => (
                        <div key={i} className="audit-entry">
                          <span className="audit-who">{entry.who}</span> changed {entry.field} · {entry.at}
                          {' — '}<span className="audit-old">{entry.old}</span>{' → '}<span className="audit-new">{entry.new}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingTask(task); setShowForm(false) }} title="Edit"><Edit2 size={13} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleArchive(task)} title="Archive"><Archive size={13} /></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rust)' }} onClick={() => handleSoftDelete(task)} title="Remove"><X size={13} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskForm({ task, profiles, onSubmit, onCancel }: {
  task: Task | null; profiles: Profile[]
  onSubmit: (d: Partial<Task>) => void; onCancel: () => void
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [desc, setDesc]   = useState(task?.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [status, setStatus]     = useState<TaskStatus>(task?.status ?? 'todo')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '')
  const [dueDate, setDueDate]       = useState(task?.due_date ?? '')

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), description: desc.trim() || null, priority, status, assigned_to: assignedTo || null, due_date: dueDate || null })
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>{task ? 'Edit task' : 'New task'}</div>
      <form onSubmit={onSubmitForm}>
        <div className="form-group">
          <label className="label">Title</label>
          <input className="input" placeholder="What needs doing?" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label className="label">Description</label>
          <textarea className="input" placeholder="Any details..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
              <option value="todo">To do</option><option value="in_progress">In progress</option>
              <option value="waiting">Waiting</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Assign to</label>
            <select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Due date</label>
            <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary">{task ? 'Save changes' : 'Add task'}</button>
        </div>
      </form>
    </div>
  )
}
