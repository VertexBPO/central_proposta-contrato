import { NextRequest, NextResponse } from 'next/server'
import { buscarCnpj } from '@/lib/cnpj/brasilapi'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await params
  const r = await buscarCnpj(cnpj)
  if ('erro' in r) {
    const status = r.erro.includes('inválido') || r.erro.includes('dígitos') ? 400 : r.erro.includes('não encontrado') ? 404 : 502
    return NextResponse.json({ erro: r.erro }, { status })
  }
  return NextResponse.json({
    razao_social: r.razao_social,
    nome_fantasia: r.nome_fantasia,
    endereco_logradouro: r.logradouro,
    endereco_numero: r.numero,
    endereco_complemento: r.complemento,
    endereco_bairro: r.bairro,
    endereco_cidade: r.cidade,
    endereco_uf: r.uf,
    endereco_cep: r.cep,
    telefone: r.telefone ?? '',
    email_receita: r.email ?? '',
  })
}
