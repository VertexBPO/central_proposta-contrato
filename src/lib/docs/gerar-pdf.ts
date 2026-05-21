import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'

interface BuildOptions {
  titulo: string
  numero: string
  conteudo: string // texto longo (escopo final ou corpo do contrato)
  cliente: {
    razao_social: string
    cnpj: string
    endereco?: string
  }
  contratante: {
    razao_social: string
    cnpj: string
  }
  resumoComercial?: Array<{ label: string; valor: string }>
  dataLocal: string // ex: "Vila Velha, 21 de maio de 2026"
}

const COR_PRIMARIA = rgb(13 / 255, 27 / 255, 62 / 255)
const COR_SECUNDARIA = rgb(138 / 255, 154 / 255, 181 / 255)
const COR_TEXTO = rgb(13 / 255, 27 / 255, 62 / 255)

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 50
const CONTENT_W = PAGE_W - MARGIN * 2

interface RenderState {
  doc: PDFDocument
  font: PDFFont
  bold: PDFFont
  page: PDFPage
  cursorY: number
}

function novaPagina(state: RenderState) {
  state.page = state.doc.addPage([PAGE_W, PAGE_H])
  state.cursorY = PAGE_H - MARGIN
}

function quebraLinhas(texto: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const paragrafos = texto.split('\n')
  const linhas: string[] = []
  for (const par of paragrafos) {
    if (!par.trim()) {
      linhas.push('')
      continue
    }
    const palavras = par.split(/\s+/)
    let linha = ''
    for (const palavra of palavras) {
      const candidato = linha ? `${linha} ${palavra}` : palavra
      const largura = font.widthOfTextAtSize(candidato, fontSize)
      if (largura > maxWidth && linha) {
        linhas.push(linha)
        linha = palavra
      } else {
        linha = candidato
      }
    }
    if (linha) linhas.push(linha)
  }
  return linhas
}

function escreverTexto(
  state: RenderState,
  texto: string,
  opts: { size?: number; bold?: boolean; cor?: ReturnType<typeof rgb>; gap?: number } = {}
) {
  const { size = 10, bold = false, cor = COR_TEXTO, gap = 4 } = opts
  const font = bold ? state.bold : state.font
  const lineHeight = size * 1.4
  const linhas = quebraLinhas(texto, font, size, CONTENT_W)
  for (const linha of linhas) {
    if (state.cursorY - lineHeight < MARGIN) novaPagina(state)
    state.page.drawText(linha, {
      x: MARGIN,
      y: state.cursorY - size,
      size,
      font,
      color: cor,
    })
    state.cursorY -= lineHeight
  }
  state.cursorY -= gap
}

export async function gerarPdf(opts: BuildOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([PAGE_W, PAGE_H])

  const state: RenderState = { doc, font, bold, page, cursorY: PAGE_H - MARGIN }

  // Header faixa azul Vertex
  page.drawRectangle({ x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: COR_PRIMARIA })
  page.drawText('VERTEX', {
    x: MARGIN,
    y: PAGE_H - 45,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  })
  page.drawText('BPO e Assessoria Empresarial', {
    x: MARGIN,
    y: PAGE_H - 62,
    size: 9,
    font,
    color: rgb(0.8, 0.85, 0.95),
  })
  page.drawText(`Nº ${opts.numero}`, {
    x: PAGE_W - MARGIN - 100,
    y: PAGE_H - 45,
    size: 11,
    font: bold,
    color: rgb(1, 1, 1),
  })

  state.cursorY = PAGE_H - 110

  // Título
  escreverTexto(state, opts.titulo, { size: 18, bold: true, gap: 16 })

  // Bloco partes
  escreverTexto(state, 'CONTRATADA', { size: 9, bold: true, cor: COR_SECUNDARIA, gap: 2 })
  escreverTexto(state, opts.contratante.razao_social, { size: 11, bold: true })
  escreverTexto(state, `CNPJ ${opts.contratante.cnpj}`, { size: 10, gap: 12 })

  escreverTexto(state, 'CONTRATANTE', { size: 9, bold: true, cor: COR_SECUNDARIA, gap: 2 })
  escreverTexto(state, opts.cliente.razao_social, { size: 11, bold: true })
  escreverTexto(state, `CNPJ ${opts.cliente.cnpj}`, { size: 10 })
  if (opts.cliente.endereco) {
    escreverTexto(state, opts.cliente.endereco, { size: 10, gap: 16 })
  } else {
    state.cursorY -= 12
  }

  // Resumo comercial
  if (opts.resumoComercial && opts.resumoComercial.length) {
    escreverTexto(state, 'RESUMO COMERCIAL', { size: 9, bold: true, cor: COR_SECUNDARIA, gap: 4 })
    for (const item of opts.resumoComercial) {
      escreverTexto(state, `${item.label}: ${item.valor}`, { size: 10, gap: 2 })
    }
    state.cursorY -= 12
  }

  // Conteúdo principal (escopo / corpo do contrato)
  escreverTexto(state, 'ESCOPO E CONDIÇÕES', { size: 9, bold: true, cor: COR_SECUNDARIA, gap: 6 })
  escreverTexto(state, opts.conteudo, { size: 10, gap: 12 })

  // Footer
  if (state.cursorY < MARGIN + 120) novaPagina(state)
  state.cursorY -= 32
  escreverTexto(state, opts.dataLocal, { size: 11, gap: 32 })
  escreverTexto(state, '_______________________________________', { size: 10, gap: 4 })
  escreverTexto(state, opts.contratante.razao_social, { size: 11, bold: true })
  escreverTexto(state, `CNPJ ${opts.contratante.cnpj}`, { size: 9 })

  // Página
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    p.drawText(`Página ${i + 1} de ${pages.length}`, {
      x: PAGE_W - MARGIN - 90,
      y: MARGIN / 2,
      size: 8,
      font,
      color: COR_SECUNDARIA,
    })
  })

  return await doc.save()
}
