import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export const runtime = 'nodejs'

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface ProcessadoBloco {
  html: string
  texto: string
}

/**
 * Lê numbering.xml e devolve um map numId -> ilvl -> 'bullet' | 'decimal' | ...
 */
function lerNumberingXml(xml: string): Map<string, Map<string, string>> {
  const map = new Map<string, Map<string, string>>()
  // Mapeia abstractNumId -> ilvl -> numFmt
  const abstractMap = new Map<string, Map<string, string>>()
  const abstractMatches = xml.match(/<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"[\s\S]*?<\/w:abstractNum>/g) ?? []
  for (const abs of abstractMatches) {
    const idMatch = abs.match(/w:abstractNumId="(\d+)"/)
    const abstractId = idMatch?.[1]
    if (!abstractId) continue
    const lvlMatches = abs.match(/<w:lvl\b[^>]*w:ilvl="(\d+)"[\s\S]*?<\/w:lvl>/g) ?? []
    const lvlMap = new Map<string, string>()
    for (const lvl of lvlMatches) {
      const ilvlMatch = lvl.match(/w:ilvl="(\d+)"/)
      const fmtMatch = lvl.match(/<w:numFmt[^>]*w:val="([^"]+)"/)
      const ilvl = ilvlMatch?.[1]
      const fmt = fmtMatch?.[1] ?? 'bullet'
      if (ilvl) lvlMap.set(ilvl, fmt)
    }
    abstractMap.set(abstractId, lvlMap)
  }

  // numId -> abstractNumId
  const numMatches = xml.match(/<w:num\b[^>]*w:numId="(\d+)"[\s\S]*?<\/w:num>/g) ?? []
  for (const num of numMatches) {
    const numIdMatch = num.match(/w:numId="(\d+)"/)
    const absRefMatch = num.match(/<w:abstractNumId[^>]*w:val="(\d+)"/)
    const numId = numIdMatch?.[1]
    const absRef = absRefMatch?.[1]
    if (numId && absRef) {
      const lvlMap = abstractMap.get(absRef)
      if (lvlMap) map.set(numId, lvlMap)
    }
  }
  return map
}

async function docxToHtml(buffer: Buffer): Promise<ProcessadoBloco> {
  const zip = await JSZip.loadAsync(buffer)
  const documento = zip.file('word/document.xml')
  if (!documento) throw new Error('word/document.xml não encontrado')

  const xml = await documento.async('text')

  // Numbering — opcional
  let numberingMap: Map<string, Map<string, string>> = new Map()
  const numberingFile = zip.file('word/numbering.xml')
  if (numberingFile) {
    const numXml = await numberingFile.async('text')
    numberingMap = lerNumberingXml(numXml)
  }

  const paragrafos = xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) ?? []

  const blocosHtml: string[] = []
  const blocosTexto: string[] = []
  let listaAberta: 'ul' | 'ol' | null = null
  const fecharLista = () => {
    if (listaAberta) {
      blocosHtml.push(`</${listaAberta}>`)
      listaAberta = null
    }
  }

  for (const pXml of paragrafos) {
    const styleMatch = pXml.match(/<w:pStyle[^>]*w:val="([^"]+)"/)
    const styleId = styleMatch?.[1]?.toLowerCase() ?? ''

    // numPr
    const numIdMatch = pXml.match(/<w:numPr\b[\s\S]*?<w:numId[^>]*w:val="(\d+)"/)
    const ilvlMatch = pXml.match(/<w:numPr\b[\s\S]*?<w:ilvl[^>]*w:val="(\d+)"/)
    const numId = numIdMatch?.[1]
    const ilvl = ilvlMatch?.[1] ?? '0'
    const hasNumbering = !!numId

    // Extrai runs com formatação
    const runs = pXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) ?? []
    let conteudoHtml = ''
    let conteudoTexto = ''

    for (const rXml of runs) {
      const isBold = /<w:b[\/ >]/.test(rXml) || /<w:b\s/.test(rXml)
      const isItalic = /<w:i[\/ >]/.test(rXml) || /<w:i\s/.test(rXml)
      const isUnderline = /<w:u\b/.test(rXml)

      if (/<w:tab\b/.test(rXml)) {
        conteudoHtml += '    '
        conteudoTexto += '\t'
      }
      if (/<w:br\b/.test(rXml)) {
        conteudoHtml += '<br>'
        conteudoTexto += '\n'
      }

      const textosMatches = rXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? []
      const texto = textosMatches
        .map((t) => {
          const m = t.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/)
          return m?.[1] ?? ''
        })
        .join('')
      let html = escaparHtml(decodeEntities(texto))
      if (isBold) html = `<strong>${html}</strong>`
      if (isItalic) html = `<em>${html}</em>`
      if (isUnderline) html = `<u>${html}</u>`
      conteudoHtml += html
      conteudoTexto += texto
    }

    const textoLimpo = conteudoTexto.trim()
    if (!textoLimpo && !conteudoHtml.trim()) continue
    blocosTexto.push(textoLimpo)

    // 1) Heading explícito do Word (Heading1 / Heading2 / Title)
    if (styleId.startsWith('heading') || styleId === 'title') {
      fecharLista()
      const m = styleId.match(/(\d)/)
      const level = m ? Math.min(parseInt(m[1]), 3) : 1
      blocosHtml.push(`<h${level}>${conteudoHtml}</h${level}>`)
      continue
    }

    // 2) Lista — consulta o numbering.xml pra saber se é bullet ou numerada
    if (hasNumbering && numId) {
      const lvlMap = numberingMap.get(numId)
      const numFmt = lvlMap?.get(ilvl) ?? 'bullet'
      const tipo: 'ul' | 'ol' = numFmt === 'bullet' ? 'ul' : 'ol'
      if (listaAberta !== tipo) {
        fecharLista()
        blocosHtml.push(`<${tipo}>`)
        listaAberta = tipo
      }
      blocosHtml.push(`<li>${conteudoHtml}</li>`)
      continue
    }

    fecharLista()
    blocosHtml.push(`<p>${conteudoHtml}</p>`)
  }
  fecharLista()

  return { html: blocosHtml.join(''), texto: blocosTexto.join('\n') }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ erro: 'Envie um arquivo no campo "file".' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ erro: 'Apenas arquivos .docx.' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const { html, texto } = await docxToHtml(buffer)
    return NextResponse.json({ html, texto })
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : 'Falha ao processar arquivo.' },
      { status: 500 }
    )
  }
}
