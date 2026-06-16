'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type InvitationInfo = {
  household_id: string
  household_name: string
  inviter_name: string
  expires_at: string
}

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)

  // New account fields
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadInvitation() {
      const supabase = createClient()

      const { data: inv } = await supabase
        .from('invitations')
        .select('household_id, expires_at, used_at, created_by')
        .eq('token', token)
        .single()

      if (!inv || inv.used_at || new Date(inv.expires_at) < new Date()) {
        setInvalid(true)
        setLoading(false)
        return
      }

      const { data: household } = await supabase
        .from('households')
        .select('name')
        .eq('id', inv.household_id)
        .single()

      const { data: inviter } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', inv.created_by)
        .single()

      setInvitation({
        household_id: inv.household_id,
        household_name: household?.name ?? 'a household',
        inviter_name: inviter?.display_name ?? 'Someone',
        expires_at: inv.expires_at,
      })
      setLoading(false)
    }

    loadInvitation()
  }, [token])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!invitation) return
    setSubmitting(true)

    const supabase = createClient()

    // Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })

    if (authError || !authData.user) {
      toast.error(authError?.message ?? 'Sign up failed')
      setSubmitting(false)
      return
    }

    const userId = authData.user.id

    // Add to household
    const { error: memberError } = await supabase.from('household_members').insert({
      household_id: invitation.household_id,
      user_id: userId,
      role: 'member',
    })

    if (memberError) {
      toast.error('Failed to join household')
      setSubmitting(false)
      return
    }

    // Mark invitation as used
    await supabase
      .from('invitations')
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq('token', token)

    // Log activity
    await supabase.from('activity_logs').insert({
      household_id: invitation.household_id,
      user_id: userId,
      action: 'member_joined',
      entity_type: 'household',
      entity_id: invitation.household_id,
      entity_title: invitation.household_name,
    })

    toast.success(`Welcome to ${invitation.household_name}! 🏡`)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <span className="spinner" />
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>😕</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '8px' }}>
          This invite is no longer valid
        </h2>
        <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          It may have expired or already been used.
        </p>
        <Link href="/auth/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div className="card" style={{ maxWidth: 420, width: '100%', padding: '32px' }}>
      <div style={{
        background: 'var(--color-sage-light)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        marginBottom: '24px',
      }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-sage-dark)' }}>
          <strong>{invitation?.inviter_name}</strong> invited you to join{' '}
          <strong>{invitation?.household_name}</strong> 🏡
        </p>
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.4rem',
        fontWeight: 500,
        marginBottom: '6px',
      }}>Create your account</h1>
      <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
        You&apos;ll be added to the household automatically.
      </p>

      <form onSubmit={handleJoin}>
        <div className="form-group">
          <label className="label">Your name</label>
          <input
            type="text"
            className="input-field"
            placeholder="Sam"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="label">Email</label>
          <input
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="label">Password</label>
          <input
            type="password"
            className="input-field"
            placeholder="At least 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={submitting}
        >
          {submitting ? <span className="spinner" /> : `Join ${invitation?.household_name}`}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
        Already have an account?{' '}
        <Link href={`/auth/login?redirect=/join/${token}`} style={{ color: 'var(--color-sage-dark)', fontWeight: 600 }}>
          Sign in instead
        </Link>
      </p>
    </div>
  )
}
