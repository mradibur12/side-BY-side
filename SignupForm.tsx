'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const inviteToken = params.get('invite')

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading] = useState(false)

  const isInvite = !!inviteToken

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    })
    if (authError || !authData.user) { toast.error(authError?.message ?? 'Signup failed'); setLoading(false); return }

    const userId = authData.user.id

    if (isInvite) {
      const { data: inv } = await supabase
        .from('invitations').select('household_id, expires_at, used_at')
        .eq('token', inviteToken).single()

      if (!inv || inv.used_at || new Date(inv.expires_at) < new Date()) {
        toast.error('This invite has expired or already been used')
        setLoading(false)
        return
      }

      await supabase.from('household_members').insert({ household_id: inv.household_id, user_id: userId, role: 'member' })
      await supabase.from('invitations').update({ used_by: userId, used_at: new Date().toISOString() }).eq('token', inviteToken)
      await supabase.from('activity_logs').insert({
        household_id: inv.household_id, user_id: userId,
        action: 'member_joined', entity_type: 'household',
        entity_id: inv.household_id, entity_title: 'household',
      })
      toast.success('You joined the household!')
    } else {
      const { data: household, error: hErr } = await supabase
        .from('households')
        .insert({ name: householdName || `${displayName}'s Home`, owner_id: userId })
        .select().single()

      if (hErr || !household) { toast.error('Failed to create household'); setLoading(false); return }

      await supabase.from('household_members').insert({ household_id: household.id, user_id: userId, role: 'owner' })
      await supabase.from('activity_logs').insert({
        household_id: household.id, user_id: userId,
        action: 'member_joined', entity_type: 'household',
        entity_id: household.id, entity_title: household.name,
      })
      toast.success('Household created!')
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)',
      padding: 32, width: '100%', maxWidth: 420,
    }}>
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: 6 }}>
        {isInvite ? 'Join the household' : 'Create your home'}
      </h1>
      <p style={{ color: 'var(--ink2)', fontSize: '0.875rem', marginBottom: 28 }}>
        {isInvite ? 'Set up your account to get started' : 'Set up your household and invite your partner later'}
      </p>
      <form onSubmit={handleSignup}>
        <div className="form-group">
          <label className="label">Your name</label>
          <input type="text" className="input" placeholder="Radib"
            value={displayName} onChange={e => setDisplayName(e.target.value)} required />
        </div>
        {!isInvite && (
          <div className="form-group">
            <label className="label">Household name</label>
            <input type="text" className="input" placeholder="Our Home"
              value={householdName} onChange={e => setHouseholdName(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="form-group">
          <label className="label">Password</label>
          <input type="password" className="input" placeholder="At least 6 characters"
            value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
        </div>
        <button type="submit" className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
          {loading ? <span className="spinner" /> : (isInvite ? 'Join household' : 'Create household')}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--ink2)' }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: 'var(--coral)', fontWeight: 600 }}>Sign in</Link>
      </p>
    </div>
  )
}
