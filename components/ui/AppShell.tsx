'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { Home, CheckSquare, RefreshCcw, Bell, StickyNote, LogOut } from 'lucide-react'

type Props = {
  children: React.ReactNode
  profile: Profile | null
  household: { id: string; name: string } | null
}

const navItems = [
  { href: '/dashboard',  label: 'Home',      icon: Home },
  { href: '/tasks',      label: 'Tasks',     icon: CheckSquare },
  { href: '/chores',     label: 'Chores',    icon: RefreshCcw },
  { href: '/reminders',  label: 'Reminders', icon: Bell },
  { href: '/notes',      label: 'Notes',     icon: StickyNote },
]

export default function AppShell({ children, profile, household }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar — desktop only */}
      <aside style={{
        width: 220, minHeight: '100vh', position: 'fixed',
        top: 0, left: 0, bottom: 0, zIndex: 50,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, padding: '20px 12px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 8px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12,
          }}>
            <div style={{
              width: 34, height: 34, background: 'var(--coral)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', flexShrink: 0,
            }}>🏡</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)' }}>
                Side by Side
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink2)', marginTop: 1 }}>
                {household?.name ?? 'Your Home'}
              </div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <Link key={href} href={href} className={`sidebar-nav-item${active ? ' active' : ''}`}>
                  <Icon size={17} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div style={{
          padding: '14px 12px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--cbg)', border: '1.5px solid var(--coral)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--coral)',
          }}>
            {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.display_name ?? 'You'}
          </span>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink2)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'all .13s' }}
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-with-sidebar" style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '6px 4px', borderRadius: 9, textDecoration: 'none',
              background: active ? 'var(--cbg)' : 'transparent',
              transition: 'all .13s',
            }}>
              <Icon size={19} color={active ? 'var(--coral)' : 'var(--ink2)'} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: active ? 'var(--coral)' : 'var(--ink2)' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
