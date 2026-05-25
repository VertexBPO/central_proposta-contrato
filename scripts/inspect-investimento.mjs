import { readFileSync } from 'node:fs'
import JSZip from 'jszip'

const buf = readFileSync('/tmp/cpc-debug/proposal-templates__1779487365233-Proposta_Assessoria-Empresarial.docx')
const zip = await JSZip.loadAsync(buf)
const xml = await zip.file('word/document.xml').async('string')

// Acha INVESTIMENTO no XML
const idx = xml.indexOf('INVESTIMENTO')
console.log('INVESTIMENTO encontrado em offset:', idx)

if (idx > 0) {
  // Volta 3000 chars antes pra ver contexto
  const inicio = Math.max(0, idx - 3000)
  console.log('\n========== CONTEXTO ANTES (3000 chars) ==========')
  console.log(xml.substring(inicio, idx + 100))
}

// Procura todos os section breaks
console.log('\n========== SECTION BREAKS ==========')
const sectPrs = [...xml.matchAll(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)]
console.log(`Total <w:sectPr>: ${sectPrs.length}`)
for (let i = 0; i < sectPrs.length; i++) {
  const start = sectPrs[i].index
  const txt = xml.substring(start, start + 400)
  console.log(`\n--- sectPr ${i} em offset ${start} ---`)
  console.log(txt)
}

// Procura w:lastRenderedPageBreak
const lastBreaks = (xml.match(/<w:lastRenderedPageBreak/g) || []).length
console.log(`\n<w:lastRenderedPageBreak>: ${lastBreaks}`)

// Procura w:br
const brs = (xml.match(/<w:br[\s/>]/g) || []).length
console.log(`<w:br>: ${brs}`)

// Procura w:p com sectPr DENTRO (cria nova seção que força page break)
const psComSect = [...xml.matchAll(/<w:p[^>]*>([\s\S]*?)<\/w:p>/g)]
  .filter(m => m[1].includes('<w:sectPr'))
console.log(`<w:p> com <w:sectPr> dentro: ${psComSect.length}`)

// Procura w:pageBreakBefore EM CADA STYLE no styles.xml referenciado
const stylesXml = await zip.file('word/styles.xml').async('string')
const usadosNoBody = [...xml.matchAll(/<w:pStyle\s+w:val="([^"]+)"/g)].map(m => m[1])
const unicos = [...new Set(usadosNoBody)]
console.log(`\n========== ESTILOS USADOS NO BODY (${unicos.length} únicos) ==========`)
for (const styleId of unicos) {
  const sm = stylesXml.match(new RegExp(`<w:style[^>]+w:styleId="${styleId}"[^>]*>([\\s\\S]*?)</w:style>`))
  if (sm) {
    const spacing = sm[1].match(/<w:spacing[^/]+\/>/)
    const keepNext = sm[1].includes('<w:keepNext')
    const pageBefore = sm[1].includes('<w:pageBreakBefore')
    const cantSplit = sm[1].includes('<w:cantSplit')
    if (keepNext || pageBefore || cantSplit || (spacing && /before="[2-9]\d{3}"/.test(spacing[0]))) {
      console.log(`  ⚠️  ${styleId}: spacing=${spacing?.[0]} keepNext=${keepNext} pageBefore=${pageBefore} cantSplit=${cantSplit}`)
    } else {
      console.log(`  ${styleId}: ${spacing?.[0] || '(default)'}`)
    }
  } else {
    console.log(`  ${styleId}: (não definido — usa default)`)
  }
}
