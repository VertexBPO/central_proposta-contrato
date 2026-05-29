// Máscaras de input pra UI. Use junto com onChange:
//   onChange={(e) => setCampo(formatTelefone(e.target.value))}
//
// Sempre salvar no banco apenas os dígitos (onlyDigits).

import { onlyDigits } from './cnpj'

export { onlyDigits, formatCnpj, formatCpf } from './cnpj'

/**
 * Telefone fixo ou celular: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX.
 */
export function formatTelefone(value: string): string {
  const nums = onlyDigits(value).slice(0, 11)
  if (nums.length === 0) return ''
  if (nums.length <= 2) return `(${nums}`
  if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
  if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

/**
 * CEP: XXXXX-XXX.
 */
export function formatCep(value: string): string {
  const nums = onlyDigits(value).slice(0, 8)
  if (nums.length <= 5) return nums
  return `${nums.slice(0, 5)}-${nums.slice(5)}`
}

/**
 * Data BR: DD/MM/AAAA. Pra inputs type="text" (alternativa ao type="date").
 */
export function formatDataBr(value: string): string {
  const nums = onlyDigits(value).slice(0, 8)
  if (nums.length <= 2) return nums
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`
}
