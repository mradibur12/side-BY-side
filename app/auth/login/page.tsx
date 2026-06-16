'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)',
      padding: 32, width: '100%', maxWidth: 420,
    }}>
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: 6 }}>
        Welcome back
      </h1>
      <p style={{ color: 'var(--ink2)', fontSize: '0.875rem', marginBottom: 28 }}>
        Sign in to your household
      </p>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="form-group">
          <label className="label">Password</label>
          <input type="password" className="input" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button type="submit" className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Sign in'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--ink2)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" style={{ color: 'var(--coral)', fontWeight: 600 }}>Sign up</Link>
      </p>
    </div>
  )
}
