// Validação e formatação de CNPJ

export function formatCnpj(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 14)
  if (nums.length <= 2) return nums
  if (nums.length <= 5) return `${nums.slice(0, 2)}.${nums.slice(2)}`
  if (nums.length <= 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`
  if (nums.length <= 12)
    return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`
  return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`
}

export function onlyDigits(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

export function validateCnpj(cnpj: string): boolean {
  const nums = onlyDigits(cnpj)
  if (nums.length !== 14) return false
  if (/^(\d)\1+$/.test(nums)) return false

  const calc = (slice: number) => {
    const factors = slice === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let soma = 0
    for (let i = 0; i < slice; i++) soma += parseInt(nums[i]) * factors[i]
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  return calc(12) === parseInt(nums[12]) && calc(13) === parseInt(nums[13])
}
