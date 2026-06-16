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
    <>
      <style>{`
        .app-shell { display: flex; min-height: 100vh; }
        .app-sidebar {
          width: 220px; min-height: 100vh; position: fixed;
          top: 0; left: 0; bottom: 0; z-index: 50;
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
        }
        .app-main { flex: 1; margin-left: 220px; min-height: 100vh; }
        .app-mobile-nav { display: none; }
        .sidebar-nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 12px;
          font-size: 0.875rem; font-weight: 500; color: var(--ink2);
          text-decoration: none; transition: all 0.13s;
          margin-bottom: 2px;
        }
        .sidebar-nav-link:hover { background: var(--s2); color: var(--ink); }
        .sidebar-nav-link.active { background: var(--cbg); color: var(--coral); }
        @media (max-width: 768px) {
          .app-sidebar { display: none !important; }
          .app-main { margin-left: 0 !important; padding-bottom: 70px; }
          .app-mobile-nav {
            display: flex !important;
            position: fixed; bottom: 0; left: 0; right: 0;
            background: var(--surface); border-top: 1px solid var(--border);
            z-index: 100; padding: 6px 4px 4px;
          }
        }
        .mob-nav-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding: 5px 3px; border-radius: 9px;
          text-decoration: none; transition: all 0.13s;
        }
        .mob-nav-btn.active { background: var(--cbg); }
        .mob-nav-label { font-size: 0.6rem; font-weight: 700; }
      `}</style>

      <div className="app-shell">
        {/* Sidebar — desktop only */}
        <aside className="app-sidebar">
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
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)' }}>Side by Side</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--ink2)', marginTop: 1 }}>{household?.name ?? 'Your Home'}</div>
              </div>
            </div>
            <nav>
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href} className={`sidebar-nav-link${active ? ' active' : ''}`}>
                    <Icon size={17} />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
          <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--cbg)',
              border: '1.5px solid var(--coral)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--coral)',
            }}>
              {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.display_name ?? profile?.email?.split('@')[0] ?? 'You'}
            </span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink2)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
              <LogOut size={15} />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="app-main">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="app-mobile-nav">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={`mob-nav-btn${active ? ' active' : ''}`}>
                <Icon size={19} color={active ? 'var(--coral)' : 'var(--ink2)'} />
                <span className="mob-nav-label" style={{ color: active ? 'var(--coral)' : 'var(--ink2)' }}>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
