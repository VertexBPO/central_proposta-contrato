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
 * Lê o .docx do escopo e extrai o conteúdo XML do <w:body> (sem <w:sectPr>),
 * pronto pra ser injetado via {{@escopo}} (raw XML) no template da proposta.
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

  const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/)
  if (!bodyMatch) throw new Error('Escopo .docx sem <w:body>')
  let body = bodyMatch[1]

  // Remove sectPr (propriedades de seção pertencem ao escopo, não devem ir pra proposta)
  body = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, '')
  return body.trim()
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
