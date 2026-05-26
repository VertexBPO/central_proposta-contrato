/**
 * Padroniza TODOS os placeholders {{...}} de um .docx do contrato:
 *  - tolera whitespace interno ({{ X }} vira {{X}})
 *  - aplica mapeamento de nomes (UPPERCASE → padronizado)
 *  - lida com placeholders quebrados entre <w:r> runs
 *  - cobre todas as ocorrências (não só a 1ª)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import JSZip from 'jszip'

const file = '/Users/sandroalves/Claude/Apps Projetos/Central de Propostas e Contratos/Toolbox_CPC/Modelos_contratos-propostas/Contrato Assessoria_Empresarial.docx'
const outFolder = join(dirname(file), '_corrigidos')
mkdirSync(outFolder, { recursive: true })

// MAPEAMENTO — chave em UPPERCASE/normalizado, valor é o nome final
const MAPEAMENTO = {
  'CONTRATANTE': 'nome_empresa',
  'CNPJ_CONTRATANTE': 'cnpj_contratante',
  'ENDEREÇO_CONTRATANTE': 'endereco_contratante',
  'CONTRATADA': 'nome_contratada',
  'CNPJ_CONTRATADA': 'cnpj_contratada',
  'ENDEREÇO_CONTRATADA': 'endereco_contratada',
  'DATA DA ASSINATURA': 'data_assinatura_extenso',
  'NÚMERO PROPOSTA': 'num_proposta',
}

// Normaliza: remove whitespace interno (incluindo nbsp), uppercase
function normalizar(s) {
  return s.replace(/\s+/g, '').toUpperCase()
}

const MAPA_NORM = {}
for (const [k, v] of Object.entries(MAPEAMENTO)) {
  MAPA_NORM[normalizar(k)] = v
}

const buf = readFileSync(file)
const zip = await JSZip.loadAsync(buf)
const docFile = zip.file('word/document.xml')
let xml = await docFile.async('string')

// Extrai <w:t> blocks com posições
function getBlocks(xml) {
  const tBlocks = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
  let pos = 0
  return tBlocks.map((m) => {
    const inicio = pos
    const fim = pos + m[1].length
    pos = fim
    return { match: m, texto: m[1], inicio, fim, xmlStart: m.index, xmlEnd: m.index + m[0].length }
  })
}

const subsRealizadas = []
let mudou = true
let iteracoes = 0

while (mudou && iteracoes < 50) {
  mudou = false
  iteracoes++

  const blocks = getBlocks(xml)
  const textoConcat = blocks.map((b) => b.texto).join('')

  // Acha próximo {{...}} no texto concatenado
  const re = /\{\{([^{}]+)\}\}/g
  let m
  while ((m = re.exec(textoConcat)) !== null) {
    const innerRaw = m[1]
    const norm = normalizar(innerRaw)
    const targetName = MAPA_NORM[norm]

    if (!targetName) continue // placeholder não mapeado (já padronizado ou desconhecido)
    if (innerRaw.trim() === targetName) continue // já está no nome certo

    const start = m.index
    const end = m.index + m[0].length
    const full = m[0]
    const target = `{{${targetName}}}`

    const primeiro = blocks.find((b) => b.inicio <= start && b.fim > start)
    const ultimo = blocks.find((b) => b.inicio < end && b.fim >= end)
    if (!primeiro || !ultimo) continue

    const antesTexto = primeiro.texto.slice(0, start - primeiro.inicio)
    const depoisTexto = ultimo.texto.slice(end - ultimo.inicio)
    const idxPrimeiro = blocks.indexOf(primeiro)
    const idxUltimo = blocks.indexOf(ultimo)

    if (idxPrimeiro === idxUltimo) {
      blocks[idxPrimeiro] = { ...primeiro, texto: antesTexto + target + depoisTexto }
    } else {
      blocks[idxPrimeiro] = { ...primeiro, texto: antesTexto + target }
      for (let i = idxPrimeiro + 1; i < idxUltimo; i++) {
        blocks[i] = { ...blocks[i], texto: '' }
      }
      blocks[idxUltimo] = { ...ultimo, texto: depoisTexto }
    }

    // Reconstrói o XML com novos textos
    const novoXml = []
    let cursor = 0
    for (const b of blocks) {
      novoXml.push(xml.slice(cursor, b.xmlStart))
      const tagAbertura = b.match[0].match(/^<w:t[^>]*>/)[0]
      novoXml.push(`${tagAbertura}${b.texto}</w:t>`)
      cursor = b.xmlEnd
    }
    novoXml.push(xml.slice(cursor))
    xml = novoXml.join('')

    subsRealizadas.push(`${full.trim()} → ${target}`)
    mudou = true
    break // recomeça do começo (XML mudou, blocks invalidados)
  }
}

zip.file('word/document.xml', xml)
const out = await zip.generateAsync({ type: 'nodebuffer' })
const outPath = join(outFolder, basename(file))
writeFileSync(outPath, out)

console.log(`Iterações: ${iteracoes}`)
console.log(`Substituições (${subsRealizadas.length}):`)
for (const s of subsRealizadas) console.log(`  ✓ ${s}`)

// Valida
const zipFinal = await JSZip.loadAsync(out)
const xmlFinal = await zipFinal.file('word/document.xml').async('string')
const textosFinais = [...xmlFinal.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join('')
const phsFinais = new Set()
for (const m of textosFinais.matchAll(/\{\{([^{}]+)\}\}/g)) phsFinais.add(m[1].trim())

console.log(`\n✅ Salvo em: ${outPath}`)
console.log(`\nPlaceholders finais (${phsFinais.size}):`)
;[...phsFinais].sort().forEach((p) => console.log(`  {{${p}}}`))
