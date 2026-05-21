import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { User } from '@/lib/db/types'
import { UsuariosClient } from './client'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('users').select('papel').eq('id', user.id).maybeSingle()
  if (!me || me.papel !== 'admin') redirect('/dashboard')

  const { data } = await supabase
    .from('users')
    .select('*')
    .order('papel', { ascending: true })
    .order('nome')

  return <UsuariosClient usuarios={(data ?? []) as User[]} meuId={user.id} />
}
