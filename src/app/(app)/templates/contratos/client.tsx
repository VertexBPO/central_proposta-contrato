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
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrirNovo() {
    setEditing(null)
    setNome('')
    setSlug('')
    setFilePath(null)
    setFileName(null)
    setAtivo(true)
    setErro(null)
    setOpen(true)
  }

  function abrirEdicao(t: ContractTemplate) {
    setEditing(t)
    setNome(t.nome)
    setSlug(t.slug)
    setFilePath(t.template_file_path)
    setFileName(t.template_file_path ? t.template_file_path.split('/').pop() ?? null : null)
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
      ativo,
    }
    if (filePath) payload.template_file_path = filePath

    const { error } = editing
      ? await supabase.from('contract_templates').update(payload).eq('id', editing.id)
      : await supabase.from('contract_templates').insert({ ...payload, corpo: '' })
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  async function baixarTemplate(t: ContractTemplate) {
    if (!t.template_file_path) return
    const { data, error } = await supabase.storage.from('templates').createSignedUrl(t.template_file_path, 60)
    if (error || !data) return
    window.open(data.signedUrl, '_blank')
  }

  return (
    <>
      <PageHeader
        title="Templates de contrato"
        subtitle="Sobe o .docx pronto (com logo, formatação, placeholders) — sistema só substitui {{}} ao gerar"
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
                    {!t.template_file_path && <Badge variant="warning">Sem arquivo</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A9AB5', fontFamily: 'monospace' }}>{t.slug}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {t.template_file_path && (
                    <Button variant="ghost" onClick={() => baixarTemplate(t)}>Baixar .docx</Button>
                  )}
                  <Button variant="secondary" onClick={() => abrirEdicao(t)}>Editar</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar contrato' : 'Novo contrato'} maxWidth={680}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              if (!editing) setSlug(slugify(e.target.value))
            }}
            placeholder="Contrato Assessoria Empresarial"
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="contrato-assessoria"
          />
          <UploadDocx
            pastaStorage="contract-templates"
            arquivoAtual={fileName}
            onArquivoSalvo={(path, nome) => {
              setFilePath(path)
              setFileName(nome)
            }}
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
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} loading={salvando}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
