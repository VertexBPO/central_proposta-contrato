'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ContractTemplate, slugify } from '@/lib/db/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'
import { UploadDocx } from '@/components/UploadDocx'
import { RichEditor } from '@/components/RichEditor'

interface Props {
  templates: ContractTemplate[]
}

export function TemplatesContratosClient({ templates }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ContractTemplate | null>(null)
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [corpo, setCorpo] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrirNovo() {
    setEditing(null)
    setNome('')
    setSlug('')
    setCorpo('')
    setAtivo(true)
    setErro(null)
    setOpen(true)
  }

  function abrirEdicao(t: ContractTemplate) {
    setEditing(t)
    setNome(t.nome)
    setSlug(t.slug)
    setCorpo(t.corpo)
    setAtivo(t.ativo)
    setErro(null)
    setOpen(true)
  }

  function fechar() {
    setOpen(false)
  }

  async function salvar() {
    setErro(null)
    if (!nome.trim() || !slug.trim() || !corpo.trim()) {
      setErro('Preencha nome, slug e corpo do contrato.')
      return
    }
    setSalvando(true)
    const payload = { nome: nome.trim(), slug: slug.trim(), corpo, ativo }
    const { error } = editing
      ? await supabase.from('contract_templates').update(payload).eq('id', editing.id)
      : await supabase.from('contract_templates').insert(payload)
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
        title="Templates de contrato"
        subtitle="Modelos cadastráveis com placeholders. Cada template de proposta vincula 1 contrato."
        actions={<Button onClick={abrirNovo}>+ Novo contrato</Button>}
      />

      {templates.length === 0 ? (
        <Card>
          <p style={{ color: '#8A9AB5' }}>
            Nenhum template de contrato cadastrado. Comece criando o primeiro.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map((t) => (
            <Card key={t.id} padding={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0D1B3E' }}>{t.nome}</h3>
                    {!t.ativo && <Badge variant="neutral">Inativo</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A9AB5', fontFamily: 'monospace' }}>{t.slug}</div>
                </div>
                <Button variant="secondary" onClick={() => abrirEdicao(t)}>
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={fechar} title={editing ? 'Editar contrato' : 'Novo contrato'} maxWidth={760}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              if (!editing) setSlug(slugify(e.target.value))
            }}
            placeholder="Contrato BPO Financeiro"
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="contrato-bpo-financeiro"
          />
          <UploadDocx
            onTextoExtraido={() => {}}
            onHtmlExtraido={(html) => setCorpo(html)}
          />
          <RichEditor
            label="Conteúdo do contrato (formatável)"
            value={corpo}
            onChange={setCorpo}
            minHeight={360}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span style={{ fontSize: 14 }}>Ativo (disponível para uso)</span>
          </label>

          {erro && (
            <div style={{ background: '#FCE8E8', color: '#D64545', padding: 12, borderRadius: 10, fontSize: 13 }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} loading={salvando}>
              {editing ? 'Salvar alterações' : 'Criar contrato'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
