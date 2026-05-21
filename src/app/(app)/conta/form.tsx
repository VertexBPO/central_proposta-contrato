'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/lib/db/types'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'

export function ContaForm({ perfil }: { perfil: User }) {
  const router = useRouter()
  const supabase = createClient()
  const [nome, setNome] = useState(perfil.nome)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [okNome, setOkNome] = useState(false)
  const [okSenha, setOkSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvarNome() {
    setErro(null)
    setOkNome(false)
    setSalvandoNome(true)
    const { error } = await supabase.from('users').update({ nome: nome.trim() }).eq('id', perfil.id)
    setSalvandoNome(false)
    if (error) {
      setErro(error.message)
      return
    }
    setOkNome(true)
    router.refresh()
  }

  async function trocarSenha() {
    setErro(null)
    setOkSenha(false)
    if (novaSenha.length < 8) {
      setErro('A nova senha precisa ter no mínimo 8 caracteres.')
      return
    }
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) {
      setErro(error.message)
      return
    }
    setOkSenha(true)
    setSenhaAtual('')
    setNovaSenha('')
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader title="Minha conta" />

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge variant={perfil.papel === 'admin' ? 'info' : 'neutral'}>{perfil.papel}</Badge>
          <span style={{ fontSize: 13, color: '#8A9AB5' }}>{perfil.email}</span>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0D1B3E', marginBottom: 12, textTransform: 'uppercase' }}>
          Perfil
        </h3>
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        {okNome && <div style={{ fontSize: 12, color: '#1B9E5C', marginTop: 8 }}>Nome atualizado!</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button onClick={salvarNome} loading={salvandoNome}>Salvar nome</Button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #E5EAF2', margin: '24px 0' }} />

        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0D1B3E', marginBottom: 12, textTransform: 'uppercase' }}>
          Trocar senha
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Nova senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
          />
        </div>
        {okSenha && <div style={{ fontSize: 12, color: '#1B9E5C', marginTop: 8 }}>Senha atualizada!</div>}
        {erro && (
          <div style={{ marginTop: 12, padding: 12, background: '#FCE8E8', color: '#D64545', borderRadius: 10, fontSize: 13 }}>
            {erro}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button onClick={trocarSenha} loading={salvandoSenha} disabled={!novaSenha || novaSenha !== senhaAtual}>
            Trocar senha
          </Button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #E5EAF2', margin: '24px 0' }} />

        <Button variant="ghost" onClick={sair}>
          Sair
        </Button>
      </Card>
    </div>
  )
}
