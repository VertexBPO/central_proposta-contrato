import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Contractor } from '@/lib/db/types'
import { ContratantesClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ContratantesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('users').select('papel').eq('id', user.id).maybeSingle()
  if (!me || me.papel !== 'admin') redirect('/dashboard')

  const { data } = await supabase.from('contractors').select('*').order('razao_social')
  return <ContratantesClient contratantes={(data ?? []) as Contractor[]} />
}
