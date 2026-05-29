/**
 * Constrói o map de placeholders → valores reais a partir dos dados da proposta.
 *
 * Suporta 3 conjuntos de templates simultaneamente:
 *  - Propostas Assessoria (lowercase, 12 placeholders)
 *  - Proposta BPO Financeiro (UPPERCASE, 8 placeholders, "mensalidade" em vez de "parcela")
 *  - Contrato Assessoria (lowercase, com dados de contratante/contratada)
 *
 * Cada template usa apenas os placeholders que tem no .docx — os demais são ignorados.
 */
import extenso from 'extenso'
import { Client, Contractor, Proposal, formatCurrency, formatDate } from '@/lib/db/types'
import { formatCnpj, formatDocumento } from '@/lib/db/cnpj'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function dataExtenso(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

function calcDataFim(iso: string, meses: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setMonth(d.getMonth() + meses)
  return d.toISOString().slice(0, 10)
}

function valorExtenso(n: number): string {
  try {
    return extenso(n.toFixed(2), { mode: 'currency', currency: { type: 'BRL' } })
  } catch {
    return ''
  }
}

function numExtenso(n: number): string {
  try {
    return extenso(String(n))
  } catch {
    return String(n)
  }
}

function enderecoCompleto(cliente: Client): string {
  return [
    cliente.endereco_logradouro,
    cliente.endereco_numero,
    cliente.endereco_complemento,
    cliente.endereco_bairro,
    cliente.endereco_cidade && cliente.endereco_uf
      ? `${cliente.endereco_cidade}/${cliente.endereco_uf}`
      : '',
    cliente.endereco_cep ? `CEP ${cliente.endereco_cep}` : '',
  ]
    .filter(Boolean)
    .join(', ')
}

function enderecoResidencialResponsavel(cliente: Client): string {
  return [
    cliente.responsavel_endereco_logradouro,
    cliente.responsavel_endereco_numero,
    cliente.responsavel_endereco_complemento,
    cliente.responsavel_endereco_bairro,
    cliente.responsavel_endereco_cidade && cliente.responsavel_endereco_uf
      ? `${cliente.responsavel_endereco_cidade}/${cliente.responsavel_endereco_uf}`
      : '',
    cliente.responsavel_endereco_cep ? `CEP ${cliente.responsavel_endereco_cep}` : '',
  ]
    .filter(Boolean)
    .join(', ')
}

export function montarValores(
  proposal: Proposal,
  cliente: Client,
  contratante: Contractor,
  customsArg: Record<string, string> = {},
): Record<string, string> {
  const total = Number(proposal.valor_adesao) + Number(proposal.valor_parcela) * proposal.num_parcelas
  const anoAtual = new Date(proposal.data_proposta + 'T12:00:00').getFullYear()
  const dataFim = calcDataFim(proposal.data_inicio_contrato, proposal.prazo_meses)

  const enderecoCli = enderecoCompleto(cliente)
  const nomeContratada = contratante.razao_social
  const docContratada = formatDocumento(contratante.documento, contratante.tipo)
  const enderecoContratada = contratante.endereco

  // === CONJUNTO 1 — Propostas Assessoria (lowercase, 13) ===
  const assessoria = {
    ano_atual: String(anoAtual),
    ano_subsequente: String(anoAtual + 1),
    data_atual_extenso: dataExtenso(proposal.data_proposta),
    email_contratante: cliente.email,
    nome_cliente: cliente.responsavel_nome ?? '',
    nome_empresa: cliente.razao_social,
    num_proposta: proposal.numero,
    parcelas: String(proposal.num_parcelas),
    parcelas_extenso: numExtenso(proposal.num_parcelas),
    tempo_contrato: String(proposal.prazo_meses),
    valor_adesao: formatCurrency(Number(proposal.valor_adesao)),
    valor_extenso: valorExtenso(Number(proposal.valor_adesao)),
    valor_parcela: formatCurrency(Number(proposal.valor_parcela)),
  }

  // === CONJUNTO 2 — Proposta BPO Financeiro (UPPERCASE, 8) ===
  const bpoFinanceiro = {
    ADESAO_EXTENSO: valorExtenso(Number(proposal.valor_adesao)),
    DATA_ATUAL_EXTENSO: dataExtenso(proposal.data_proposta),
    EMPRESA: cliente.razao_social,
    NOME_CLIENTE: cliente.responsavel_nome ?? '',
    NUM_PROPOSTA: proposal.numero,
    VALOR_ADESAO: formatCurrency(Number(proposal.valor_adesao)),
    VALOR_MENSALIDADE: formatCurrency(Number(proposal.valor_parcela)),
    VALOR_MENSALIDADE_EXTENSO: valorExtenso(Number(proposal.valor_parcela)),
  }

  // === CONJUNTO 3 — Contrato Assessoria (lowercase, dados das partes) ===
  const contrato = {
    cnpj_contratante: formatCnpj(cliente.cnpj),
    endereco_contratante: enderecoCli,
    nome_contratada: nomeContratada,
    cnpj_contratada: docContratada,
    endereco_contratada: enderecoContratada,
    data_assinatura_extenso: dataExtenso(proposal.data_proposta),
  }

  // === CONJUNTO 4 — Dados do RESPONSÁVEL (uso em contratos/propostas) ===
  const responsavel = {
    responsavel_nome: cliente.responsavel_nome ?? '',
    responsavel_cargo: cliente.responsavel_cargo ?? '',
    responsavel_cpf: cliente.responsavel_cpf ?? '',
    responsavel_email: cliente.responsavel_email ?? '',
    responsavel_endereco: enderecoResidencialResponsavel(cliente),
  }

  // === Valores auxiliares ainda úteis (legado / contrato dinâmico) ===
  const auxiliares = {
    numero: proposal.numero,
    data_proposta: formatDate(proposal.data_proposta),
    data_inicio: formatDate(proposal.data_inicio_contrato),
    data_inicio_extenso: dataExtenso(proposal.data_inicio_contrato),
    data_fim: formatDate(dataFim),
    data_fim_extenso: dataExtenso(dataFim),
    valor_total: formatCurrency(total),
    valor_total_extenso: valorExtenso(total),
    cnpj: formatCnpj(cliente.cnpj),
    email_cliente: cliente.email,
    endereco_cliente: enderecoCli,
  }

  // Custom placeholders: valores da proposta (custom_values) + argumento opcional
  const customs = { ...(proposal.custom_values ?? {}), ...customsArg }

  return {
    ...assessoria,
    ...bpoFinanceiro,
    ...contrato,
    ...responsavel,
    ...auxiliares,
    ...customs,
  }
}

/**
 * Lista oficial de placeholders disponíveis, organizados por categoria.
 * Usado na tela de referência (Templates → Propostas/Contratos).
 */
export const PLACEHOLDERS_DISPONIVEIS = {
  'Propostas Assessoria': [
    { nome: 'ano_atual', descricao: 'Ano da proposta (ex.: 2026)' },
    { nome: 'ano_subsequente', descricao: 'Ano seguinte (ex.: 2027)' },
    { nome: 'data_atual_extenso', descricao: 'Data da proposta por extenso (22 de maio de 2026)' },
    { nome: 'email_contratante', descricao: 'E-mail do contratante (empresa)' },
    { nome: 'nome_cliente', descricao: 'Nome do responsável do contratante' },
    { nome: 'nome_empresa', descricao: 'Razão social do contratante' },
    { nome: 'num_proposta', descricao: 'Número da proposta (0526-XX.XX)' },
    { nome: 'parcelas', descricao: 'Número de parcelas (5)' },
    { nome: 'parcelas_extenso', descricao: 'Número de parcelas por extenso (cinco)' },
    { nome: 'tempo_contrato', descricao: 'Prazo do contrato em meses (5)' },
    { nome: 'valor_adesao', descricao: 'Valor de adesão formatado (R$ 2.700,00)' },
    { nome: 'valor_extenso', descricao: 'Valor de adesão por extenso (dois mil e setecentos reais)' },
    { nome: 'valor_parcela', descricao: 'Valor de cada parcela (R$ 540,00)' },
  ],
  'Proposta BPO Financeiro': [
    { nome: 'ADESAO_EXTENSO', descricao: 'Valor de adesão por extenso' },
    { nome: 'DATA_ATUAL_EXTENSO', descricao: 'Data da proposta por extenso' },
    { nome: 'EMPRESA', descricao: 'Razão social do contratante' },
    { nome: 'NOME_CLIENTE', descricao: 'Nome do responsável' },
    { nome: 'NUM_PROPOSTA', descricao: 'Número da proposta' },
    { nome: 'VALOR_ADESAO', descricao: 'Valor de adesão formatado' },
    { nome: 'VALOR_MENSALIDADE', descricao: 'Valor da mensalidade (= valor_parcela)' },
    { nome: 'VALOR_MENSALIDADE_EXTENSO', descricao: 'Mensalidade por extenso' },
  ],
  'Contratos': [
    { nome: 'nome_empresa', descricao: 'Razão social do CONTRATANTE' },
    { nome: 'cnpj_contratante', descricao: 'CNPJ do CONTRATANTE formatado' },
    { nome: 'endereco_contratante', descricao: 'Endereço completo do CONTRATANTE' },
    { nome: 'nome_contratada', descricao: 'Razão social da CONTRATADA (Vertex)' },
    { nome: 'cnpj_contratada', descricao: 'CNPJ da CONTRATADA' },
    { nome: 'endereco_contratada', descricao: 'Endereço da CONTRATADA' },
    { nome: 'num_proposta', descricao: 'Número da proposta vinculada' },
    { nome: 'data_assinatura_extenso', descricao: 'Data da assinatura por extenso' },
  ],
  'Responsável (uso em propostas e contratos)': [
    { nome: 'responsavel_nome', descricao: 'Nome completo do responsável' },
    { nome: 'responsavel_cargo', descricao: 'Cargo do responsável na empresa' },
    { nome: 'responsavel_cpf', descricao: 'CPF do responsável' },
    { nome: 'responsavel_email', descricao: 'E-mail corporativo do responsável' },
    { nome: 'responsavel_endereco', descricao: 'Endereço residencial completo do responsável' },
  ],
} as const
