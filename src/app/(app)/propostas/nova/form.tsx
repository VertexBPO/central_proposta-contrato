'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Client, Contractor, ProposalTemplate, CustomPlaceholder, formatCurrency } from '@/lib/db/types'
import { formatCnpj, onlyDigits } from '@/lib/db/cnpj'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { criarProposta } from './actions'

interface Props {
  templates: ProposalTemplate[]
  contratantes: Contractor[]
  customPlaceholders: CustomPlaceholder[]
  clientePre: Client | null
}

function inputMoneyParse(s: string): number {
  const nums = s.replace(/\D/g, '')
  return Number(nums) / 100
}

function inputMoneyFormat(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCep(s: string): string {
  const d = s.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export function NovaPropostaForm({ templates, contratantes, customPlaceholders, clientePre }: Props) {
  const router = useRouter()

  // Contratante (cliente)
  const [clientId] = useState<string | null>(clientePre?.id ?? null)
  const [cnpj, setCnpj] = useState(clientePre?.cnpj ? formatCnpj(clientePre.cnpj) : '')
  const [razaoSocial, setRazaoSocial] = useState(clientePre?.razao_social ?? '')
  const [emailCliente, setEmailCliente] = useState(clientePre?.email ?? '')
  const [logradouro, setLogradouro] = useState(clientePre?.endereco_logradouro ?? '')
  const [numero, setNumero] = useState(clientePre?.endereco_numero ?? '')
  const [complemento, setComplemento] = useState(clientePre?.endereco_complemento ?? '')
  const [bairro, setBairro] = useState(clientePre?.endereco_bairro ?? '')
  const [cidade, setCidade] = useState(clientePre?.endereco_cidade ?? '')
  const [uf, setUf] = useState(clientePre?.endereco_uf ?? '')
  const [cep, setCep] = useState(clientePre?.endereco_cep ?? '')

  // CNPJ lookup
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [avisoCnpj, setAvisoCnpj] = useState<string | null>(null)
  const ultimoCnpjBuscado = useRef<string>('')

  // Contratada (Vertex)
  const [contractorId, setContractorId] = useState(contratantes[0]?.id ?? '')

  // Proposta
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')

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

  // Custom placeholders (valores digitados pelo operador)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  // Magic link
  // Magic link removido — cliente não preenche mais dados no início do fluxo

  // State
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [magicLinkGerado, setMagicLinkGerado] = useState<string | null>(null)

  const valorTotal = Number(valorAdesao) + Number(valorParcela) * Number(parcelas)

  async function buscarCnpjNaReceita(digits: string) {
    if (ultimoCnpjBuscado.current === digits) return
    ultimoCnpjBuscado.current = digits
    setAvisoCnpj(null)
    setBuscandoCnpj(true)
    try {
      const resp = await fetch(`/api/cnpj/${digits}`, { cache: 'no-store' })
      const data = await resp.json()
      if (!resp.ok || data.erro) {
        setAvisoCnpj(data.erro || 'Falha ao buscar CNPJ.')
        return
      }
      setRazaoSocial(data.razao_social ?? '')
      setLogradouro(data.endereco_logradouro ?? '')
      setNumero(data.endereco_numero ?? '')
      setComplemento(data.endereco_complemento ?? '')
      setBairro(data.endereco_bairro ?? '')
      setCidade(data.endereco_cidade ?? '')
      setUf(data.endereco_uf ?? '')
      const cepRaw = (data.endereco_cep ?? '').replace(/\D/g, '')
      setCep(cepRaw.length === 8 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : cepRaw)
      if (data.email_receita && !emailCliente) setEmailCliente(data.email_receita)
      setAvisoCnpj('✓ Dados carregados da Receita.')
    } catch (e) {
      setAvisoCnpj(e instanceof Error ? e.message : 'Erro de rede.')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  // Auto-busca CNPJ com debounce de 400ms quando completa 14 dígitos
  useEffect(() => {
    if (clientePre) return
    const digits = onlyDigits(cnpj)
    if (digits.length !== 14) {
      ultimoCnpjBuscado.current = ''
      return
    }
    const t = setTimeout(() => buscarCnpjNaReceita(digits), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpj, clientePre])

  function aoTrocarTemplate(id: string) {
    setTemplateId(id)
  }

  async function submeter() {
    setErro(null)
    if (!clientId && (!cnpj || !razaoSocial || !emailCliente)) {
      setErro('Preencha os dados do contratante.')
      return
    }
    if (!templateId) {
      setErro('Escolha o template.')
      return
    }
    if (!contractorId) {
      setErro('Escolha a contratada (cadastre em "Contratada" se a lista estiver vazia).')
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
      endereco_logradouro: logradouro || undefined,
      endereco_numero: numero || undefined,
      endereco_complemento: complemento || undefined,
      endereco_bairro: bairro || undefined,
      endereco_cidade: cidade || undefined,
      endereco_uf: uf || undefined,
      endereco_cep: cep || undefined,
      contractor_id: contractorId,
      proposal_template_id: templateId,
      scope_template_id: null,
      escopo_tipo: 'padrao',
      escopo_final: '',
      prazo_meses: prazo,
      valor_adesao: valorAdesao,
      num_parcelas: parcelas,
      valor_parcela: valorParcela,
      data_inicio_contrato: dataInicio,
      custom_values: customValues,
      enviar_magic_link: false,
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
      <PageHeader title="Nova proposta" subtitle="Selecione o tipo de proposta, contratante e valores. O escopo já está embutido no template." />

      {magicLinkGerado && (
        <Card style={{ marginBottom: 16, background: '#E6F5EC', borderColor: '#1B9E5C' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1B9E5C', marginBottom: 8 }}>
            Proposta criada e link gerado!
          </h3>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Compartilhe este link com o contratante para que ele preencha os dados (válido por 24h):
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
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#0D1B3E' }}>1. Contratante</h2>
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
                placeholder="00.000.000/0000-00 (busca automática ao completar)"
                inputMode="numeric"
              />
              {buscandoCnpj && (
                <div style={{ fontSize: 12, color: '#8A9AB5' }}>Consultando Receita…</div>
              )}
              {!buscandoCnpj && avisoCnpj && (
                <div
                  style={{
                    fontSize: 12,
                    color: avisoCnpj.startsWith('✓') ? '#1B9E5C' : '#D64545',
                    background: avisoCnpj.startsWith('✓') ? '#E6F5EC' : '#FCE8E8',
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  {avisoCnpj}
                </div>
              )}
              <Input
                label="Razão social"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
              />
              <Input
                label="E-mail do contratante"
                type="email"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="contato@contratante.com.br"
              />

              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0D1B3E', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Endereço
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input
                  label="CEP"
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
                <div />
                <div style={{ gridColumn: '1 / span 2' }}>
                  <Input
                    label="Logradouro"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Rua / Av."
                  />
                </div>
                <Input
                  label="Número"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
                <Input
                  label="Complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
                <Input
                  label="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
                <Input
                  label="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
                <Select
                  label="UF"
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                >
                  <option value="">—</option>
                  {UFS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </div>

            </div>
          )}
        </Card>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#0D1B3E' }}>2. Proposta</h2>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Select label="Contratada" value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
              {contratantes.length === 0 && <option value="">— cadastre a contratada primeiro —</option>}
              {contratantes.map((c) => (
                <option key={c.id} value={c.id}>{c.razao_social}</option>
              ))}
            </Select>
            <Select label="Tipo de proposta" value={templateId} onChange={(e) => aoTrocarTemplate(e.target.value)}>
              {templates.length === 0 && <option value="">— sem templates cadastrados —</option>}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>

            <div style={{ background: '#F0F4FB', padding: 12, borderRadius: 10, fontSize: 13, color: '#0D1B3E' }}>
              ℹ️ Cada template já contém o escopo da modalidade. O sistema só preenche os dados do contratante e os valores comerciais.
            </div>
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

      {customPlaceholders.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#0D1B3E' }}>
            4. Campos personalizados
          </h2>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {customPlaceholders.map((cp) => (
                <Input
                  key={cp.id}
                  label={`${cp.descricao} {{${cp.nome}}}`}
                  value={customValues[cp.nome] ?? ''}
                  onChange={(e) => setCustomValues((v) => ({ ...v, [cp.nome]: e.target.value }))}
                />
              ))}
            </div>
          </Card>
        </section>
      )}

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
