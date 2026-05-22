import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export const runtime = 'nodejs'

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

/**
 * Converte word/document.xml em HTML simples (h1/h2/h3/p/ul/ol/li/strong/em).
 * Não tenta replicar 100% do Word — só o suficiente pra editor rico no app.
 */
async function docxToHtml(buffer: Buffer): Promise<{ html: string; texto: string }> {
  const zip = await JSZip.loadAsync(buffer)
  const documento = zip.file('word/document.xml')
  if (!documento) throw new Error('word/document.xml não encontrado')

  const xml = await documento.async('text')

  // Quebra em <w:p>...</w:p> (cada um vira um parágrafo).
  const paragrafosMatches = xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) ?? []

  const blocos: string[] = []
  const blocosTexto: string[] = []
  let listaAberta: 'ul' | 'ol' | null = null
  const fecharLista = () => {
    if (listaAberta) {
      blocos.push(`</${listaAberta}>`)
      listaAberta = null
    }
  }

  for (const pXml of paragrafosMatches) {
    // Verifica estilo do parágrafo
    const styleMatch = pXml.match(/<w:pStyle[^>]*w:val="([^"]+)"/)
    const numPrMatch = pXml.match(/<w:numPr\b/)
    const styleId = styleMatch?.[1]?.toLowerCase() ?? ''

    // Extrai runs (<w:r>) e seus textos
    const runs = pXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) ?? []
    let conteudoHtml = ''
    let conteudoTexto = ''

    for (const rXml of runs) {
      const isBold = /<w:b\b/.test(rXml) || /<w:b\/>/.test(rXml)
      const isItalic = /<w:i\b/.test(rXml) || /<w:i\/>/.test(rXml)
      const isUnderline = /<w:u\b/.test(rXml)
      // texto
      const textMatches = rXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? []
      const texto = textMatches
        .map((t) => {
          const m = t.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/)
          return m?.[1] ?? ''
        })
        .join('')
      if (/<w:tab\b/.test(rXml)) {
        conteudoHtml += '    '
        conteudoTexto += '\t'
      }
      if (/<w:br\b/.test(rXml)) {
        conteudoHtml += '<br>'
        conteudoTexto += '\n'
      }
      let html = decodeEntities(texto)
      // Escapa < > pra HTML mas mantém os placeholders {{}}
      html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      if (isBold) html = `<strong>${html}</strong>`
      if (isItalic) html = `<em>${html}</em>`
      if (isUnderline) html = `<u>${html}</u>`
      conteudoHtml += html
      conteudoTexto += texto
    }

    const textoLimpo = conteudoTexto.trim()
    if (!textoLimpo && !conteudoHtml.trim()) {
      // parágrafo vazio
      continue
    }

    blocosTexto.push(textoLimpo)

    // Heading detection
    if (styleId.startsWith('heading') || styleId.startsWith('titulo')) {
      fecharLista()
      const m = styleId.match(/(\d)/)
      const level = m ? Math.min(parseInt(m[1]), 3) : 2
      blocos.push(`<h${level}>${conteudoHtml}</h${level}>`)
      continue
    }

    // Lista detection (parágrafo com numPr)
    if (numPrMatch) {
      // Heurística: numId presente = ordered, senão = bullet
      const isOrdered = /<w:numId[^>]*w:val="[1-9]/.test(pXml) && /<w:ilvl/.test(pXml)
      const wanted = isOrdered ? 'ol' : 'ul'
      if (listaAberta !== wanted) {
        fecharLista()
        blocos.push(`<${wanted}>`)
        listaAberta = wanted
      }
      blocos.push(`<li>${conteudoHtml}</li>`)
      continue
    }

    fecharLista()
    blocos.push(`<p>${conteudoHtml}</p>`)
  }
  fecharLista()

  return {
    html: blocos.join(''),
    texto: blocosTexto.join('\n'),
  }
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
void W
