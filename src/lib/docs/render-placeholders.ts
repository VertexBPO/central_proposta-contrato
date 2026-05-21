import { Client, Proposal, formatCurrency, formatDate } from '@/lib/db/types'
import { formatCnpj } from '@/lib/db/cnpj'

export interface PlaceholderContext {
  proposal: Proposal
  cliente: Client
  contratante: {
    razao_social: string
    cnpj: string
    endereco: string
  }
}

/**
 * Substitui placeholders no formato {{nome_variavel}} no template.
 * Aceita strings com variáveis padrão do app.
 */
export function renderPlaceholders(template: string, ctx: PlaceholderContext): string {
  const total = Number(ctx.proposal.valor_adesao) + Number(ctx.proposal.valor_parcela) * ctx.proposal.num_parcelas

  const vars: Record<string, string> = {
    // Cliente
    razao_social: ctx.cliente.razao_social,
    cnpj: formatCnpj(ctx.cliente.cnpj),
    cnpj_numeros: ctx.cliente.cnpj,
    responsavel_nome: ctx.cliente.responsavel_nome ?? '',
    email_cliente: ctx.cliente.email,
    telefone_cliente: ctx.cliente.telefone ?? '',
    endereco_cliente: [
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
      .join(', '),

    // Contratante
    contratante_razao_social: ctx.contratante.razao_social,
    contratante_cnpj: ctx.contratante.cnpj,
    contratante_endereco: ctx.contratante.endereco,

    // Proposta
    numero: ctx.proposal.numero,
    data_proposta: formatDate(ctx.proposal.data_proposta),
    data_inicio: formatDate(ctx.proposal.data_inicio_contrato),
    prazo_meses: String(ctx.proposal.prazo_meses),
    valor_adesao: formatCurrency(Number(ctx.proposal.valor_adesao)),
    num_parcelas: String(ctx.proposal.num_parcelas),
    valor_parcela: formatCurrency(Number(ctx.proposal.valor_parcela)),
    valor_total: formatCurrency(total),
    escopo: ctx.proposal.escopo_final,
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}
