'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/lib/db/types'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Modal } from '@/components/Modal'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'
import { criarUsuario, alternarAtivo } from './actions'

interface Props {
  usuarios: User[]
  meuId: string
}

export function UsuariosClient({ usuarios, meuId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<'admin' | 'operador'>('operador')
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$'
    let s = ''
    for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)]
    setSenha(s)
  }

  async function criar() {
    setErro(null)
    setSalvando(true)
    const r = await criarUsuario({ nome, email, papel, senha })
    setSalvando(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao criar.')
      return
    }
    setNome('')
    setEmail('')
    setSenha('')
    setOpen(false)
    startTransition(() => router.refresh())
  }

  async function toggle(id: string, ativo: boolean) {
    const r = await alternarAtivo(id, !ativo)
    if (!r.ok) {
      alert(r.erro ?? 'Erro')
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Usuários"
        subtitle={`${usuarios.length} usuário(s) cadastrado(s)`}
        actions={<Button onClick={() => setOpen(true)}>+ Novo usuário</Button>}
      />

      <Card>
        {usuarios.length === 0 ? (
          <p style={{ color: '#8A9AB5' }}>Nenhum usuário ainda.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5EAF2' }}>
                <th style={th}>Nome</th>
                <th style={th}>E-mail</th>
                <th style={th}>Papel</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #E5EAF2' }}>
                  <td style={td}>{u.nome}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    <Badge variant={u.papel === 'admin' ? 'info' : 'neutral'}>{u.papel}</Badge>
                  </td>
                  <td style={td}>
                    <Badge variant={u.ativo ? 'success' : 'error'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td style={td}>
                    {u.id !== meuId && (
                      <Button variant="ghost" onClick={() => toggle(u.id, u.ativo)}>
                        {u.ativo ? 'Desativar' : 'Reativar'}
                      </Button>
                    )}
                    {u.id === meuId && <span style={{ fontSize: 11, color: '#8A9AB5' }}>(você)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo usuário" maxWidth={500}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select label="Papel" value={papel} onChange={(e) => setPapel(e.target.value as 'admin' | 'operador')}>
            <option value="operador">Operador</option>
            <option value="admin">Admin</option>
          </Select>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input label="Senha temporária (mín. 8)" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={gerarSenha}>
              Gerar
            </Button>
          </div>

          {erro && (
            <div style={{ background: '#FCE8E8', color: '#D64545', padding: 12, borderRadius: 10, fontSize: 13 }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={criar} loading={salvando}>Criar usuário</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: '#8A9AB5',
  textTransform: 'uppercase',
}
const td: React.CSSProperties = { padding: '12px 8px', verticalAlign: 'middle' }
