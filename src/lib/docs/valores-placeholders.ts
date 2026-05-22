/**
 * Constrói o map de placeholders → valores reais a partir dos dados da proposta.
 * Mesmas chaves do antigo render-placeholders, agora servindo docxtemplater.
 */
import extenso from 'extenso'
import { Client, Contractor, Proposal, formatCurrency, formatDate } from '@/lib/db/types'
import { formatCnpj, formatDocumento, labelDocumento } from '@/lib/db/cnpj'

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

export function montarValores(
  proposal: Proposal,
  cliente: Client,
  contratante: Contractor,
  escopo = ''
): Record<string, string> {
  const total = Number(proposal.valor_adesao) + Number(proposal.valor_parcela) * proposal.num_parcelas
  const anoAtual = new Date(proposal.data_proposta + 'T12:00:00').getFullYear()
  const dataFim = calcDataFim(proposal.data_inicio_contrato, proposal.prazo_meses)

  const enderecoCliente = [
    cliente.endereco_logradouro,
    cliente.endereco_numero,
    cliente.endereco_complemento,
    cliente.endereco_bairro,
    cliente.endereco_cidade && cliente.endereco_uf ? `${cliente.endereco_cidade}/${cliente.endereco_uf}` : '',
    cliente.endereco_cep,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    // Cliente
    razao_social: cliente.razao_social,
    nome_empresa: cliente.razao_social,
    cnpj: formatCnpj(cliente.cnpj),
    cnpj_numeros: cliente.cnpj,
    responsavel_nome: cliente.responsavel_nome ?? '',
    nome_cliente: cliente.responsavel_nome ?? '',
    email_cliente: cliente.email,
    telefone_cliente: cliente.telefone ?? '',
    endereco_cliente: enderecoCliente,

    // Contratante
    contratante_razao_social: contratante.razao_social,
    contratante_nome: contratante.razao_social,
    contratante_documento: formatDocumento(contratante.documento, contratante.tipo),
    contratante_documento_label: labelDocumento(contratante.tipo),
    contratante_cnpj: formatDocumento(contratante.documento, contratante.tipo),
    contratante_cpf: formatDocumento(contratante.documento, contratante.tipo),
    contratante_endereco: contratante.endereco,
    contratante_tipo: contratante.tipo,

    // Proposta
    numero: proposal.numero,
    num_proposta: proposal.numero,
    data_proposta: formatDate(proposal.data_proposta),
    data_proposta_extenso: dataExtenso(proposal.data_proposta),
    data_atual_extenso: dataExtenso(proposal.data_proposta),
    data_inicio: formatDate(proposal.data_inicio_contrato),
    data_inicio_extenso: dataExtenso(proposal.data_inicio_contrato),
    data_fim: formatDate(dataFim),
    data_fim_extenso: dataExtenso(dataFim),
    data_termino: formatDate(dataFim),

    ano_atual: String(anoAtual),
    ano_subsequente: String(anoAtual + 1),

    // Comercial
    prazo_meses: String(proposal.prazo_meses),
    prazo_meses_extenso: numExtenso(proposal.prazo_meses),
    tempo_contrato: String(proposal.prazo_meses),

    valor_adesao: formatCurrency(Number(proposal.valor_adesao)),
    valor_adesao_extenso: valorExtenso(Number(proposal.valor_adesao)),

    num_parcelas: String(proposal.num_parcelas),
    num_parcelas_extenso: numExtenso(proposal.num_parcelas),
    parcelas: String(proposal.num_parcelas),
    parcelas_extenso: numExtenso(proposal.num_parcelas),

    valor_parcela: formatCurrency(Number(proposal.valor_parcela)),
    valor_parcela_extenso: valorExtenso(Number(proposal.valor_parcela)),

    valor_total: formatCurrency(total),
    valor_total_extenso: valorExtenso(total),

    // Escopo (já preenchido pela view do template de proposta)
    escopo,
  }
}
