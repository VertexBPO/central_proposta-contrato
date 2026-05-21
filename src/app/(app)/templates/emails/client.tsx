'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EmailTemplate, TipoEmailTemplate } from '@/lib/db/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { Modal } from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'

const LABELS: Record<TipoEmailTemplate, string> = {
  envio_proposta: 'Envio da proposta',
  lembrete: 'Lembrete (follow-up)',
  envio_contrato: 'Envio do contrato para assinatura',
  re_aceite: 'Solicitação de re-aceite',
  reabertura: 'Reabertura de proposta',
}

type Item = EmailTemplate | { tipo: TipoEmailTemplate; assunto: string; corpo_html: string }

interface Props {
  lista: Item[]
}

export function TemplatesEmailsClient({ lista }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  const [editing, setEditing] = useState<Item | null>(null)
  const [assunto, setAssunto] = useState('')
  const [corpo, setCorpo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrir(item: Item) {
    setEditing(item)
    setAssunto(item.assunto)
    setCorpo(item.corpo_html)
    setErro(null)
  }

  async function salvar() {
    if (!editing) return
    setErro(null)
    if (!assunto.trim() || !corpo.trim()) {
      setErro('Assunto e corpo são obrigatórios.')
      return
    }
    setSalvando(true)
    const payload = { tipo: editing.tipo, assunto: assunto.trim(), corpo_html: corpo }
    const { error } = await supabase
      .from('email_templates')
      .upsert(payload, { onConflict: 'tipo' })
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    setEditing(null)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <PageHeader
        title="Templates de e-mail"
        subtitle="HTML dos 5 e-mails enviados pelo sistema. Use placeholders como {{cliente_nome}}, {{proposta_numero}}, {{link}}."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lista.map((item) => (
          <Card key={item.tipo} padding={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0D1B3E', marginBottom: 4 }}>
                  {LABELS[item.tipo]}
                </h3>
                <div style={{ fontSize: 12, color: '#8A9AB5', marginBottom: 6, fontFamily: 'monospace' }}>
                  {item.tipo}
                </div>
                {item.assunto ? (
                  <p style={{ fontSize: 13, color: '#0D1B3E' }}>
                    <strong>Assunto:</strong> {item.assunto}
                  </p>
                ) : (
                  <p style={{ fontSize: 13, color: '#D64545' }}>Ainda não configurado</p>
                )}
              </div>
              <Button variant="secondary" onClick={() => abrir(item)}>
                {item.assunto ? 'Editar' : 'Configurar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? LABELS[editing.tipo] : ''}
        maxWidth={760}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Assunto do e-mail"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Sua proposta {{proposta_numero}} — Vertex BPO"
          />
          <Textarea
            label="Corpo HTML"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            placeholder="<html>...</html>"
            rows={16}
            style={{ minHeight: 300, fontFamily: 'monospace', fontSize: 13 }}
          />

          {erro && (
            <div style={{ background: '#FCE8E8', color: '#D64545', padding: 12, borderRadius: 10, fontSize: 13 }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar} loading={salvando}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
