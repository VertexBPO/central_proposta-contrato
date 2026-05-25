import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import JSZip from 'jszip'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'))
  return m ? m[1].trim() : null
}
const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))

mkdirSync('/tmp/cpc-debug', { recursive: true })

async function listAndDownload(folder) {
  console.log(`\n=== ${folder} ===`)
  const { data: files, error } = await supabase.storage.from('templates').list(folder)
  if (error) { console.log('ERRO:', error); return [] }
  const sorted = (files || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  for (const f of sorted.slice(0, 5)) {
    console.log(`  ${f.name}  (${f.metadata?.size} bytes, updated ${f.updated_at})`)
  }
  if (sorted[0]) {
    const path = `${folder}/${sorted[0].name}`
    const { data: blob } = await supabase.storage.from('templates').download(path)
    const buf = Buffer.from(await blob.arrayBuffer())
    const outPath = `/tmp/cpc-debug/${folder}__${sorted[0].name}`
    writeFileSync(outPath, buf)
    console.log(`  → salvo em ${outPath}`)
    return { path, buf, outPath }
  }
  return null
}

async function analisarDocx(label, info) {
  if (!info) return
  console.log(`\n--- ANÁLISE ${label} ---`)
  const zip = await JSZip.loadAsync(info.buf)
  const docXml = await zip.file('word/document.xml').async('string')

  // Margens
  const sectMatch = docXml.match(/<w:sectPr[^>]*>([\s\S]*?)<\/w:sectPr>/)
  if (sectMatch) {
    const pgMar = sectMatch[1].match(/<w:pgMar[^/]+\/>/)
    console.log('  pgMar:', pgMar?.[0] || 'NÃO ENCONTRADA')
  } else {
    console.log('  sectPr: NÃO ENCONTRADA')
  }

  // Contagem de propriedades problemáticas
  const counts = {
    'w:keepNext': (docXml.match(/<w:keepNext[\s/>]/g) || []).length,
    'w:pageBreakBefore': (docXml.match(/<w:pageBreakBefore[\s/>]/g) || []).length,
    'w:br type=page': (docXml.match(/<w:br\s+w:type="page"/g) || []).length,
    'w:jc': (docXml.match(/<w:jc[\s/>]/g) || []).length,
    'w:numPr': (docXml.match(/<w:numPr[\s/>]/g) || []).length,
    'w:pStyle': (docXml.match(/<w:pStyle[\s/>]/g) || []).length,
    'w:p total': (docXml.match(/<w:p[\s>]/g) || []).length,
    'w:p self-closing': (docXml.match(/<w:p\/>/g) || []).length,
  }
  console.log('  Contagens:', counts)

  // Styles
  const stylesFile = zip.file('word/styles.xml')
  if (stylesFile) {
    const stylesXml = await stylesFile.async('string')
    const styleCounts = {
      'keepNext': (stylesXml.match(/<w:keepNext[\s/>]/g) || []).length,
      'pageBreakBefore': (stylesXml.match(/<w:pageBreakBefore[\s/>]/g) || []).length,
      'keepLines': (stylesXml.match(/<w:keepLines[\s/>]/g) || []).length,
    }
    console.log('  styles.xml propriedades:', styleCounts)
  }

  // Primeiros 3 parágrafos com texto pra ver estrutura real
  const paras = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []
  const comTexto = paras.filter(p => /<w:t[^>]*>[^<]+<\/w:t>/.test(p))
  console.log(`\n  Total parágrafos com texto: ${comTexto.length}`)
  console.log('  Primeiros 3 parágrafos com texto:')
  for (const p of comTexto.slice(0, 3)) {
    console.log('\n  ---')
    console.log('  ' + p.substring(0, 500))
  }
}

const prop = await listAndDownload('proposal-templates')
const escopo = await listAndDownload('scope-templates')

await analisarDocx('PROPOSTA', prop)
await analisarDocx('ESCOPO', escopo)
