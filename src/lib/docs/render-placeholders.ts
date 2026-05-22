import extenso from 'extenso'
import { Client, Contractor, Proposal, formatCurrency, formatDate } from '@/lib/db/types'
import { formatCnpj } from '@/lib/db/cnpj'

export interface PlaceholderContext {
  proposal: Proposal
  cliente: Client
  contratante: Contractor | { razao_social: string; cnpj: string; endereco: string }
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function dataPorExtenso(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

function valorPorExtenso(valor: number): string {
  try {
    return extenso(valor.toFixed(2), { mode: 'currency', currency: { type: 'BRL' } })
  } catch {
    return ''
  }
}

function numeroPorExtenso(n: number): string {
  try {
    return extenso(String(n))
  } catch {
    return String(n)
  }
}

/**
 * Substitui placeholders no formato {{nome_variavel}} no template.
 */
export function renderPlaceholders(template: string, ctx: PlaceholderContext): string {
  const total = Number(ctx.proposal.valor_adesao) + Number(ctx.proposal.valor_parcela) * ctx.proposal.num_parcelas
  const anoAtual = new Date(ctx.proposal.data_proposta + 'T12:00:00').getFullYear()

  const enderecoCliente = [
    ctx.cliente.endereco_logradouro,
    ctx.cliente.endereco_numero,
    ctx.cliente.endereco_complemento,
    ctx.cliente.endereco_bairro,
    ctx.cliente.endereco_cidade && ctx.cliente.endereco_uf
      ? `${ctx.cliente.endereco_cidade}/${ctx.cliente.endereco_uf}`
      : '',
    ctx.cliente.endereco_cep,
  ]
    .filter(Boolean)
    .join(', ')

  const vars: Record<string, string> = {
    // ===== Cliente =====
    razao_social: ctx.cliente.razao_social,
    cnpj: formatCnpj(ctx.cliente.cnpj),
    cnpj_numeros: ctx.cliente.cnpj,
    responsavel_nome: ctx.cliente.responsavel_nome ?? '',
    email_cliente: ctx.cliente.email,
    telefone_cliente: ctx.cliente.telefone ?? '',
    endereco_cliente: enderecoCliente,
    // Aliases comuns do template
    nome_cliente: ctx.cliente.responsavel_nome ?? '',
    nome_empresa: ctx.cliente.razao_social,

    // ===== Contratante (Vertex / multi) =====
    contratante_razao_social: ctx.contratante.razao_social,
    contratante_cnpj: ctx.contratante.cnpj,
    contratante_endereco: ctx.contratante.endereco,

    // ===== Proposta =====
    numero: ctx.proposal.numero,
    num_proposta: ctx.proposal.numero,
    data_proposta: formatDate(ctx.proposal.data_proposta),
    data_proposta_extenso: dataPorExtenso(ctx.proposal.data_proposta),
    data_atual_extenso: dataPorExtenso(ctx.proposal.data_proposta),
    data_inicio: formatDate(ctx.proposal.data_inicio_contrato),
    data_inicio_extenso: dataPorExtenso(ctx.proposal.data_inicio_contrato),

    // Ano da proposta + ano subsequente
    ano_atual: String(anoAtual),
    ano_subsequente: String(anoAtual + 1),

    // ===== Comercial =====
    prazo_meses: String(ctx.proposal.prazo_meses),
    prazo_meses_extenso: numeroPorExtenso(ctx.proposal.prazo_meses),
    tempo_contrato: String(ctx.proposal.prazo_meses),

    valor_adesao: formatCurrency(Number(ctx.proposal.valor_adesao)),
    valor_adesao_extenso: valorPorExtenso(Number(ctx.proposal.valor_adesao)),

    num_parcelas: String(ctx.proposal.num_parcelas),
    num_parcelas_extenso: numeroPorExtenso(ctx.proposal.num_parcelas),
    parcelas: String(ctx.proposal.num_parcelas),
    parcelas_extenso: numeroPorExtenso(ctx.proposal.num_parcelas),

    valor_parcela: formatCurrency(Number(ctx.proposal.valor_parcela)),
    valor_parcela_extenso: valorPorExtenso(Number(ctx.proposal.valor_parcela)),

    valor_total: formatCurrency(total),
    valor_total_extenso: valorPorExtenso(total),

    // Escopo
    escopo: ctx.proposal.escopo_final,
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}
