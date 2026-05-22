/**
 * Gera PDF a partir de um template .docx + valores de placeholders.
 * 1. Carrega .docx do Supabase Storage
 * 2. Usa docxtemplater pra substituir {{placeholders}}
 * 3. Converte .docx final pra PDF via CloudConvert
 * 4. Devolve buffer PDF
 */
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { createAdminClient } from '@/lib/supabase/admin'
import { docxParaPdf } from '@/lib/cloudconvert/client'

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
