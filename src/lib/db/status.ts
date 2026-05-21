import { StatusProposta } from './types'

export const STATUS_LABEL: Record<StatusProposta, string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  enviada: 'Enviada',
  aberta: 'Aberta pelo cliente',
  em_negociacao: 'Em negociação',
  fechada: 'Fechada',
  aguardando_re_aceite: 'Aguardando re-aceite',
  contrato_gerado: 'Contrato gerado',
  devolvida: 'Devolvida',
  rejeitada: 'Rejeitada',
  perdida: 'Perdida',
  cancelada: 'Cancelada',
}

export const STATUS_VARIANT: Record<StatusProposta, 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  rascunho: 'neutral',
  aguardando_aprovacao: 'warning',
  aprovada: 'info',
  enviada: 'info',
  aberta: 'info',
  em_negociacao: 'warning',
  fechada: 'success',
  aguardando_re_aceite: 'warning',
  contrato_gerado: 'success',
  devolvida: 'warning',
  rejeitada: 'error',
  perdida: 'error',
  cancelada: 'error',
}

export function isTerminal(status: StatusProposta): boolean {
  return ['rejeitada', 'perdida', 'cancelada', 'contrato_gerado'].includes(status)
}
