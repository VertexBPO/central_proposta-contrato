import { readFileSync } from 'node:fs'
import JSZip from 'jszip'

const buf = readFileSync('/tmp/cpc-debug/proposal-templates__1779487365233-Proposta_Assessoria-Empresarial.docx')
const zip = await JSZip.loadAsync(buf)
const xml = await zip.file('word/document.xml').async('string')

// Acha posição do escopo placeholder
const escopoIdx = xml.indexOf('{{@escopo}}')
const escopoSimpleIdx = xml.indexOf('escopo}}')
const invIdx = xml.indexOf('INVESTIMENTO')
console.log(`{{@escopo}} em: ${escopoIdx}`)
console.log(`escopo}} (qualquer) em: ${escopoSimpleIdx}`)
console.log(`INVESTIMENTO em: ${invIdx}`)

// Pega todos os parágrafos entre o escopo e INVESTIMENTO
const tudo = xml.substring(escopoSimpleIdx >= 0 ? escopoSimpleIdx : 0, invIdx)
const parasEntre = tudo.match(/<w:p[\s>]/g) || []
console.log(`\nParágrafos entre escopo e INVESTIMENTO: ${parasEntre.length}`)

// Lista os parágrafos
const psBetween = tudo.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []
console.log(`\nDETALHE dos ${psBetween.length} parágrafos entre {{escopo}} e INVESTIMENTO:\n`)
psBetween.forEach((p, i) => {
  const temTexto = /<w:t[^>]*>([^<]+)<\/w:t>/.exec(p)
  const temImg = p.includes('<w:drawing') || p.includes('<w:pict')
  const pStyle = p.match(/<w:pStyle\s+w:val="([^"]+)"/)
  console.log(`  ${i}. pStyle=${pStyle?.[1] || 'NORMAL'}  ${temImg ? '[IMG]' : ''}  ${temTexto ? '"' + temTexto[1].substring(0, 60) + '"' : '(VAZIO)'}`)
})

// Procura por <w:lastRenderedPageBreak> entre o escopo e INVESTIMENTO
const lastBreaks = tudo.match(/<w:lastRenderedPageBreak/g) || []
console.log(`\n<w:lastRenderedPageBreak> no trecho: ${lastBreaks.length}`)

// Procura por w:br entre o escopo e INVESTIMENTO
const brs = tudo.match(/<w:br[\s/>]/g) || []
console.log(`<w:br> no trecho: ${brs.length}`)
