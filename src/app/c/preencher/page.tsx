import { redirect } from 'next/navigation'
import { getClienteSessao, carregarPropostaPorToken } from '@/lib/cliente/sessao'
import { PreencherForm } from './form'

export const dynamic = 'force-dynamic'

export default async function PreencherPage() {
  const token = await getClienteSessao()
  if (!token) redirect('/c/expirado')

  const proposta = await carregarPropostaPorToken(token)
  if (!proposta) redirect('/c/expirado')

  return <PreencherForm cliente={proposta.cliente} numero={proposta.numero} />
}
