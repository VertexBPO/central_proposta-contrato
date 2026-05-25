import { readFileSync } from 'node:fs'
import JSZip from 'jszip'

const propBuf = readFileSync('/tmp/cpc-debug/proposal-templates__1779487365233-Proposta_Assessoria-Empresarial.docx')
const zip = await JSZip.loadAsync(propBuf)
const stylesXml = await zip.file('word/styles.xml').async('string')

// Acha definições de Ttulo1, Ttulo2, FirstParagraph
for (const styleId of ['Ttulo1', 'Ttulo2', 'FirstParagraph', 'Compact']) {
  const m = stylesXml.match(new RegExp(`<w:style[^>]+w:styleId="${styleId}"[^>]*>([\\s\\S]*?)</w:style>`))
  console.log(`\n=== ${styleId} ===`)
  if (m) {
    // Extrai propriedades-chave
    const props = m[1]
    const spacing = props.match(/<w:spacing[^/]+\/>/)
    const jc = props.match(/<w:jc[^/]+\/>/)
    const keepNext = props.includes('<w:keepNext')
    const pageBreakBefore = props.includes('<w:pageBreakBefore')
    const keepLines = props.includes('<w:keepLines')
    const ind = props.match(/<w:ind[^/]+\/>/)
    console.log('  spacing:', spacing?.[0] || '(default)')
    console.log('  jc:', jc?.[0] || '(default)')
    console.log('  ind:', ind?.[0] || '(default)')
    console.log('  keepNext:', keepNext)
    console.log('  pageBreakBefore:', pageBreakBefore)
    console.log('  keepLines:', keepLines)
  } else {
    console.log('  NÃO DEFINIDO no styles.xml da proposta')
  }
}

// Document defaults
const docDefMatch = stylesXml.match(/<w:docDefaults>([\s\S]*?)<\/w:docDefaults>/)
if (docDefMatch) {
  console.log('\n=== docDefaults ===')
  const jc = docDefMatch[1].match(/<w:jc[^/]+\/>/)
  console.log('  jc:', jc?.[0] || '(NÃO DEFINIDA)')
}

// Header XML — ver tamanho/posição do logo
const headerFile = Object.keys(zip.files).find(n => /word\/header\d+\.xml/.test(n))
if (headerFile) {
  console.log(`\n=== ${headerFile} ===`)
  const headerXml = await zip.file(headerFile).async('string')
  // Pega anchors/inlines com extent (tamanho)
  const extents = [...headerXml.matchAll(/<wp:extent\s+cx="(\d+)"\s+cy="(\d+)"/g)]
  for (const e of extents) {
    const cmW = (parseInt(e[1]) / 360000).toFixed(2)
    const cmH = (parseInt(e[2]) / 360000).toFixed(2)
    console.log(`  imagem: ${cmW}cm x ${cmH}cm`)
  }
  const positions = [...headerXml.matchAll(/<wp:positionV[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)<\/wp:posOffset>/g)]
  for (const p of positions) {
    const cm = (parseInt(p[1]) / 360000).toFixed(2)
    console.log(`  posição vertical: ${cm}cm`)
  }
}
