'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Client } from '@/lib/db/types'
import { formatCnpj, onlyDigits } from '@/lib/db/cnpj'
import { formatCpf, formatTelefone, formatCep } from '@/lib/db/mascaras'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { atualizarCliente, apagarCliente, AtualizarClienteInput } from '../actions'

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

interface ModalProps {
  cliente: Client
  open: boolean
  onClose: () => void
  /**
   * Onde redirecionar após apagar (caso `mostrarApagar`).
   * Se não passar, fica na mesma página (refresh).
   */
  redirectAposApagar?: string
  mostrarApagar?: boolean
  isAdmin?: boolean
}

export function EditarClienteModal({
  cliente,
  open,
  onClose,
  redirectAposApagar,
  mostrarApagar = false,
  isAdmin = false,
}: ModalProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [salvando, setSalvando] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [razao, setRazao] = useState(cliente.razao_social)
  const [cnpj, setCnpj] = useState(formatCnpj(cliente.cnpj))
  const [email, setEmail] = useState(cliente.email)
  const [telefone, setTelefone] = useState(cliente.telefone ? formatTelefone(cliente.telefone) : '')
  const [logr, setLogr] = useState(cliente.endereco_logradouro ?? '')
  const [num, setNum] = useState(cliente.endereco_numero ?? '')
  const [comp, setComp] = useState(cliente.endereco_complemento ?? '')
  const [bairro, setBairro] = useState(cliente.endereco_bairro ?? '')
  const [cidade, setCidade] = useState(cliente.endereco_cidade ?? '')
  const [uf, setUf] = useState(cliente.endereco_uf ?? '')
  const [cep, setCep] = useState(cliente.endereco_cep ?? '')

  const [respNome, setRespNome] = useState(cliente.responsavel_nome ?? '')
  const [respCargo, setRespCargo] = useState(cliente.responsavel_cargo ?? '')
  const [respCpf, setRespCpf] = useState(cliente.responsavel_cpf ? formatCpf(cliente.responsavel_cpf) : '')
  const [respEmail, setRespEmail] = useState(cliente.responsavel_email ?? '')
  const [respLogr, setRespLogr] = useState(cliente.responsavel_endereco_logradouro ?? '')
  const [respNum, setRespNum] = useState(cliente.responsavel_endereco_numero ?? '')
  const [respComp, setRespComp] = useState(cliente.responsavel_endereco_complemento ?? '')
  const [respBairro, setRespBairro] = useState(cliente.responsavel_endereco_bairro ?? '')
  const [respCidade, setRespCidade] = useState(cliente.responsavel_endereco_cidade ?? '')
  const [respUf, setRespUf] = useState(cliente.responsavel_endereco_uf ?? '')
  const [respCep, setRespCep] = useState(cliente.responsavel_endereco_cep ?? '')

  async function salvar() {
    setErro(null)
    setSalvando(true)
    const input: AtualizarClienteInput = {
      razao_social: razao.trim(),
      cnpj: onlyDigits(cnpj),
      email: email.trim(),
      telefone: telefone ? onlyDigits(telefone) : null,
      endereco_logradouro: logr.trim() || null,
      endereco_numero: num.trim() || null,
      endereco_complemento: comp.trim() || null,
      endereco_bairro: bairro.trim() || null,
      endereco_cidade: cidade.trim() || null,
      endereco_uf: uf.trim().toUpperCase() || null,
      endereco_cep: cep ? onlyDigits(cep) : null,
      responsavel_nome: respNome.trim() || null,
      responsavel_cargo: respCargo.trim() || null,
      responsavel_cpf: respCpf ? onlyDigits(respCpf) : null,
      responsavel_email: respEmail.trim() || null,
      responsavel_endereco_logradouro: respLogr.trim() || null,
      responsavel_endereco_numero: respNum.trim() || null,
      responsavel_endereco_complemento: respComp.trim() || null,
      responsavel_endereco_bairro: respBairro.trim() || null,
      responsavel_endereco_cidade: respCidade.trim() || null,
      responsavel_endereco_uf: respUf.trim().toUpperCase() || null,
      responsavel_endereco_cep: respCep ? onlyDigits(respCep) : null,
    }
    const r = await atualizarCliente(cliente.id, input)
    setSalvando(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao salvar.')
      return
    }
    onClose()
    startTransition(() => router.refresh())
  }

  async function apagar() {
    if (!window.confirm(`Apagar o contratante "${cliente.razao_social}"?\n\nSoft delete: vai sumir das listas mas histórico de propostas mantém o vínculo.`)) return
    setApagando(true)
    const r = await apagarCliente(cliente.id)
    setApagando(false)
    if (!r.ok) {
      window.alert(r.erro ?? 'Erro.')
      return
    }
    onClose()
    if (redirectAposApagar) {
      router.push(redirectAposApagar)
    } else {
      startTransition(() => router.refresh())
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar contratante" maxWidth={760}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section titulo="Empresa">
          <Input label="Razão social" value={razao} onChange={(e) => setRazao(e.target.value)} />
          <Grid>
            <Input label="CNPJ" value={cnpj} onChange={(e) => setCnpj(formatCnpj(e.target.value))} inputMode="numeric" />
            <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(formatTelefone(e.target.value))} inputMode="tel" />
          </Grid>
          <Input label="E-mail da empresa" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Section>

        <Section titulo="Endereço da empresa">
          <Grid>
            <Input label="CEP" value={cep} onChange={(e) => setCep(formatCep(e.target.value))} inputMode="numeric" />
            <div />
          </Grid>
          <Input label="Logradouro" value={logr} onChange={(e) => setLogr(e.target.value)} />
          <Grid>
            <Input label="Número" value={num} onChange={(e) => setNum(e.target.value)} />
            <Input label="Complemento" value={comp} onChange={(e) => setComp(e.target.value)} />
          </Grid>
          <Grid>
            <Input label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
            <Input label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </Grid>
          <Select label="UF" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())}>
            <option value="">—</option>
            {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </Section>

        <Section titulo="Responsável (vai pros placeholders {{responsavel_*}})">
          <Grid>
            <Input label="Nome completo" value={respNome} onChange={(e) => setRespNome(e.target.value)} />
            <Input label="Cargo" value={respCargo} onChange={(e) => setRespCargo(e.target.value)} />
          </Grid>
          <Grid>
            <Input label="CPF" value={respCpf} onChange={(e) => setRespCpf(formatCpf(e.target.value))} inputMode="numeric" />
            <Input label="E-mail corporativo" type="email" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} />
          </Grid>
        </Section>

        <Section titulo="Endereço residencial do responsável">
          <Grid>
            <Input label="CEP" value={respCep} onChange={(e) => setRespCep(formatCep(e.target.value))} inputMode="numeric" />
            <div />
          </Grid>
          <Input label="Logradouro" value={respLogr} onChange={(e) => setRespLogr(e.target.value)} />
          <Grid>
            <Input label="Número" value={respNum} onChange={(e) => setRespNum(e.target.value)} />
            <Input label="Complemento" value={respComp} onChange={(e) => setRespComp(e.target.value)} />
          </Grid>
          <Grid>
            <Input label="Bairro" value={respBairro} onChange={(e) => setRespBairro(e.target.value)} />
            <Input label="Cidade" value={respCidade} onChange={(e) => setRespCidade(e.target.value)} />
          </Grid>
          <Select label="UF" value={respUf} onChange={(e) => setRespUf(e.target.value.toUpperCase())}>
            <option value="">—</option>
            {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </Section>

        {erro && (
          <div style={{ background: '#FCE8E8', color: '#D64545', padding: 12, borderRadius: 8, fontSize: 13 }}>{erro}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {mostrarApagar && isAdmin ? (
            <Button variant="ghost" onClick={apagar} loading={apagando} style={{ color: '#D64545' }}>
              Apagar contratante
            </Button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={salvar} loading={salvando}>Salvar</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Wrapper pra usar na página de detalhe — botão Editar + modal.
 */
export function EditarClienteBtn({ cliente, isAdmin }: { cliente: Client; isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Editar</Button>
      <EditarClienteModal
        cliente={cliente}
        open={open}
        onClose={() => setOpen(false)}
        mostrarApagar
        isAdmin={isAdmin}
        redirectAposApagar="/clientes"
      />
    </>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#8A9AB5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        {titulo}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}
