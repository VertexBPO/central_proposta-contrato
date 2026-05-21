import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Parameters } from '@/lib/db/types'
import { ParametrosForm } from './form'

export const dynamic = 'force-dynamic'

export default async function ParametrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('users').select('papel').eq('id', user.id).maybeSingle()
  if (!me || me.papel !== 'admin') redirect('/dashboard')

  const { data } = await supabase.from('parameters').select('*').eq('id', 1).maybeSingle()
  return <ParametrosForm parametros={data as Parameters} />
}
