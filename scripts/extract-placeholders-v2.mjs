import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'

const folder = '/Users/sandroalves/Claude/Apps Projetos/Central de Propostas e Contratos/Toolbox_CPC/Modelos-propostas'
const files = readdirSync(folder).filter((f) => f.endsWith('.docx')).sort()

async function extrairPlaceholders(filePath) {
  const buf = readFileSync(filePath)
  const zip = await JSZip.loadAsync(buf)
  const xml = await zip.file('word/document.xml').async('string')
  const textos = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join('')
  const phs = new Set()
  for (const m of textos.matchAll(/\{\{([^{}]+)\}\}/g)) phs.add(m[1].trim())
  return [...phs].sort()
}

const matriz = {}
const universo = new Set()
for (const f of files) {
  const phs = await extrairPlaceholders(join(folder, f))
  matriz[f] = phs
  phs.forEach((p) => universo.add(p))
}

const universoSorted = [...universo].sort()
const arquivos = Object.keys(matriz)

// Nomes curtos
const nomes = arquivos.map((a) =>
  a.replace('Proposta_Assessoria-Empresarial', 'Ass.')
    .replace('Proposta_BPO Financeiro', 'BPO')
    .replace('.docx', '')
    .trim()
)

console.log('\n=== TABELA DE PLACEHOLDERS POR PROPOSTA ===\n')
console.log(`${universoSorted.length} placeholders únicos no universo\n`)

// Header da tabela
const padNome = (s, n) => s.padEnd(n).slice(0, n)
const COL = 32
console.log(padNome('Placeholder', COL) + arquivos.map((_, i) => `[${i + 1}]`).join('  '))
console.log('-'.repeat(COL + arquivos.length * 4))

for (const ph of universoSorted) {
  const linha = arquivos.map((a) => (matriz[a].includes(ph) ? ' ✓ ' : ' · ')).join(' ')
  console.log(padNome(ph, COL) + linha)
}

console.log('\n=== LEGENDA ===')
nomes.forEach((n, i) => console.log(`[${i + 1}] ${n}`))

console.log('\n=== POR ARQUIVO (placeholders únicos de cada) ===\n')
for (let i = 0; i < arquivos.length; i++) {
  console.log(`[${i + 1}] ${nomes[i]} — ${matriz[arquivos[i]].length} placeholders:`)
  matriz[arquivos[i]].forEach((p) => console.log(`    {{${p}}}`))
  console.log()
}
