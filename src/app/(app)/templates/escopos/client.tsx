'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScopeTemplate, slugify } from '@/lib/db/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { Modal } from '@/components/Modal'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'

interface Props {
  escopos: ScopeTemplate[]
}

export function TemplatesEscoposClient({ escopos }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ScopeTemplate | null>(null)
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [descricao, setDescricao] = useState('')
  const [corpo, setCorpo] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrirNovo() {
    setEditing(null)
    setNome('')
    setSlug('')
    setDescricao('')
    setCorpo('')
    setAtivo(true)
    setErro(null)
    setOpen(true)
  }

  function abrirEdicao(s: ScopeTemplate) {
    setEditing(s)
    setNome(s.nome)
    setSlug(s.slug)
    setDescricao(s.descricao ?? '')
    setCorpo(s.corpo)
    setAtivo(s.ativo)
    setErro(null)
    setOpen(true)
  }

  async function salvar() {
    setErro(null)
    if (!nome.trim() || !slug.trim() || !corpo.trim()) {
      setErro('Preencha nome, slug e corpo do escopo.')
      return
    }
    setSalvando(true)
    const payload = {
      nome: nome.trim(),
      slug: slug.trim(),
      descricao: descricao.trim() || null,
      corpo,
      ativo,
    }
    const { error } = editing
      ? await supabase.from('scope_templates').update(payload).eq('id', editing.id)
      : await supabase.from('scope_templates').insert(payload)
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <PageHeader
        title="Escopos"
        subtitle="Biblioteca de escopos por modalidade (Gestão Financeira, Gestão de Preços, etc.) — entram no {{escopo}} da proposta"
        actions={<Button onClick={abrirNovo}>+ Novo escopo</Button>}
      />

      {escopos.length === 0 ? (
        <Card>
          <p style={{ color: '#8A9AB5' }}>Nenhum escopo cadastrado. Comece criando o primeiro.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {escopos.map((s) => (
            <Card key={s.id} padding={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0D1B3E' }}>{s.nome}</h3>
                    {!s.ativo && <Badge variant="neutral">Inativo</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A9AB5', fontFamily: 'monospace', marginBottom: 6 }}>{s.slug}</div>
                  {s.descricao && <p style={{ fontSize: 13, color: '#0D1B3E' }}>{s.descricao}</p>}
                </div>
                <Button variant="secondary" onClick={() => abrirEdicao(s)}>Editar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar escopo' : 'Novo escopo'} maxWidth={760}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              if (!editing) setSlug(slugify(e.target.value))
            }}
            placeholder="Gestão Financeira"
          />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="gestao-financeira" />
          <Input
            label="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Para clientes que precisam estruturar o financeiro do zero"
          />
          <Textarea
            label="Corpo do escopo"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={14}
            style={{ minHeight: 280, fontFamily: 'monospace', fontSize: 13 }}
            placeholder="Texto completo do escopo. Pode usar quebra de linha e formatação simples."
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span style={{ fontSize: 14 }}>Ativo</span>
          </label>

          {erro && (
            <div style={{ background: '#FCE8E8', color: '#D64545', padding: 12, borderRadius: 10, fontSize: 13 }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} loading={salvando}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
