'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Client, ProposalTemplate, EscopoTipo, formatCurrency } from '@/lib/db/types'
import { formatCnpj, onlyDigits } from '@/lib/db/cnpj'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { criarProposta } from './actions'

interface Props {
  templates: ProposalTemplate[]
  clientePre: Client | null
}

function inputMoneyParse(s: string): number {
  const nums = s.replace(/\D/g, '')
  return Number(nums) / 100
}

function inputMoneyFormat(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function NovaPropostaForm({ templates, clientePre }: Props) {
  const router = useRouter()

  // Cliente
  const [clientId, setClientId] = useState<string | null>(clientePre?.id ?? null)
  const [cnpj, setCnpj] = useState(clientePre?.cnpj ? formatCnpj(clientePre.cnpj) : '')
  const [razaoSocial, setRazaoSocial] = useState(clientePre?.razao_social ?? '')
  const [emailCliente, setEmailCliente] = useState(clientePre?.email ?? '')

  // Proposta
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [escopoTipo, setEscopoTipo] = useState<EscopoTipo>('padrao')
  const [escopo, setEscopo] = useState(templates[0]?.escopo_padrao ?? '')

  // Comercial
  const [prazo, setPrazo] = useState(5)
  const [valorAdesao, setValorAdesao] = useState(0)
  const [parcelas, setParcelas] = useState(5)
  const [valorParcela, setValorParcela] = useState(0)
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })

  // Magic link
  const [enviarMagicLink, setEnviarMagicLink] = useState(false)

  // State
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [magicLinkGerado, setMagicLinkGerado] = useState<string | null>(null)

  const valorTotal = Number(valorAdesao) + Number(valorParcela) * Number(parcelas)

  function aoTrocarTemplate(id: string) {
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    if (t && escopoTipo === 'padrao') {
      setEscopo(t.escopo_padrao)
    }
  }

  function aoTrocarTipo(tipo: EscopoTipo) {
    setEscopoTipo(tipo)
    if (tipo === 'padrao') {
      const t = templates.find((x) => x.id === templateId)
      if (t) setEscopo(t.escopo_padrao)
    } else if (tipo === 'personalizado') {
      setEscopo('')
    }
    // editado mantém o que está
  }

  async function submeter() {
    setErro(null)
    if (!clientId && (!cnpj || !razaoSocial || !emailCliente)) {
      setErro('Preencha os dados do cliente.')
      return
    }
    if (!templateId || !escopo.trim()) {
      setErro('Escolha o template e preencha o escopo.')
      return
    }
    if (prazo <= 0 || parcelas <= 0 || valorParcela <= 0) {
      setErro('Prazo, número de parcelas e valor da parcela devem ser > 0.')
      return
    }
    if (!dataInicio) {
      setErro('Defina a data de início do contrato.')
      return
    }

    setSalvando(true)
    const r = await criarProposta({
      client_id: clientId ?? undefined,
      cnpj: cnpj ? onlyDigits(cnpj) : undefined,
      razao_social: razaoSocial,
      email_cliente: emailCliente,
      proposal_template_id: templateId,
      escopo_tipo: escopoTipo,
      escopo_final: escopo,
      prazo_meses: prazo,
      valor_adesao: valorAdesao,
      num_parcelas: parcelas,
      valor_parcela: valorParcela,
      data_inicio_contrato: dataInicio,
      enviar_magic_link: enviarMagicLink,
    })
    setSalvando(false)

    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao salvar.')
      return
    }

    if (r.magic_link) {
      setMagicLinkGerado(r.magic_link)
    } else if (r.proposta_id) {
      router.push(`/propostas/${r.proposta_id}`)
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <PageHeader title="Nova proposta" subtitle="Preencha as 3 seções abaixo e crie a proposta como rascunho." />

      {magicLinkGerado && (
        <Card style={{ marginBottom: 16, background: '#E6F5EC', borderColor: '#1B9E5C' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1B9E5C', marginBottom: 8 }}>
            Proposta criada e link gerado!
          </h3>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Compartilhe este link com o cliente para que ele preencha os dados (válido por 24h):
          </p>
          <code
            style={{
              display: 'block',
              padding: 12,
              background: '#FFFFFF',
              borderRadius: 8,
              fontSize: 12,
              wordBreak: 'break-all',
              border: '1px solid #E5EAF2',
            }}
          >
            {magicLinkGerado}
          </code>
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => router.push('/dashboard')}>Ir para Dashboard</Button>
          </div>
        </Card>
      )}

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#0D1B3E' }}>1. Cliente</h2>
        <Card>
          {clientePre ? (
            <div style={{ background: '#F0F4FB', padding: 12, borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{clientePre.razao_social}</div>
              <div style={{ fontSize: 12, color: '#8A9AB5' }}>CNPJ {formatCnpj(clientePre.cnpj)}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                label="CNPJ"
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
              />
              <Input
                label="Razão social"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
              />
              <Input
                label="E-mail do cliente"
                type="email"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="contato@cliente.com.br"
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={enviarMagicLink}
                  onChange={(e) => setEnviarMagicLink(e.target.checked)}
                />
                Gerar link para o cliente completar os próprios dados (24h)
              </label>
            </div>
          )}
        </Card>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#0D1B3E' }}>2. Proposta</h2>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Select label="Template" value={templateId} onChange={(e) => aoTrocarTemplate(e.target.value)}>
              {templates.length === 0 && <option value="">— sem templates cadastrados —</option>}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>

            <div>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#0D1B3E' }}>
                Tipo de escopo
              </span>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                {(['padrao', 'editado', 'personalizado'] as EscopoTipo[]).map((t) => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input
                      type="radio"
                      name="escopoTipo"
                      checked={escopoTipo === t}
                      onChange={() => aoTrocarTipo(t)}
                    />
                    {t === 'padrao' ? 'Padrão' : t === 'editado' ? 'Padrão editado' : 'Personalizado'}
                  </label>
                ))}
              </div>
            </div>

            <Textarea
              label="Escopo final"
              value={escopo}
              onChange={(e) => setEscopo(e.target.value)}
              rows={12}
              style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 13 }}
              disabled={escopoTipo === 'padrao'}
            />
          </div>
        </Card>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#0D1B3E' }}>3. Comercial</h2>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <Input
              label="Tempo do contrato (meses)"
              type="number"
              min={1}
              max={60}
              value={prazo}
              onChange={(e) => setPrazo(Math.max(1, Number(e.target.value) || 0))}
            />
            <Input
              label="Data de início do contrato"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <Input
              label="Valor de adesão (R$)"
              value={inputMoneyFormat(valorAdesao)}
              onChange={(e) => setValorAdesao(inputMoneyParse(e.target.value))}
              inputMode="numeric"
            />
            <Input
              label="Número de parcelas"
              type="number"
              min={1}
              value={parcelas}
              onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 0))}
            />
            <Input
              label="Valor de cada parcela (R$)"
              value={inputMoneyFormat(valorParcela)}
              onChange={(e) => setValorParcela(inputMoneyParse(e.target.value))}
              inputMode="numeric"
            />
            <div
              style={{
                background: '#F0F4FB',
                padding: 14,
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 11, color: '#8A9AB5', fontWeight: 600, textTransform: 'uppercase' }}>
                Valor total
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#0D1B3E' }}>
                {formatCurrency(valorTotal)}
              </span>
            </div>
          </div>
        </Card>
      </section>

      {erro && (
        <Card style={{ background: '#FCE8E8', borderColor: '#D64545', marginBottom: 16 }}>
          <p style={{ color: '#D64545', fontSize: 13 }}>{erro}</p>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button onClick={submeter} loading={salvando}>
          Criar proposta
        </Button>
      </div>
    </div>
  )
}
