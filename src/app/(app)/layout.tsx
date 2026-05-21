import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('users')
    .select('nome, papel, ativo')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || !perfil.ativo) {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0F4FB' }}>
      <Sidebar papel={perfil.papel as 'admin' | 'operador'} nome={perfil.nome} />
      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
