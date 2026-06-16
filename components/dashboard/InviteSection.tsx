'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Props = { householdId: string; userId: string }

export default function InviteSection({ householdId, userId }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendInvite() {
    if (!email.trim()) return
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('invitations')
      .insert({ household_id: householdId, created_by: userId, invited_email: email.trim() })
      .select('token').single()

    if (error || !data) { toast.error('Failed to create invite'); setLoading(false); return }

    const link = `${window.location.origin}/auth/signup?invite=${data.token}&email=${encodeURIComponent(email.trim())}`

    // In production you'd email this link. For now copy to clipboard.
    await navigator.clipboard.writeText(link).catch(() => {})
    setSent(true)
    toast.success('Invite link copied! Send it to your partner.')
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{
        background: 'var(--tbg)', border: '1px solid var(--tmid)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 14,
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ✓ Invite link copied
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--teal)', opacity: .8, marginTop: 3 }}>
          Paste and send it to your partner. Link expires in 7 days.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--tbg)', border: '1px solid var(--tmid)',
      borderRadius: 14, padding: '14px 16px', marginBottom: 14,
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--teal)', marginBottom: 3 }}>
        Invite your partner
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--teal)', opacity: .8, marginBottom: 12 }}>
        Enter their email to generate an invite link
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          className="input"
          placeholder="partner@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendInvite()}
          style={{ flex: 1, background: 'var(--surface)' }}
        />
        <button className="btn btn-teal btn-sm" onClick={sendInvite} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Send'}
        </button>
      </div>
    </div>
  )
}
