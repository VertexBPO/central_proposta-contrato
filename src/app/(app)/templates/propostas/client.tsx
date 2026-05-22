'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ContractTemplate, ProposalTemplate, slugify } from '@/lib/db/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Modal } from '@/components/Modal'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'
import { UploadDocx } from '@/components/UploadDocx'
import { RichEditor } from '@/components/RichEditor'
import { PreviewHtml } from '@/components/PreviewHtml'

interface Props {
  templates: ProposalTemplate[]
  contratos: ContractTemplate[]
}

export function TemplatesPropostasClient({ templates, contratos }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [previewing, setPreviewing] = useState<ProposalTemplate | null>(null)
  const [editing, setEditing] = useState<ProposalTemplate | null>(null)
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [descricao, setDescricao] = useState('')
  const [escopo, setEscopo] = useState('')
  const [contratoId, setContratoId] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const contratoMap = new Map(contratos.map((c) => [c.id, c.nome]))

  function abrirNovo() {
    setEditing(null)
    setNome('')
    setSlug('')
    setDescricao('')
    setEscopo('')
    setContratoId(contratos[0]?.id ?? '')
    setAtivo(true)
    setErro(null)
    setOpen(true)
  }

  function abrirEdicao(t: ProposalTemplate) {
    setEditing(t)
    setNome(t.nome)
    setSlug(t.slug)
    setDescricao(t.descricao ?? '')
    setEscopo(t.escopo_padrao ?? '')
    setContratoId(t.contract_template_id ?? '')
    setAtivo(t.ativo)
    setErro(null)
    setOpen(true)
  }

  async function salvar() {
    setErro(null)
    if (!nome.trim() || !slug.trim()) {
      setErro('Preencha nome e slug.')
      return
    }
    setSalvando(true)
    const payload = {
      nome: nome.trim(),
      slug: slug.trim(),
      descricao: descricao.trim() || null,
      escopo_padrao: escopo || null,
      contract_template_id: contratoId || null,
      ativo,
    }
    const { error } = editing
      ? await supabase.from('proposal_templates').update(payload).eq('id', editing.id)
      : await supabase.from('proposal_templates').insert(payload)
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
        title="Templates de proposta"
        subtitle="Cadastre quantos quiser. Contrato vinculado é opcional."
        actions={
          <Button onClick={abrirNovo}>+ Nova proposta</Button>
        }
      />

      {templates.length === 0 ? (
        <Card>
          <p style={{ color: '#8A9AB5' }}>Nenhum template de proposta cadastrado.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map((t) => (
            <Card key={t.id} padding={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0D1B3E' }}>{t.nome}</h3>
                    {!t.ativo && <Badge variant="neutral">Inativo</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A9AB5', fontFamily: 'monospace', marginBottom: 6 }}>{t.slug}</div>
                  {t.descricao && <p style={{ fontSize: 13, color: '#0D1B3E', marginBottom: 8 }}>{t.descricao}</p>}
                  <div style={{ fontSize: 12, color: '#8A9AB5' }}>
                    Contrato vinculado: <strong style={{ color: '#0D1B3E' }}>{t.contract_template_id ? (contratoMap.get(t.contract_template_id) ?? '—') : '—'}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" onClick={() => setPreviewing(t)}>Visualizar</Button>
                  <Button variant="secondary" onClick={() => abrirEdicao(t)}>Editar</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PreviewHtml
        open={previewing !== null}
        onClose={() => setPreviewing(null)}
        titulo={previewing?.nome ?? ''}
        html={previewing?.escopo_padrao ?? ''}
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar proposta' : 'Nova proposta'} maxWidth={760}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              if (!editing) setSlug(slugify(e.target.value))
            }}
            placeholder="Proposta BPO Financeiro"
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="proposta-bpo-financeiro"
          />
          <Input
            label="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição curta para identificar o uso"
          />
          <Select
            label="Template de contrato vinculado (opcional)"
            value={contratoId}
            onChange={(e) => setContratoId(e.target.value)}
          >
            <option value="">— sem contrato vinculado —</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
          <UploadDocx
            onTextoExtraido={() => {}}
            onHtmlExtraido={(html) => setEscopo(html)}
          />
          <RichEditor
            label="Escopo padrão (opcional, formatável)"
            value={escopo}
            onChange={setEscopo}
            minHeight={320}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span style={{ fontSize: 14 }}>Ativo (disponível para operador)</span>
          </label>

          {erro && (
            <div style={{ background: '#FCE8E8', color: '#D64545', padding: 12, borderRadius: 10, fontSize: 13 }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} loading={salvando}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
