// Types do domínio — alinhado ao schema em supabase/migrations/

export type Papel = 'admin' | 'operador'

export type StatusProposta =
  | 'rascunho'
  | 'aguardando_aprovacao'
  | 'aprovada'
  | 'enviada'
  | 'aberta'
  | 'em_negociacao'
  | 'fechada'
  | 'aguardando_re_aceite'
  | 'contrato_gerado'
  | 'devolvida'
  | 'rejeitada'
  | 'perdida'
  | 'cancelada'

export type EscopoTipo = 'padrao' | 'editado' | 'personalizado'

export type FormaAceite = 'email' | 'whatsapp' | 'verbal' | 'outro'

export type TipoEmailTemplate =
  | 'envio_proposta'
  | 'lembrete'
  | 'envio_contrato'
  | 're_aceite'
  | 'reabertura'

export interface User {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  mfa_habilitado: boolean
  criado_em: string
  atualizado_em: string
}

export interface Client {
  id: string
  razao_social: string
  cnpj: string
  responsavel_nome: string | null
  email: string
  telefone: string | null
  endereco_logradouro: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_uf: string | null
  endereco_cep: string | null
  criado_em: string
  atualizado_em: string
  deletado_em: string | null
  deletado_por: string | null
}

export interface ProposalTemplate {
  id: string
  nome: string
  slug: string
  descricao: string | null
  escopo_padrao: string
  contract_template_id: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface ContractTemplate {
  id: string
  nome: string
  slug: string
  corpo: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface EmailTemplate {
  id: string
  tipo: TipoEmailTemplate
  assunto: string
  corpo_html: string
  atualizado_em: string
}

export interface Proposal {
  id: string
  numero: string
  client_id: string
  proposal_template_id: string
  contract_template_id_override: string | null
  operador_id: string
  aprovador_id: string | null
  status: StatusProposta
  escopo_final: string
  escopo_tipo: EscopoTipo
  prazo_meses: number
  valor_adesao: number
  num_parcelas: number
  valor_parcela: number
  data_proposta: string
  data_inicio_contrato: string
  forma_aceite: FormaAceite | null
  forma_aceite_descricao: string | null
  motivo_perdida: string | null
  motivo_devolucao: string | null
  motivo_cancelamento: string | null
  aceito_em: string | null
  magic_link_token: string | null
  magic_link_expira_em: string | null
  pdf_storage_path: string | null
  docx_storage_path: string | null
  criado_em: string
  atualizado_em: string
}

export interface Contract {
  id: string
  proposal_id: string
  numero: string
  pdf_storage_path: string | null
  docx_storage_path: string | null
  zapsign_doc_id: string | null
  zapsign_url: string | null
  gerado_em: string
  enviado_zapsign_em: string | null
  assinado_em: string | null
  assinatura_url: string | null
  atualizado_em: string
}

export interface Parameters {
  id: 1
  email_vertex: string
  contratante_razao_social: string
  contratante_cnpj: string
  contratante_endereco: string
  intervalo_lembrete_dias: number
  max_lembretes: number
  timeout_contrato_dias: number
  atualizado_em: string
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}
