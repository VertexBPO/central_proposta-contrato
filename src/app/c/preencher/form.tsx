'use client'

import { useActionState, useState } from 'react'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Textarea } from '@/components/Textarea'
import { formatCnpj } from '@/lib/db/cnpj'
import { salvarDadosCliente } from './actions'
import type { PropostaCliente } from '@/lib/cliente/sessao'

interface Props {
  cliente: PropostaCliente['cliente']
  numero: string
}

export function PreencherForm({ cliente, numero }: Props) {
  const [state, action, pending] = useActionState(salvarDadosCliente, undefined)
  const [cnpj, setCnpj] = useState(cliente.cnpj ? formatCnpj(cliente.cnpj) : '')

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
            <Input
              name="razao_social"
              label="Razão social *"
              defaultValue={cliente.razao_social ?? ''}
              required
              placeholder="Empresa LTDA"
            />
            <Input
              name="cnpj"
              label="CNPJ *"
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              required
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
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
              defaultValue={cliente.telefone ?? ''}
              placeholder="(00) 00000-0000"
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
                defaultValue={cliente.endereco_logradouro ?? ''}
                placeholder="Rua / Av."
              />
              <Input
                name="endereco_numero"
                label="Número"
                defaultValue={cliente.endereco_numero ?? ''}
              />
            </div>
            <Input
              name="endereco_complemento"
              label="Complemento"
              defaultValue={cliente.endereco_complemento ?? ''}
              placeholder="Sala / andar"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                name="endereco_bairro"
                label="Bairro"
                defaultValue={cliente.endereco_bairro ?? ''}
              />
              <Input
                name="endereco_cep"
                label="CEP"
                defaultValue={cliente.endereco_cep ?? ''}
                placeholder="00000-000"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Input
                name="endereco_cidade"
                label="Cidade"
                defaultValue={cliente.endereco_cidade ?? ''}
              />
              <Input
                name="endereco_uf"
                label="UF"
                defaultValue={cliente.endereco_uf ?? ''}
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
