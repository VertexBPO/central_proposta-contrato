/**
 * Teste de preenchimento — gera proposta + contrato com dados reais e:
 *  1) lista placeholders que ficaram vazios (dado faltando)
 *  2) detecta {{ }} não substituídos (bug de parsing/run-split)
 *  3) salva os PDFs em /tmp pra inspeção visual
 *
 * Uso: exportar env do Supabase/CloudConvert e rodar com tsx.
 */
import { writeFileSync } from 'fs'
import PizZip from 'pizzip'
import { createAdminClient } from '@/lib/supabase/admin'
import { montarValores } from '@/lib/docs/valores-placeholders'
import { preencherDocx } from '@/lib/docs/gerar-com-template'
import { docxParaPdf } from '@/lib/cloudconvert/client'
import type { Client, Contractor, Proposal, ProposalTemplate, ContractTemplate } from '@/lib/db/types'

const PROP_ID = process.argv[2] || '0536cd9c-ebb1-4f77-8469-cbbbe5acfebc'

async function main() {
  const admin = createAdminClient()
  const { data: prop } = await admin.from('proposals').select('*').eq('id', PROP_ID).single()
  const proposta = prop as Proposal
  const { data: cli } = await admin.from('clients').select('*').eq('id', proposta.client_id).single()
  const { data: ctr } = await admin.from('contractors').select('*').eq('id', proposta.contractor_id!).single()
  const { data: ptpl } = await admin.from('proposal_templates').select('*').eq('id', proposta.proposal_template_id).single()
  const cliente = cli as Client
  const contratante = ctr as Contractor
  const ptplRow = ptpl as ProposalTemplate
  const ctplId = proposta.contract_template_id_override ?? ptplRow.contract_template_id
  const { data: ctpl } = await admin.from('contract_templates').select('*').eq('id', ctplId!).single()
  const ctplRow = ctpl as ContractTemplate

  const valores = montarValores(proposta, cliente, contratante)
  const vazios = Object.entries(valores).filter(([, v]) => !v || v.trim() === '').map(([k]) => k)
  console.log(`\nValores: ${Object.keys(valores).length} placeholders. Vazios: ${vazios.length} -> ${vazios.join(', ') || '(nenhum)'}\n`)

  const docs: Array<[string, string | null]> = [
    ['PROPOSTA', ptplRow.template_file_path],
    ['CONTRATO', ctplRow.template_file_path],
  ]

  for (const [label, path] of docs) {
    if (!path) { console.log(`${label}: SEM arquivo .docx`); continue }
    console.log(`=== ${label} (${path}) ===`)
    let docx: Buffer
    try {
      docx = await preencherDocx(path, valores)
    } catch (e) {
      console.log(`  ERRO ao preencher:`, e instanceof Error ? e.message : e)
      continue
    }
    // checa {{ }} remanescentes no documento gerado
    const zip = new PizZip(docx)
    const xml = zip.file('word/document.xml')?.asText() ?? ''
    const restantes = [...xml.matchAll(/\{\{[^}]{0,60}\}\}/g)].map((m) => m[0])
    console.log(`  {{ }} não substituídos: ${restantes.length}`, restantes.slice(0, 15))
    writeFileSync(`/tmp/teste-${label}.docx`, docx)

    // gera o PDF de verdade (CloudConvert)
    try {
      const pdf = await docxParaPdf(docx, `teste-${label}.docx`)
      writeFileSync(`/tmp/teste-${label}.pdf`, pdf)
      console.log(`  PDF gerado: /tmp/teste-${label}.pdf (${(pdf.length / 1024).toFixed(0)} KB)`)
    } catch (e) {
      console.log(`  ERRO CloudConvert:`, e instanceof Error ? e.message : e)
    }
    console.log('')
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
