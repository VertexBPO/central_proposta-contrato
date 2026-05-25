import { readFileSync } from 'node:fs'
import JSZip from 'jszip'

const buf = readFileSync('/tmp/cpc-debug/proposal-templates__1779487365233-Proposta_Assessoria-Empresarial.docx')
const zip = await JSZip.loadAsync(buf)
const xml = await zip.file('word/document.xml').async('string')

// Acha TODAS as wp:anchor (imagens flutuantes) com behindDoc info
const anchors = [...xml.matchAll(/<wp:anchor\s+([^>]+)>([\s\S]*?)<\/wp:anchor>/g)]
console.log(`\n========== ${anchors.length} <wp:anchor> NO TEMPLATE PROPOSTA ==========\n`)

for (let i = 0; i < anchors.length; i++) {
  const attrs = anchors[i][1]
  const content = anchors[i][2]

  const behindDoc = attrs.match(/behindDoc="(\d+)"/)
  const allowOverlap = attrs.match(/allowOverlap="(\d+)"/)
  const layoutInCell = attrs.match(/layoutInCell="(\d+)"/)

  const extent = content.match(/<wp:extent\s+cx="(\d+)"\s+cy="(\d+)"/)
  const cmW = extent ? (parseInt(extent[1]) / 360000).toFixed(2) : '?'
  const cmH = extent ? (parseInt(extent[2]) / 360000).toFixed(2) : '?'

  const posV = content.match(/<wp:positionV[^>]*>([\s\S]*?)<\/wp:positionV>/)
  const posH = content.match(/<wp:positionH[^>]*>([\s\S]*?)<\/wp:positionH>/)
  const posVOff = posV?.[1].match(/<wp:posOffset>(-?\d+)/)
  const posHOff = posH?.[1].match(/<wp:posOffset>(-?\d+)/)
  const cmVOff = posVOff ? (parseInt(posVOff[1]) / 360000).toFixed(2) : '?'
  const cmHOff = posHOff ? (parseInt(posHOff[1]) / 360000).toFixed(2) : '?'

  const wrap = content.match(/<wp:wrap(\w+)/)
  const rId = content.match(/r:embed="([^"]+)"/)
  const alpha = content.match(/<a:alphaModFix\s+amt="(\d+)"/)

  console.log(`--- anchor ${i} ---`)
  console.log(`  size: ${cmW}cm × ${cmH}cm`)
  console.log(`  pos: H=${cmHOff}cm V=${cmVOff}cm`)
  console.log(`  behindDoc: ${behindDoc?.[1] || '?'}`)
  console.log(`  allowOverlap: ${allowOverlap?.[1] || '?'}`)
  console.log(`  layoutInCell: ${layoutInCell?.[1] || '?'}`)
  console.log(`  wrap: ${wrap?.[1] || '?'}`)
  console.log(`  rId: ${rId?.[1]}`)
  console.log(`  alphaModFix: ${alpha ? alpha[1] + ' (= ' + (parseInt(alpha[1]) / 1000) + '%)' : 'nenhum'}`)
  console.log()
}
