import { SupabaseClient } from '@supabase/supabase-js'
import { POINTS } from '@/types'

export async function awardPoints(
  supabase: SupabaseClient,
  householdId: string,
  userId: string,
  action: keyof typeof POINTS
) {
  const pts = POINTS[action]
  const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

  await supabase.rpc('award_points', {
    p_household_id: householdId,
    p_user_id: userId,
    p_points: pts,
    p_month: month,
  })
}

export async function getMonthlyLeaderboard(
  supabase: SupabaseClient,
  householdId: string,
  month?: string
) {
  const m = month ?? new Date().toISOString().slice(0, 7)

  const { data } = await supabase
    .from('points_ledger')
    .select('user_id, points, profiles(display_name)')
    .eq('household_id', householdId)
    .eq('month', m)
    .order('points', { ascending: false })

  if (!data) return []

  const total = data.reduce((s, r) => s + r.points, 0)
  const maxPts = data[0]?.points ?? 0

  return data.map((r, i) => ({
    user_id: r.user_id,
    display_name: (r.profiles as { display_name: string | null })?.display_name ?? 'Unknown',
    points: r.points,
    pound_value: +(r.points / 100).toFixed(2),
    is_winning: i === 0 && r.points > 0,
  }))
}

export function pointsToGBP(points: number): string {
  return `£${(points / 100).toFixed(2)}`
}
