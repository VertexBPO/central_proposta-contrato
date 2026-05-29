import { StatusProposta } from './types'

export const STATUS_LABEL: Record<StatusProposta, string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovada: 'Aprovada internamente',
  devolvida: 'Devolvida',
  rejeitada: 'Rejeitada',
  enviada: 'Enviada ao cliente',
  aberta: 'Aberta pelo cliente',
  em_negociacao: 'Em negociação',
  aprovada_cliente: 'Aprovada pelo cliente',
  proposta_assinatura_pendente: 'Proposta em assinatura',
  proposta_assinada: 'Proposta assinada',
  aguardando_cadastro: 'Aguardando cadastro p/ contrato',
  contrato_gerado: 'Contrato gerado',
  contrato_assinatura_pendente: 'Contrato em assinatura',
  contrato_assinado: 'Contrato assinado',
  fechada: 'Fechada',
  aguardando_re_aceite: 'Aguardando re-aceite',
  perdida: 'Perdida',
  cancelada: 'Cancelada',
}

export const STATUS_VARIANT: Record<StatusProposta, 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  rascunho: 'neutral',
  aguardando_aprovacao: 'warning',
  aprovada: 'info',
  devolvida: 'warning',
  rejeitada: 'error',
  enviada: 'info',
  aberta: 'info',
  em_negociacao: 'warning',
  aprovada_cliente: 'success',
  proposta_assinatura_pendente: 'warning',
  proposta_assinada: 'success',
  aguardando_cadastro: 'warning',
  contrato_gerado: 'info',
  contrato_assinatura_pendente: 'warning',
  contrato_assinado: 'success',
  fechada: 'success',
  aguardando_re_aceite: 'warning',
  perdida: 'error',
  cancelada: 'error',
}

export function isTerminal(status: StatusProposta): boolean {
  return ['rejeitada', 'perdida', 'cancelada', 'contrato_assinado'].includes(status)
}
