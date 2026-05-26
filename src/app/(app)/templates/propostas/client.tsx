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
import { PlaceholdersDisponiveis } from '@/components/PlaceholdersDisponiveis'

interface Props {
  templates: ProposalTemplate[]
  contratos: ContractTemplate[]
}

export function TemplatesPropostasClient({ templates, contratos }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProposalTemplate | null>(null)
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [descricao, setDescricao] = useState('')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [contratoId, setContratoId] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [apagando, setApagando] = useState<string | null>(null)
  const [erroApagar, setErroApagar] = useState<string | null>(null)

  const contratoMap = new Map(contratos.map((c) => [c.id, c.nome]))

  function abrirNovo() {
    setEditing(null)
    setNome('')
    setSlug('')
    setDescricao('')
    setFilePath(null)
    setFileName(null)
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
    setFilePath(t.template_file_path)
    setFileName(t.template_file_path ? t.template_file_path.split('/').pop() ?? null : null)
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
    if (!filePath && !editing) {
      setErro('Faça upload do arquivo .docx.')
      return
    }
    setSalvando(true)
    const payload: Record<string, unknown> = {
      nome: nome.trim(),
      slug: slug.trim(),
      descricao: descricao.trim() || null,
      contract_template_id: contratoId || null,
      ativo,
    }
    if (filePath) payload.template_file_path = filePath

    const { error } = editing
      ? await supabase.from('proposal_templates').update(payload).eq('id', editing.id)
      : await supabase.from('proposal_templates').insert({ ...payload, escopo_padrao: null })
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  async function baixarTemplate(t: ProposalTemplate) {
    if (!t.template_file_path) return
    const { data, error } = await supabase.storage.from('templates').createSignedUrl(t.template_file_path, 60)
    if (error || !data) return
    window.open(data.signedUrl, '_blank')
  }

  async function apagarTemplate(t: ProposalTemplate) {
    setErroApagar(null)
    const ok = window.confirm(
      `Apagar o template "${t.nome}"?\n\nIsso é permanente. Se já houver propostas usando este template, o banco vai bloquear (use "Desativar" no checkbox em vez disso).`
    )
    if (!ok) return
    setApagando(t.id)
    const { error } = await supabase.from('proposal_templates').delete().eq('id', t.id)
    if (error) {
      setApagando(null)
      if (error.code === '23503') {
        setErroApagar(`"${t.nome}" está vinculado a uma proposta. Desative em vez de apagar.`)
      } else {
        setErroApagar(error.message)
      }
      return
    }
    if (t.template_file_path) {
      await supabase.storage.from('templates').remove([t.template_file_path])
    }
    setApagando(null)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <PageHeader
        title="Templates de proposta"
        subtitle="Suba a proposta completa em .docx (com escopo já embutido). Sistema só substitui placeholders de dados ao gerar."
        actions={<Button onClick={abrirNovo}>+ Nova proposta</Button>}
      />

      <PlaceholdersDisponiveis categorias={['Propostas Assessoria', 'Proposta BPO Financeiro']} />

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
                    {!t.template_file_path && <Badge variant="warning">Sem arquivo</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A9AB5', fontFamily: 'monospace', marginBottom: 6 }}>{t.slug}</div>
                  {t.descricao && <p style={{ fontSize: 13, color: '#0D1B3E', marginBottom: 8 }}>{t.descricao}</p>}
                  <div style={{ fontSize: 12, color: '#8A9AB5' }}>
                    Contrato vinculado: <strong style={{ color: '#0D1B3E' }}>{t.contract_template_id ? (contratoMap.get(t.contract_template_id) ?? '—') : '—'}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {t.template_file_path && (
                    <Button variant="ghost" onClick={() => baixarTemplate(t)}>Baixar .docx</Button>
                  )}
                  <Button variant="secondary" onClick={() => abrirEdicao(t)}>Editar</Button>
                  <Button
                    variant="ghost"
                    onClick={() => apagarTemplate(t)}
                    loading={apagando === t.id}
                    style={{ color: '#D64545' }}
                  >
                    Apagar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {erroApagar && (
        <div style={{ marginTop: 12, background: '#FCE8E8', color: '#D64545', padding: 12, borderRadius: 10, fontSize: 13 }}>
          {erroApagar}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar proposta' : 'Nova proposta'} maxWidth={680}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              if (!editing) setSlug(slugify(e.target.value))
            }}
            placeholder="Proposta Assessoria Empresarial"
          />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
          <Input
            label="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <Select
            label="Template de contrato vinculado (opcional)"
            value={contratoId}
            onChange={(e) => setContratoId(e.target.value)}
          >
            <option value="">— sem contrato vinculado —</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </Select>
          <UploadDocx
            pastaStorage="proposal-templates"
            arquivoAtual={fileName}
            arquivoAtualPath={filePath}
            onArquivoSalvo={(path, nome) => {
              setFilePath(path)
              setFileName(nome)
            }}
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
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} loading={salvando}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
