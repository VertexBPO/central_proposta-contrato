import { notFound } from 'next/navigation'
import { carregarPropostaPorToken } from '@/lib/cliente/sessao'
import { CadastroClient } from './client'

export const dynamic = 'force-dynamic'

export default async function CadastroPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const proposta = await carregarPropostaPorToken(token)
  if (!proposta) notFound()

  return (
    <CadastroClient
      token={token}
      numero={proposta.numero}
      empresa={proposta.cliente.razao_social ?? ''}
      emailCliente={proposta.cliente.email}
      responsavelAtual={proposta.cliente.responsavel_nome ?? ''}
    />
  )
}
