'use client'

import { useActionState, useState } from 'react'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { formatCnpj, onlyDigits, validateCnpj } from '@/lib/db/cnpj'
import { formatTelefone, formatCep } from '@/lib/db/mascaras'
import { salvarDadosCliente } from './actions'
import type { PropostaCliente } from '@/lib/cliente/sessao'

interface Props {
  cliente: PropostaCliente['cliente']
  numero: string
}

export function PreencherForm({ cliente, numero }: Props) {
  const [state, action, pending] = useActionState(salvarDadosCliente, undefined)
  const [cnpj, setCnpj] = useState(cliente.cnpj ? formatCnpj(cliente.cnpj) : '')
  const [razaoSocial, setRazaoSocial] = useState(cliente.razao_social ?? '')
  const [logradouro, setLogradouro] = useState(cliente.endereco_logradouro ?? '')
  const [numeroEnd, setNumeroEnd] = useState(cliente.endereco_numero ?? '')
  const [complemento, setComplemento] = useState(cliente.endereco_complemento ?? '')
  const [bairro, setBairro] = useState(cliente.endereco_bairro ?? '')
  const [cidade, setCidade] = useState(cliente.endereco_cidade ?? '')
  const [uf, setUf] = useState(cliente.endereco_uf ?? '')
  const [cep, setCep] = useState(cliente.endereco_cep ?? '')
  const [telefone, setTelefone] = useState(cliente.telefone ?? '')
  const [buscando, setBuscando] = useState(false)
  const [avisoCnpj, setAvisoCnpj] = useState<string | null>(null)

  async function buscarCnpj() {
    const nums = onlyDigits(cnpj)
    if (!validateCnpj(nums)) {
      setAvisoCnpj('CNPJ inválido')
      return
    }
    setAvisoCnpj(null)
    setBuscando(true)
    try {
      const r = await fetch(`/api/cnpj/${nums}`)
      const data = await r.json()
      if (!r.ok) {
        setAvisoCnpj(data.erro ?? 'Erro na consulta')
        return
      }
      if (!razaoSocial && data.razao_social) setRazaoSocial(data.razao_social)
      if (!logradouro && data.endereco_logradouro) setLogradouro(data.endereco_logradouro)
      if (!numeroEnd && data.endereco_numero) setNumeroEnd(data.endereco_numero)
      if (!complemento && data.endereco_complemento) setComplemento(data.endereco_complemento)
      if (!bairro && data.endereco_bairro) setBairro(data.endereco_bairro)
      if (!cidade && data.endereco_cidade) setCidade(data.endereco_cidade)
      if (!uf && data.endereco_uf) setUf(data.endereco_uf)
      if (!cep && data.endereco_cep) setCep(data.endereco_cep)
      if (!telefone && data.telefone) setTelefone(data.telefone)
    } catch {
      setAvisoCnpj('Erro de rede ao consultar CNPJ')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1B3E',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 24, color: '#FFFFFF' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Vertex BPO</h1>
          <p style={{ fontSize: 13, color: '#8A9AB5' }}>Proposta {numero}</p>
        </div>

        <Card style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0D1B3E', marginBottom: 8 }}>
            Dados da empresa
          </h2>
          <p style={{ fontSize: 13, color: '#8A9AB5', marginBottom: 24 }}>
            Preencha os dados abaixo para a Vertex montar sua proposta.
          </p>

          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Input
                name="cnpj"
                label="CNPJ * (digite e clique Buscar)"
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                onBlur={() => {
                  if (validateCnpj(onlyDigits(cnpj)) && !razaoSocial) buscarCnpj()
                }}
                required
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
              />
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button type="button" variant="ghost" onClick={buscarCnpj} disabled={buscando}>
                  {buscando ? 'Buscando…' : 'Buscar dados na Receita'}
                </Button>
                {avisoCnpj && <span style={{ fontSize: 12, color: '#D64545' }}>{avisoCnpj}</span>}
              </div>
            </div>
            <Input
              name="razao_social"
              label="Razão social *"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              required
              placeholder="Empresa LTDA"
            />
            <Input
              name="responsavel_nome"
              label="Responsável *"
              defaultValue={cliente.responsavel_nome ?? ''}
              required
              placeholder="Nome do responsável"
            />
            <Input
              name="email"
              type="email"
              label="E-mail corporativo *"
              defaultValue={cliente.email}
              required
            />
            <Input
              name="telefone"
              label="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(formatTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="tel"
            />

            <div style={{ marginTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0D1B3E', textTransform: 'uppercase' }}>
                Endereço
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Input
                name="endereco_logradouro"
                label="Logradouro"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                placeholder="Rua / Av."
              />
              <Input
                name="endereco_numero"
                label="Número"
                value={numeroEnd}
                onChange={(e) => setNumeroEnd(e.target.value)}
              />
            </div>
            <Input
              name="endereco_complemento"
              label="Complemento"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Sala / andar"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                name="endereco_bairro"
                label="Bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
              <Input
                name="endereco_cep"
                label="CEP"
                value={cep}
                onChange={(e) => setCep(formatCep(e.target.value))}
                placeholder="00000-000"
                inputMode="numeric"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Input
                name="endereco_cidade"
                label="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
              <Input
                name="endereco_uf"
                label="UF"
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="ES"
              />
            </div>

            {state?.erro && (
              <div
                style={{
                  background: '#FCE8E8',
                  color: '#D64545',
                  padding: 12,
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                {state.erro}
              </div>
            )}

            <Button type="submit" loading={pending} style={{ marginTop: 12 }}>
              Enviar dados
            </Button>
            <p style={{ fontSize: 11, color: '#8A9AB5', textAlign: 'center', marginTop: 4 }}>
              * Campos obrigatórios. Seus dados são armazenados com segurança e usados apenas para gerar sua proposta.
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
