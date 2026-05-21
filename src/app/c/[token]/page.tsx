import { redirect } from 'next/navigation'
import { carregarPropostaPorToken, setClienteSessao } from '@/lib/cliente/sessao'

export const dynamic = 'force-dynamic'

export default async function MagicLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const proposta = await carregarPropostaPorToken(token)

  if (!proposta) {
    redirect('/c/expirado')
  }

  await setClienteSessao(token)
  redirect('/c/preencher')
}
