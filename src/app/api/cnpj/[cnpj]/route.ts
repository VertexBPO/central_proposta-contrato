import { NextRequest, NextResponse } from 'next/server'
import { onlyDigits, validateCnpj } from '@/lib/db/cnpj'

interface BrasilApiResposta {
  razao_social: string
  nome_fantasia: string | null
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  municipio: string
  uf: string
  cep: string
  email: string | null
  ddd_telefone_1: string | null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj: raw } = await params
  const cnpj = onlyDigits(raw)

  if (!validateCnpj(cnpj)) {
    return NextResponse.json({ erro: 'CNPJ inválido' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })

    if (res.status === 404) {
      return NextResponse.json({ erro: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })
    }

    if (!res.ok) {
      return NextResponse.json({ erro: `Erro na consulta (HTTP ${res.status})` }, { status: 502 })
    }

    const data = (await res.json()) as BrasilApiResposta

    return NextResponse.json({
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia,
      endereco_logradouro: data.logradouro,
      endereco_numero: data.numero,
      endereco_complemento: data.complemento ?? '',
      endereco_bairro: data.bairro,
      endereco_cidade: data.municipio,
      endereco_uf: data.uf,
      endereco_cep: data.cep,
      telefone: data.ddd_telefone_1 ?? '',
      email_receita: data.email ?? '',
    })
  } catch (err) {
    return NextResponse.json({
      erro: err instanceof Error ? err.message : 'Falha na consulta CNPJ',
    }, { status: 502 })
  }
}
