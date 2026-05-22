import { onlyDigits } from '@/lib/db/cnpj'

export interface CnpjDados {
  razao_social: string
  nome_fantasia: string | null
  email: string | null
  telefone: string | null
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  situacao: string
}

interface BrasilApiResponse {
  razao_social?: string
  nome_fantasia?: string
  email?: string
  ddd_telefone_1?: string
  descricao_situacao_cadastral?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  message?: string
}

export async function buscarCnpj(cnpj: string): Promise<CnpjDados | { erro: string }> {
  const digits = onlyDigits(cnpj)
  if (digits.length !== 14) return { erro: 'CNPJ precisa ter 14 dígitos.' }

  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (resp.status === 404) return { erro: 'CNPJ não encontrado na Receita.' }
    if (resp.status === 429) return { erro: 'Muitas consultas. Aguarde 1 minuto e tente de novo.' }
    if (!resp.ok) return { erro: `Erro na consulta (HTTP ${resp.status}).` }

    const data = (await resp.json()) as BrasilApiResponse

    if (!data.razao_social) return { erro: 'Resposta inválida da BrasilAPI.' }

    const cepFormatado = data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : ''

    return {
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || null,
      email: data.email || null,
      telefone: data.ddd_telefone_1 || null,
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      uf: data.uf || '',
      cep: cepFormatado,
      situacao: data.descricao_situacao_cadastral || '',
    }
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Erro de rede ao consultar BrasilAPI.' }
  }
}
