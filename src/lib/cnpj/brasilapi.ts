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
}

interface ReceitaWsResponse {
  status?: string
  message?: string
  nome?: string
  fantasia?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  email?: string
  telefone?: string
  situacao?: string
}

const UA = 'Mozilla/5.0 (compatible; Vertex-CPC/1.0)'

async function tentarBrasilApi(cnpj: string): Promise<CnpjDados | null> {
  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      cache: 'no-store',
    })
    if (!resp.ok) return null
    const data = (await resp.json()) as BrasilApiResponse
    if (!data.razao_social) return null
    const cepRaw = (data.cep ?? '').replace(/\D/g, '')
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
      cep: cepRaw.length === 8 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : cepRaw,
      situacao: data.descricao_situacao_cadastral || '',
    }
  } catch {
    return null
  }
}

async function tentarReceitaWs(cnpj: string): Promise<CnpjDados | null> {
  try {
    const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      cache: 'no-store',
    })
    if (!resp.ok) return null
    const data = (await resp.json()) as ReceitaWsResponse
    if (data.status === 'ERROR' || !data.nome) return null
    return {
      razao_social: data.nome,
      nome_fantasia: data.fantasia || null,
      email: data.email || null,
      telefone: data.telefone || null,
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      uf: data.uf || '',
      cep: data.cep || '',
      situacao: data.situacao || '',
    }
  } catch {
    return null
  }
}

export async function buscarCnpj(cnpj: string): Promise<CnpjDados | { erro: string }> {
  const digits = onlyDigits(cnpj)
  if (digits.length !== 14) return { erro: 'CNPJ precisa ter 14 dígitos.' }

  const r1 = await tentarBrasilApi(digits)
  if (r1) return r1

  const r2 = await tentarReceitaWs(digits)
  if (r2) return r2

  return { erro: 'CNPJ não encontrado (BrasilAPI e ReceitaWS bloquearam ou não retornaram).' }
}
