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
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 0% 0%, rgba(46,111,229,0.06) 0%, transparent 40%), ' +
          'radial-gradient(circle at 100% 100%, rgba(13,27,62,0.04) 0%, transparent 40%), ' +
          'linear-gradient(180deg, #F0F4FB 0%, #E8EEF8 100%)',
      }}
    >
      <Sidebar papel={perfil.papel as 'admin' | 'operador'} nome={perfil.nome} />
      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
