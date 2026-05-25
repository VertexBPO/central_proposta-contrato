import { readFileSync, writeFileSync } from 'node:fs'
import JSZip from 'jszip'

const escopoBuf = readFileSync('/tmp/cpc-debug/scope-templates__1779483639383-escopo_Arquitetura-Interna_.docx')
const zip = await JSZip.loadAsync(escopoBuf)
const xml = await zip.file('word/document.xml').async('string')
const numXml = zip.file('word/numbering.xml') ? await zip.file('word/numbering.xml').async('string') : ''

function mapNumIdParaFormato(numberingXml) {
  if (!numberingXml) return {}
  const numToAbstract = {}
  const numRegex = /<w:num\s+w:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g
  let m
  while ((m = numRegex.exec(numberingXml)) !== null) {
    const absIdMatch = m[2].match(/<w:abstractNumId\s+w:val="(\d+)"/)
    if (absIdMatch) numToAbstract[m[1]] = absIdMatch[1]
  }
  const abstractToLevels = {}
  const absRegex = /<w:abstractNum\s+w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g
  while ((m = absRegex.exec(numberingXml)) !== null) {
    const abstractId = m[1]
    abstractToLevels[abstractId] = {}
    const lvlRegex = /<w:lvl[^>]*w:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvl>/g
    let lm
    while ((lm = lvlRegex.exec(m[2])) !== null) {
      const ilvl = parseInt(lm[1], 10)
      const fmtMatch = lm[2].match(/<w:numFmt\s+w:val="([^"]+)"/)
      if (fmtMatch) abstractToLevels[abstractId][ilvl] = fmtMatch[1]
    }
  }
  const result = {}
  for (const [numId, absId] of Object.entries(numToAbstract)) {
    result[numId] = abstractToLevels[absId] || {}
  }
  return result
}

function converterListasParaTexto(bodyXml, numberingXml) {
  const numFmts = mapNumIdParaFormato(numberingXml)
  const counters = {}
  const bullets = ['• ', '◦ ', '▪ ']
  return bodyXml.replace(
    /<w:p[\s>][\s\S]*?<\/w:p>/g,
    (paragraph) => {
      const numPrMatch = paragraph.match(/<w:numPr>([\s\S]*?)<\/w:numPr>/)
      let prefix = ''
      let leftIndent = 0
      let isListItem = false
      if (numPrMatch) {
        isListItem = true
        const numIdMatch = numPrMatch[1].match(/<w:numId\s+w:val="(\d+)"/)
        const ilvlMatch = numPrMatch[1].match(/<w:ilvl\s+w:val="(\d+)"/)
        if (numIdMatch) {
          const numId = numIdMatch[1]
          const ilvl = ilvlMatch ? parseInt(ilvlMatch[1], 10) : 0
          const fmt = numFmts[numId]?.[ilvl] || 'bullet'
          if (fmt === 'bullet') {
            prefix = bullets[Math.min(ilvl, bullets.length - 1)] || '• '
          } else {
            counters[numId] = counters[numId] || {}
            counters[numId][ilvl] = (counters[numId][ilvl] || 0) + 1
            prefix = `${counters[numId][ilvl]}. `
          }
          leftIndent = 360 * (ilvl + 1)
        }
      } else {
        for (const k of Object.keys(counters)) counters[k] = {}
      }
      let cleaned = paragraph
        .replace(/<w:numPr>[\s\S]*?<\/w:numPr>/g, '')
        .replace(/<w:keepNext\s*\/>/g, '')
        .replace(/<w:pageBreakBefore\s*\/>/g, '')
      const indentProp = leftIndent > 0 ? `<w:ind w:left="${leftIndent}"/>` : ''
      const formatProps = `<w:jc w:val="both"/>${indentProp}`
      if (cleaned.includes('<w:pPr>')) {
        cleaned = cleaned.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/, (_full, inner) => {
          let cleanInner = inner.replace(/<w:jc[^/]*\/>/g, '').replace(/<w:ind[^/]*\/>/g, '')
          const rPrMatch = cleanInner.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
          const rPr = rPrMatch ? rPrMatch[0] : ''
          if (rPr) cleanInner = cleanInner.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, '')
          return `<w:pPr>${cleanInner}${formatProps}${rPr}</w:pPr>`
        })
      } else {
        cleaned = cleaned.replace(/(<w:p[^>]*>)/, `$1<w:pPr>${formatProps}</w:pPr>`)
      }
      if (isListItem && prefix) {
        let prefixed = false
        cleaned = cleaned.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/, (full, attrs, text) => {
          if (prefixed) return full
          prefixed = true
          const finalAttrs = attrs.includes('xml:space') ? attrs : ' xml:space="preserve"'
          return `<w:t${finalAttrs}>${prefix}${text}</w:t>`
        })
        if (!prefixed) {
          cleaned = cleaned.replace(/<\/w:p>$/, `<w:r><w:t xml:space="preserve">${prefix}</w:t></w:r></w:p>`)
        }
      }
      return cleaned
    }
  )
}

function removerParagrafosVazios(bodyXml) {
  return bodyXml.replace(/<w:p[\s>][\s\S]*?<\/w:p>/g, (paragraph) => {
    if (paragraph.includes('<w:drawing') || paragraph.includes('<w:pict')) return paragraph
    if (/<w:t[^>]*>[^<]+<\/w:t>/.test(paragraph)) return paragraph
    return ''
  })
}

const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/)
let body = bodyMatch[1]
body = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, '')
body = body.replace(/<w:br\s+w:type="page"\s*\/>/g, '')
body = body.replace(/<w:pageBreakBefore\s*\/>/g, '')
body = converterListasParaTexto(body, numXml)
const antesRemover = (body.match(/<w:p[\s>]/g) || []).length
body = removerParagrafosVazios(body)
const depoisRemover = (body.match(/<w:p[\s>]/g) || []).length

writeFileSync('/tmp/cpc-debug/escopo-transformado.xml', body)

console.log('Parágrafos: antes', antesRemover, '→ depois', depoisRemover, `(removidos: ${antesRemover - depoisRemover})`)
console.log('w:jc both:', (body.match(/<w:jc\s+w:val="both"/g) || []).length)

// Verificar ordem: w:rPr deve ser depois de w:jc
const primeiroP = body.match(/<w:p[\s>][\s\S]*?<\/w:p>/)
console.log('\nPrimeiro parágrafo (verificando ordem jc → rPr):')
const pPrMatch = primeiroP[0].match(/<w:pPr>[\s\S]*?<\/w:pPr>/)
console.log(pPrMatch[0])

const jcIdx = pPrMatch[0].indexOf('<w:jc')
const rPrIdx = pPrMatch[0].indexOf('<w:rPr>')
console.log(`\njc index: ${jcIdx}, rPr index: ${rPrIdx}`)
console.log(`✓ Ordem correta (jc antes de rPr): ${jcIdx < rPrIdx || rPrIdx === -1}`)
