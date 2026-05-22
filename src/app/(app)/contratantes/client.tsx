'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Contractor } from '@/lib/db/types'
import {
  formatDocumento,
  onlyDigits,
  validateDocumento,
  labelDocumento,
  labelNome,
  TipoDocumento,
} from '@/lib/db/cnpj'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'

interface Props {
  contratantes: Contractor[]
}

export function ContratantesClient({ contratantes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Contractor | null>(null)
  const [tipo, setTipo] = useState<TipoDocumento>('PJ')
  const [razao, setRazao] = useState('')
  const [documento, setDocumento] = useState('')
  const [endereco, setEndereco] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrirNovo() {
    setEditing(null)
    setTipo('PJ')
    setRazao('')
    setDocumento('')
    setEndereco('')
    setAtivo(true)
    setErro(null)
    setOpen(true)
  }

  function abrirEdicao(c: Contractor) {
    setEditing(c)
    setTipo(c.tipo)
    setRazao(c.razao_social)
    setDocumento(formatDocumento(c.documento, c.tipo))
    setEndereco(c.endereco)
    setAtivo(c.ativo)
    setErro(null)
    setOpen(true)
  }

  function aoTrocarTipo(novoTipo: TipoDocumento) {
    setTipo(novoTipo)
    // Re-formata documento ao trocar tipo
    setDocumento(formatDocumento(documento, novoTipo))
  }

  async function salvar() {
    setErro(null)
    if (!razao.trim() || !documento || !endereco.trim()) {
      setErro(`Preencha ${labelNome(tipo).toLowerCase()}, ${labelDocumento(tipo)} e endereço.`)
      return
    }
    const docNumeros = onlyDigits(documento)
    if (!validateDocumento(docNumeros, tipo)) {
      setErro(`${labelDocumento(tipo)} inválido.`)
      return
    }
    setSalvando(true)
    const payload = {
      tipo,
      razao_social: razao.trim(),
      documento: docNumeros,
      endereco: endereco.trim(),
      ativo,
    }
    const { error } = editing
      ? await supabase.from('contractors').update(payload).eq('id', editing.id)
      : await supabase.from('contractors').insert(payload)
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <PageHeader
        title="Contratada"
        subtitle="Empresa(s) Vertex (PJ ou PF) que aparecem como CONTRATADA nas propostas"
        actions={<Button onClick={abrirNovo}>+ Nova contratada</Button>}
      />

      {contratantes.length === 0 ? (
        <Card>
          <p style={{ color: '#8A9AB5' }}>Nenhuma contratada cadastrada ainda.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contratantes.map((c) => (
            <Card key={c.id} padding={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge variant={c.tipo === 'PJ' ? 'info' : 'primary'}>{c.tipo}</Badge>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0D1B3E' }}>{c.razao_social}</h3>
                    {!c.ativo && <Badge variant="neutral">Inativo</Badge>}
                  </div>
                  <div style={{ fontSize: 13, color: '#8A9AB5', marginBottom: 4 }}>
                    {labelDocumento(c.tipo)} {formatDocumento(c.documento, c.tipo)}
                  </div>
                  <div style={{ fontSize: 13, color: '#0D1B3E' }}>{c.endereco}</div>
                </div>
                <Button variant="secondary" onClick={() => abrirEdicao(c)}>
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar contratante' : 'Novo contratante'}
        maxWidth={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label="Tipo" value={tipo} onChange={(e) => aoTrocarTipo(e.target.value as TipoDocumento)}>
            <option value="PJ">Pessoa Jurídica (CNPJ)</option>
            <option value="PF">Pessoa Física (CPF)</option>
          </Select>
          <Input
            label={labelNome(tipo)}
            value={razao}
            onChange={(e) => setRazao(e.target.value)}
            placeholder={tipo === 'PJ' ? 'Vertex BPO e Assessoria Empresarial' : 'Sandro Alves'}
          />
          <Input
            label={labelDocumento(tipo)}
            value={documento}
            onChange={(e) => setDocumento(formatDocumento(e.target.value, tipo))}
            placeholder={tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
            inputMode="numeric"
          />
          <Textarea
            label="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            rows={3}
            placeholder="Rua X, nº Y, Vila Velha/ES, CEP 00000-000"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span style={{ fontSize: 14 }}>Ativo (disponível para uso em propostas)</span>
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
    </div>
  )
}
