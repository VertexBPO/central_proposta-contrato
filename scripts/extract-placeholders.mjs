import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'

const folder = '/Users/sandroalves/Claude/Apps Projetos/Central de Propostas e Contratos/Propostas Modelo'
const files = readdirSync(folder).filter((f) => f.endsWith('.docx'))

// Extrai placeholders {{x}} mesmo que Word tenha quebrado em <w:r>
// Pega texto plano concatenando todos os <w:t>
async function extrairPlaceholders(filePath) {
  const buf = readFileSync(filePath)
  const zip = await JSZip.loadAsync(buf)
  const xml = await zip.file('word/document.xml').async('string')

  // Concatena todos os <w:t> em sequência (sem perder ordem)
  const textos = []
  const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    textos.push(m[1])
  }
  const textoCompleto = textos.join('')

  // Pega tudo entre {{ }}
  const placeholders = new Set()
  const phRe = /\{\{([^{}]+)\}\}/g
  while ((m = phRe.exec(textoCompleto)) !== null) {
    placeholders.add(m[1].trim())
  }
  return [...placeholders].sort()
}

const matriz = {}
const todos = new Set()

for (const f of files) {
  const phs = await extrairPlaceholders(join(folder, f))
  matriz[f] = phs
  phs.forEach((p) => todos.add(p))
}

const universo = [...todos].sort()

// Imprime matriz
console.log('\n=== MATRIZ DE PLACEHOLDERS ===\n')
console.log(`${universo.length} placeholders únicos no universo total\n`)

// Header
const arquivos = Object.keys(matriz)
const nomesCurtos = arquivos.map((a) => a.replace('Proposta_Assessoria-Empresarial', 'P').replace('.docx', '').trim())
console.log('Placeholder' + ' '.repeat(40 - 'Placeholder'.length) + nomesCurtos.map((_, i) => `[${i + 1}]`).join(' '))
console.log('-'.repeat(40 + nomesCurtos.length * 4))

for (const ph of universo) {
  const linha = arquivos.map((a) => (matriz[a].includes(ph) ? '✓' : '·')).join('   ')
  const padded = ph.padEnd(40, ' ')
  console.log(`${padded}${linha}`)
}

console.log('\n=== LEGENDA ===')
nomesCurtos.forEach((n, i) => console.log(`[${i + 1}] ${n}`))

// Diff: placeholders que NÃO estão em todas
console.log('\n=== DIFERENÇAS (placeholder não presente em algum arquivo) ===\n')
let temDif = false
for (const ph of universo) {
  const ausentes = arquivos.filter((a) => !matriz[a].includes(ph))
  if (ausentes.length > 0) {
    temDif = true
    console.log(`  {{${ph}}}`)
    console.log(`    AUSENTE em: ${ausentes.map((a) => nomesCurtos[arquivos.indexOf(a)]).join(', ')}`)
  }
}
if (!temDif) console.log('  Todos os arquivos têm exatamente os mesmos placeholders. ✓')
