import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { User } from '@/lib/db/types'
import { ContaForm } from './form'

export const dynamic = 'force-dynamic'

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
  if (!perfil) redirect('/login')

  return <ContaForm perfil={perfil as User} />
}
