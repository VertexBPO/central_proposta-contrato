/**
 * Gera PDF a partir de um template .docx + valores de placeholders.
 * 1. Carrega .docx do Supabase Storage
 * 2. Usa docxtemplater pra substituir {{placeholders}}
 * 3. Converte .docx final pra PDF via CloudConvert
 * 4. Devolve buffer PDF
 */
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import JSZip from 'jszip'
import { createAdminClient } from '@/lib/supabase/admin'
import { docxParaPdf } from '@/lib/cloudconvert/client'

/**
 * Lê o .docx do escopo e extrai o conteúdo XML do <w:body>, convertendo listas
 * em bullets de texto ("• ", "◦ ", "1. ") pra evitar conflitos de numId com a proposta.
 */
export async function extrairXmlCorpoEscopo(storagePath: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('templates').download(storagePath)
  if (error || !data) throw new Error(`Falha ao carregar escopo: ${error?.message}`)

  const buf = Buffer.from(await data.arrayBuffer())
  const zip = await JSZip.loadAsync(buf)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('Escopo .docx inválido (sem document.xml)')
  const xml = await docFile.async('string')

  const numberingFile = zip.file('word/numbering.xml')
  const numberingXml = numberingFile ? await numberingFile.async('string') : ''

  const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/)
  if (!bodyMatch) throw new Error('Escopo .docx sem <w:body>')
  let body = bodyMatch[1]

  body = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, '')
  body = body.replace(/<w:br\s+w:type="page"\s*\/>/g, '')
  body = body.replace(/<w:pageBreakBefore\s*\/>/g, '')
  body = converterListasParaTexto(body, numberingXml)
  body = removerParagrafosVazios(body)
  return body.trim()
}

/**
 * Remove <w:p> que não contém nenhum <w:t> com texto. Word produz muitos parágrafos
 * vazios (rsid placeholders, espaçadores) que viram espaço em branco no PDF.
 */
function removerParagrafosVazios(bodyXml: string): string {
  return bodyXml.replace(/<w:p[\s>][\s\S]*?<\/w:p>/g, (paragraph) => {
    // Mantém parágrafos com imagem/drawing (são visuais)
    if (paragraph.includes('<w:drawing') || paragraph.includes('<w:pict')) return paragraph
    // Mantém parágrafos com texto (qualquer <w:t> com conteúdo não-vazio)
    if (/<w:t[^>]*>[^<]+<\/w:t>/.test(paragraph)) return paragraph
    return ''
  })
}

/**
 * Mapeia numId → ilvl → formato ("bullet" | "decimal" | etc) lendo word/numbering.xml.
 */
function mapNumIdParaFormato(numberingXml: string): Record<string, Record<number, string>> {
  if (!numberingXml) return {}

  const numToAbstract: Record<string, string> = {}
  const numRegex = /<w:num\s+w:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g
  let m: RegExpExecArray | null
  while ((m = numRegex.exec(numberingXml)) !== null) {
    const absIdMatch = m[2].match(/<w:abstractNumId\s+w:val="(\d+)"/)
    if (absIdMatch) numToAbstract[m[1]] = absIdMatch[1]
  }

  const abstractToLevels: Record<string, Record<number, string>> = {}
  const absRegex = /<w:abstractNum\s+w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g
  while ((m = absRegex.exec(numberingXml)) !== null) {
    const abstractId = m[1]
    const content = m[2]
    abstractToLevels[abstractId] = {}
    const lvlRegex = /<w:lvl[^>]*w:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvl>/g
    let lm: RegExpExecArray | null
    while ((lm = lvlRegex.exec(content)) !== null) {
      const ilvl = parseInt(lm[1], 10)
      const fmtMatch = lm[2].match(/<w:numFmt\s+w:val="([^"]+)"/)
      if (fmtMatch) abstractToLevels[abstractId][ilvl] = fmtMatch[1]
    }
  }

  const result: Record<string, Record<number, string>> = {}
  for (const [numId, absId] of Object.entries(numToAbstract)) {
    result[numId] = abstractToLevels[absId] || {}
  }
  return result
}

/**
 * Corretor de formatação do escopo. Roda em todo parágrafo:
 *  1. Força <w:jc w:val="both"/> (justificado) em todo parágrafo
 *  2. Converte listas em texto: remove <w:numPr>, adiciona prefixo "• "/"1. "
 *  3. Adiciona indentação (<w:ind w:left="...">) pra dar hierarquia visual
 *  4. Limpa <w:keepNext/> e <w:pageBreakBefore/> que geram espaços mortos
 */
function converterListasParaTexto(bodyXml: string, numberingXml: string): string {
  const numFmts = mapNumIdParaFormato(numberingXml)
  const counters: Record<string, Record<number, number>> = {}
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

      // Remove <w:numPr>, <w:keepNext>, <w:pageBreakBefore>
      let cleaned = paragraph
        .replace(/<w:numPr>[\s\S]*?<\/w:numPr>/g, '')
        .replace(/<w:keepNext\s*\/>/g, '')
        .replace(/<w:pageBreakBefore\s*\/>/g, '')

      // Força justificado + indent (se for lista). Remove jc e ind antigos, injeta os novos.
      const indentProp = leftIndent > 0 ? `<w:ind w:left="${leftIndent}"/>` : ''
      const formatProps = `<w:jc w:val="both"/>${indentProp}`

      if (cleaned.includes('<w:pPr>')) {
        cleaned = cleaned.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/, (_full, inner: string) => {
          // Schema OOXML: <w:rPr> deve ser sempre o ÚLTIMO elemento em <w:pPr>.
          // Senão LibreOffice ignora propriedades posteriores (ex.: jc).
          let cleanInner = inner
            .replace(/<w:jc[^/]*\/>/g, '')
            .replace(/<w:ind[^/]*\/>/g, '')
          const rPrMatch = cleanInner.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
          const rPr = rPrMatch ? rPrMatch[0] : ''
          if (rPr) cleanInner = cleanInner.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, '')
          return `<w:pPr>${cleanInner}${formatProps}${rPr}</w:pPr>`
        })
      } else {
        cleaned = cleaned.replace(/(<w:p[^>]*>)/, `$1<w:pPr>${formatProps}</w:pPr>`)
      }

      // Adiciona prefix do bullet
      if (isListItem && prefix) {
        let prefixed = false
        cleaned = cleaned.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/, (full, attrs: string, text: string) => {
          if (prefixed) return full
          prefixed = true
          const finalAttrs = attrs.includes('xml:space') ? attrs : ' xml:space="preserve"'
          return `<w:t${finalAttrs}>${prefix}${text}</w:t>`
        })
        if (!prefixed) {
          cleaned = cleaned.replace(
            /<\/w:p>$/,
            `<w:r><w:t xml:space="preserve">${prefix}</w:t></w:r></w:p>`,
          )
        }
      }

      return cleaned
    },
  )
}

/**
 * Escapa texto plano e converte em OOXML válido: 1 parágrafo por linha.
 * Usado quando o escopo é "Personalizado" (texto livre).
 */
export function textoParaXmlParagrafos(texto: string): string {
  const escapar = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return texto
    .split(/\r?\n/)
    .map((linha) => `<w:p><w:r><w:t xml:space="preserve">${escapar(linha)}</w:t></w:r></w:p>`)
    .join('')
}

export interface PlaceholderValues {
  [key: string]: string | number
}

/**
 * Garante que a margem superior do .docx tem pelo menos `minTwips` (1cm = 567 twips).
 * Evita que o texto pise no logo do cabeçalho.
 */
export async function garantirMargemSuperior(docxBuffer: Buffer, minTwips: number): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer)
  const docFile = zip.file('word/document.xml')
  if (!docFile) return docxBuffer
  let xml = await docFile.async('string')

  xml = xml.replace(/<w:pgMar\s([^/>]+)\/>/g, (full, attrs: string) => {
    const topMatch = attrs.match(/w:top="(\d+)"/)
    const currentTop = topMatch ? parseInt(topMatch[1], 10) : 0
    if (currentTop >= minTwips) return full
    const newAttrs = topMatch
      ? attrs.replace(/w:top="\d+"/, `w:top="${minTwips}"`)
      : `w:top="${minTwips}" ${attrs}`
    return `<w:pgMar ${newAttrs}/>`
  })

  zip.file('word/document.xml', xml)
  return await zip.generateAsync({ type: 'nodebuffer' })
}

/**
 * Neutraliza propriedades de quebra de página herdadas via estilos do .docx.
 *
 * Word/LibreOffice por padrão põem keepNext + pageBreakBefore em estilos de Heading,
 * o que causa espaços mortos quando o conteúdo é injetado dinamicamente (escopo).
 * Roda em word/styles.xml após preencher o template e antes de mandar pro CloudConvert.
 */
export async function neutralizarPageBreaksDeEstilos(docxBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer)
  const stylesFile = zip.file('word/styles.xml')
  if (!stylesFile) return docxBuffer

  let styles = await stylesFile.async('string')
  styles = styles
    .replace(/<w:keepNext\s*\/>/g, '')
    .replace(/<w:keepNext\s+w:val="[^"]*"\s*\/>/g, '')
    .replace(/<w:keepLines\s*\/>/g, '')
    .replace(/<w:keepLines\s+w:val="[^"]*"\s*\/>/g, '')
    .replace(/<w:pageBreakBefore\s*\/>/g, '')
    .replace(/<w:pageBreakBefore\s+w:val="[^"]*"\s*\/>/g, '')

  zip.file('word/styles.xml', styles)
  return await zip.generateAsync({ type: 'nodebuffer' })
}

/**
 * Carrega arquivo .docx do storage, preenche placeholders, retorna buffer.
 */
export async function preencherDocx(
  storagePath: string,
  valores: PlaceholderValues
): Promise<Buffer> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('templates').download(storagePath)
  if (error || !data) throw new Error(`Falha ao carregar template: ${error?.message}`)

  const buf = Buffer.from(await data.arrayBuffer())
  const zip = new PizZip(buf)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '', // placeholders ausentes viram vazio
  })

  // Converte valores não-string em string
  const valoresStr: Record<string, string> = {}
  for (const [k, v] of Object.entries(valores)) {
    valoresStr[k] = String(v ?? '')
  }

  doc.render(valoresStr)

  const out = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  return out
}

/**
 * Carrega template, preenche e converte para PDF.
 */
export async function gerarPdfDoTemplate(
  storagePath: string,
  valores: PlaceholderValues,
  nomeArquivo = 'documento.docx'
): Promise<Buffer> {
  const docxPreenchido = await preencherDocx(storagePath, valores)
  return await docxParaPdf(docxPreenchido, nomeArquivo)
}
