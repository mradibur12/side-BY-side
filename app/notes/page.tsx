import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotesClient from '@/components/notes/NotesClient'

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: notes } = await supabase
    .from('notes')
    .select('*, creator:profiles!notes_created_by_fkey(id, display_name), editor:profiles!notes_last_edited_by_fkey(id, display_name)')
    .eq('household_id', membership.household_id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  return (
    <NotesClient
      initialNotes={notes ?? []}
      currentUserId={user.id}
      householdId={membership.household_id}
    />
  )
}
