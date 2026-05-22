// Validação e formatação de CNPJ e CPF.

export type TipoDocumento = 'PJ' | 'PF'

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

// ===== CNPJ (PJ) =====

export function formatCnpj(value: string): string {
  const nums = onlyDigits(value).slice(0, 14)
  if (nums.length <= 2) return nums
  if (nums.length <= 5) return `${nums.slice(0, 2)}.${nums.slice(2)}`
  if (nums.length <= 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`
  if (nums.length <= 12) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`
  return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`
}

export function validateCnpj(value: string): boolean {
  const nums = onlyDigits(value)
  if (nums.length !== 14) return false
  if (/^(\d)\1+$/.test(nums)) return false

  const calc = (slice: number) => {
    const factors = slice === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let soma = 0
    for (let i = 0; i < slice; i++) soma += parseInt(nums[i]) * factors[i]
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  return calc(12) === parseInt(nums[12]) && calc(13) === parseInt(nums[13])
}

// ===== CPF (PF) =====

export function formatCpf(value: string): string {
  const nums = onlyDigits(value).slice(0, 11)
  if (nums.length <= 3) return nums
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`
}

export function validateCpf(value: string): boolean {
  const nums = onlyDigits(value)
  if (nums.length !== 11) return false
  if (/^(\d)\1+$/.test(nums)) return false

  const calc = (slice: number) => {
    let soma = 0
    for (let i = 0; i < slice; i++) soma += parseInt(nums[i]) * (slice + 1 - i)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  return calc(9) === parseInt(nums[9]) && calc(10) === parseInt(nums[10])
}

// ===== Genérico =====

export function formatDocumento(value: string, tipo: TipoDocumento): string {
  return tipo === 'PJ' ? formatCnpj(value) : formatCpf(value)
}

export function validateDocumento(value: string, tipo: TipoDocumento): boolean {
  return tipo === 'PJ' ? validateCnpj(value) : validateCpf(value)
}

export function labelDocumento(tipo: TipoDocumento): string {
  return tipo === 'PJ' ? 'CNPJ' : 'CPF'
}

export function labelNome(tipo: TipoDocumento): string {
  return tipo === 'PJ' ? 'Razão social' : 'Nome completo'
}
