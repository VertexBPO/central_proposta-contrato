import { notFound } from 'next/navigation'
import { carregarPropostaPorToken } from '@/lib/cliente/sessao'
import { AprovarClient } from './client'

export const dynamic = 'force-dynamic'

export default async function AprovarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const proposta = await carregarPropostaPorToken(token)
  if (!proposta) notFound()

  return (
    <AprovarClient
      token={token}
      numero={proposta.numero}
      empresa={proposta.cliente.razao_social ?? ''}
      status={proposta.status}
      propostaId={proposta.id}
    />
  )
}
