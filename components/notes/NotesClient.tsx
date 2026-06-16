'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Note, NoteHighlight } from '@/types'
import { logActivity } from '@/lib/activity'
import { format } from 'date-fns'
import { Plus, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

type NoteWithProfiles = Note & {
  creator: { id: string; display_name: string | null } | null
  editor:  { id: string; display_name: string | null } | null
}

type Props = {
  initialNotes: NoteWithProfiles[]
  currentUserId: string
  householdId: string
}

const HIGHLIGHT_CYCLE: (NoteHighlight['color'] | null)[] = [null, 'gold', 'teal', 'purple']

export default function NotesClient({ initialNotes, currentUserId, householdId }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [selectedId, setSelectedId] = useState(initialNotes[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loggedRef = useRef<Set<string>>(new Set())
  const supabase = createClient()

  const selected = notes.find(n => n.id === selectedId) ?? null

  async function handleCreate() {
    const { data, error } = await supabase.from('notes')
      .insert({ household_id: householdId, created_by: currentUserId })
      .select('*, creator:profiles!notes_created_by_fkey(id, display_name), editor:profiles!notes_last_edited_by_fkey(id, display_name)')
      .single()
    if (error) { toast.error('Failed to create note'); return }
    setNotes(prev => [data as NoteWithProfiles, ...prev])
    setSelectedId(data.id)
    await logActivity({ supabase, householdId, userId: currentUserId, action: 'note_created', entityType: 'note', entityId: data.id, entityTitle: data.title })
  }

  async function handleDelete(note: NoteWithProfiles) {
    await supabase.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', note.id)
    const remaining = notes.filter(n => n.id !== note.id)
    setNotes(remaining)
    setSelectedId(remaining[0]?.id ?? null)
    toast.success('Note deleted')
  }

  const autosave = useCallback(async (id: string, title: string, content: string) => {
    setSaving(true)
    await supabase.from('notes').update({ title, content, last_edited_by: currentUserId }).eq('id', id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content, updated_at: new Date().toISOString() } : n))
  }, [supabase, currentUserId])

  function onFieldChange(field: 'title' | 'content', value: string) {
    if (!selected) return
    setNotes(prev => prev.map(n => n.id === selected.id ? { ...n, [field]: value } : n))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const n = notes.find(x => x.id === selected.id)
      if (!n) return
      autosave(selected.id, field === 'title' ? value : n.title, field === 'content' ? value : n.content)
      if (!loggedRef.current.has(selected.id)) {
        loggedRef.current.add(selected.id)
        logActivity({ supabase, householdId, userId: currentUserId, action: 'note_updated', entityType: 'note', entityId: selected.id, entityTitle: selected.title })
      }
    }, 800)
  }

  function cycleHighlight(lineIdx: number) {
    if (!selected) return
    const hl = selected.highlights ?? []
    const existing = hl.find(h => h.line_index === lineIdx)
    const curIdx = HIGHLIGHT_CYCLE.indexOf(existing?.color ?? null)
    const nextColor = HIGHLIGHT_CYCLE[(curIdx + 1) % HIGHLIGHT_CYCLE.length]
    const newHl: NoteHighlight[] = nextColor
      ? [...hl.filter(h => h.line_index !== lineIdx), { line_index: lineIdx, color: nextColor }]
      : hl.filter(h => h.line_index !== lineIdx)
    setNotes(prev => prev.map(n => n.id === selected.id ? { ...n, highlights: newHl } : n))
    supabase.from('notes').update({ highlights: newHl }).eq('id', selected.id)
  }

  function applyHighlightAll(color: NoteHighlight['color']) {
    if (!selected) return
    const lines = selected.content.split('\n')
    const nonEmpty = lines.map((l, i) => ({ l, i })).filter(x => x.l.trim())
    if (!nonEmpty.length) return
    const pick = nonEmpty[Math.floor(Math.random() * nonEmpty.length)]
    const hl = [...(selected.highlights ?? []).filter(h => h.line_index !== pick.i), { line_index: pick.i, color }]
    setNotes(prev => prev.map(n => n.id === selected.id ? { ...n, highlights: hl } : n))
    supabase.from('notes').update({ highlights: hl }).eq('id', selected.id)
  }

  const HIGHLIGHT_COLOR_MAP: Record<NoteHighlight['color'], string> = {
    gold:   'note-line hl-gold',
    teal:   'note-line hl-teal',
    purple: 'note-line hl-purple',
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: 200, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 12px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}>Notes</span>
          <button className="btn btn-primary btn-sm" onClick={handleCreate}><Plus size={13} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {notes.map(note => (
            <button key={note.id} onClick={() => setSelectedId(note.id)} style={{
              width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 10,
              border: selectedId === note.id ? '1px solid var(--cmid)' : '1px solid transparent',
              background: selectedId === note.id ? 'var(--cbg)' : 'transparent',
              cursor: 'pointer', marginBottom: 2, transition: 'all .12s',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedId === note.id ? 'var(--coral)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {note.title || 'Untitled'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink2)', marginTop: 1 }}>
                {format(new Date(note.updated_at), 'MMM d')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', color: saving ? 'var(--gold)' : saved ? 'var(--sage)' : 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {saving ? <><span className="spinner" style={{ width: 12, height: 12 }} />Saving…</> : saved ? <><Check size={12} />Saved</> : `Edited ${format(new Date(selected.updated_at), 'MMM d, h:mm a')}`}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rust)' }} onClick={() => handleDelete(selected)}>
                <X size={13} /> Delete
              </button>
            </div>
            <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
              <input
                value={selected.title}
                onChange={e => onFieldChange('title', e.target.value)}
                placeholder="Note title"
                style={{ width: '100%', fontWeight: 600, fontSize: '1.25rem', border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', marginBottom: 16 }}
              />
              {/* Rendered lines with highlight toggle */}
              <div style={{ fontSize: '0.875rem', lineHeight: 1.8, marginBottom: 12 }}>
                {selected.content.split('\n').map((line, i) => {
                  const hl = selected.highlights?.find(h => h.line_index === i)
                  return (
                    <span key={i} className={hl ? HIGHLIGHT_COLOR_MAP[hl.color] : 'note-line'} onClick={() => cycleHighlight(i)}>
                      {line || '\u00A0'}
                    </span>
                  )
                })}
              </div>
              <textarea
                value={selected.content}
                onChange={e => onFieldChange('content', e.target.value)}
                placeholder="Start writing..."
                style={{ width: '100%', minHeight: 200, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--s2)', color: 'var(--ink)', fontSize: '0.875rem', lineHeight: 1.7, resize: 'vertical' }}
              />
            </div>
            {/* Highlight bar */}
            <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--ink2)', marginRight: 4 }}>Mark a line:</span>
              {(['gold','teal','purple'] as NoteHighlight['color'][]).map(c => (
                <button key={c} onClick={() => applyHighlightAll(c)} style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                  cursor: 'pointer', border: '1px solid',
                  background: c === 'gold' ? 'rgba(240,165,0,.15)' : c === 'teal' ? 'rgba(0,201,167,.1)' : 'rgba(139,127,255,.14)',
                  color: c === 'gold' ? 'var(--gold)' : c === 'teal' ? 'var(--teal)' : 'var(--purple)',
                  borderColor: c === 'gold' ? 'var(--gmid)' : c === 'teal' ? 'var(--tmid)' : 'var(--pmid)',
                }}>
                  {c === 'gold' ? '⭐ Important' : c === 'teal' ? '✓ Done' : '! Urgent'}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ height: '100%' }}>
            <div className="empty-icon">📝</div>
            <h3 style={{ fontWeight: 600, marginBottom: 4 }}>No note selected</h3>
            <p style={{ fontSize: '0.8rem', marginBottom: 16 }}>Pick a note or create a new one</p>
            <button className="btn btn-primary" onClick={handleCreate}><Plus size={14} /> New note</button>
          </div>
        )}
      </div>
    </div>
  )
}
