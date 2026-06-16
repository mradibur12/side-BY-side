'use client'

import { pointsToGBP } from '@/lib/points'

type Player = {
  user_id: string
  display_name: string
  points: number
  pound_value: number
  is_winning: boolean
}

type Props = { players: Player[] }

export default function Leaderboard({ players }: Props) {
  if (players.length === 0) {
    return (
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--ink2)', textAlign: 'center', padding: '8px 0' }}>
          No points yet this month — complete chores and tasks to get started!
        </div>
      </div>
    )
  }

  const maxPts = Math.max(...players.map(p => p.points), 1)
  const [first, second] = players
  const gap = first && second ? first.points - second.points : 0
  const loser = second ?? null

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ink)' }}>
          🏆 {new Date().toLocaleString('en-GB', { month: 'long' })} leaderboard
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--ink2)', fontWeight: 600 }}>
          {new Date().getDate()} / {new Date(new Date().getFullYear(), new Date().getMonth()+1,0).getDate()} days
        </span>
      </div>

      <div className="lb-grid">
        {players.map((p, i) => (
          <div key={p.user_id} className={`lb-player ${p.is_winning ? 'winning' : 'losing'}`}>
            {p.is_winning && <div className="lb-crown">👑</div>}
            <div className={`lb-avatar ${i === 0 ? 'coral' : 'teal'}`}>
              {p.display_name[0]?.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)' }}>{p.display_name}</div>
            <div className="lb-pts" style={{ color: p.is_winning ? 'var(--coral)' : 'var(--ink2)' }}>
              {p.points}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--ink2)', fontWeight: 600 }}>
              pts · {pointsToGBP(p.points)}
            </div>
          </div>
        ))}
      </div>

      {/* Bar comparison */}
      {players.map((p, i) => (
        <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ink2)', width: 64, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.display_name}
          </span>
          <div style={{ flex: 1, height: 6, background: 'var(--s2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              background: i === 0 ? 'var(--coral)' : 'var(--teal)',
              width: `${Math.round(p.points / maxPts * 100)}%`,
              transition: 'width .5s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ink2)', width: 24, textAlign: 'right' }}>
            {p.points}
          </span>
        </div>
      ))}

      {loser && gap > 0 && (
        <div style={{
          marginTop: 10, padding: '8px 11px', borderRadius: 10,
          background: 'var(--gbg)', border: '1px solid var(--gmid)',
          fontSize: '0.8rem', color: 'var(--gold)', lineHeight: 1.5,
        }}>
          🎁 <strong>{loser.display_name}</strong> is losing by{' '}
          <strong>{gap} pts</strong> — that&apos;s a{' '}
          <strong>{pointsToGBP(gap)} treat</strong> owed.
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--ink3)', marginTop: 8 }}>
        Chore = 20 pts · Task = 10 pts · 100 pts = £1
      </div>
    </div>
  )
}
