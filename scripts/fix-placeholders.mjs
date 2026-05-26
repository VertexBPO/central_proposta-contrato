/**
 * Corrige 2 placeholders em todas as propostas:
 *  - {{data_atual _extenso}}    → {{data_atual_extenso}}    (remove espaço)
 *  - {{parcelas_extensão}}      → {{parcelas_extenso}}      (ASCII)
 *
 * Word às vezes quebra placeholders entre <w:r> runs. Pra robustez:
 * 1. Tenta replace direto no XML (caso simples — placeholder intacto em <w:t>)
 * 2. Se não achou em <w:t>, faz uma normalização: extrai texto concatenado dos
 *    <w:t>, faz replace, redistribui — mas só se necessário.
 *
 * Salva os .docx corrigidos em Propostas Modelo/_corrigidas/ pra você
 * conferir antes de substituir os originais.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'

const folder = '/Users/sandroalves/Claude/Apps Projetos/Central de Propostas e Contratos/Propostas Modelo'
const outFolder = join(folder, '_corrigidas')
mkdirSync(outFolder, { recursive: true })

const FIXES = [
  { from: 'data_atual _extenso', to: 'data_atual_extenso' },
  { from: 'parcelas_extensão', to: 'parcelas_extenso' },
]

const files = readdirSync(folder).filter((f) => f.endsWith('.docx'))

for (const f of files) {
  const buf = readFileSync(join(folder, f))
  const zip = await JSZip.loadAsync(buf)
  const docFile = zip.file('word/document.xml')
  if (!docFile) {
    console.log(`✗ ${f}: sem word/document.xml`)
    continue
  }
  let xml = await docFile.async('string')

  const aplicados = []
  const naoAchados = []

  for (const fix of FIXES) {
    const full = `{{${fix.from}}}`
    const target = `{{${fix.to}}}`

    // 1. Tenta replace dentro de <w:t> (caso simples)
    let antes = (xml.match(new RegExp(full.replace(/[{}]/g, '\\$&'), 'g')) || []).length

    if (antes > 0) {
      xml = xml.split(full).join(target)
      aplicados.push(`${full} → ${target} (×${antes}, intacto)`)
      continue
    }

    // 2. Procura no texto concatenado dos <w:t>
    const tBlocks = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
    const textoConcat = tBlocks.map((m) => m[1]).join('')

    if (!textoConcat.includes(full)) {
      naoAchados.push(full)
      continue
    }

    // 3. Placeholder está QUEBRADO entre runs. Estratégia: re-monta toda a sequência
    //    de <w:r> que envolve o placeholder substituindo pelo target.
    //
    //    Approach simplificado: encontra a posição no texto concatenado, identifica
    //    quais <w:t> abrangem essa posição, e altera para que o primeiro <w:t> tenha
    //    o target e os demais (do mesmo placeholder) fiquem vazios.

    let pos = 0
    const blocks = tBlocks.map((m) => {
      const inicio = pos
      const fim = pos + m[1].length
      pos = fim
      return { match: m, texto: m[1], inicio, fim, xmlIndex: m.index }
    })

    let substituicoes = 0
    let idx = textoConcat.indexOf(full)
    while (idx !== -1) {
      const start = idx
      const end = idx + full.length

      // Acha primeiro <w:t> que começa antes (ou em) start e o último que termina depois (ou em) end
      const primeiro = blocks.find((b) => b.inicio <= start && b.fim > start)
      const ultimo = blocks.find((b) => b.inicio < end && b.fim >= end)

      if (!primeiro || !ultimo) break

      // Calcula a parte ANTES do placeholder no primeiro bloco
      const antesTexto = primeiro.texto.slice(0, start - primeiro.inicio)
      // Parte DEPOIS no último bloco
      const depoisTexto = ultimo.texto.slice(end - ultimo.inicio)

      // Substitui o conteúdo de cada <w:t> envolvido
      const idxPrimeiro = blocks.indexOf(primeiro)
      const idxUltimo = blocks.indexOf(ultimo)

      // Novo conteúdo: o target inteiro vai no primeiro
      const novoPrimeiro = antesTexto + target + depoisTexto.repeat(0) // depois trataremos
      blocks[idxPrimeiro] = {
        ...primeiro,
        texto: novoPrimeiro,
      }
      // Blocos intermediários vão zerar
      for (let i = idxPrimeiro + 1; i < idxUltimo; i++) {
        blocks[i] = { ...blocks[i], texto: '' }
      }
      // Último bloco recebe só a parte depois
      if (idxUltimo > idxPrimeiro) {
        blocks[idxUltimo] = { ...blocks[idxUltimo], texto: depoisTexto }
      } else {
        // Mesmo bloco: o texto já tem antes + target + depois embutido
        blocks[idxPrimeiro] = { ...blocks[idxPrimeiro], texto: antesTexto + target + depoisTexto }
      }

      substituicoes++
      // Recalcula textoConcat e busca próxima ocorrência
      // (simplificação: assume só 1 ocorrência por placeholder)
      break
    }

    if (substituicoes > 0) {
      // Reconstrói o XML com os blocks alterados
      // Usa as posições xmlIndex originais e reescreve cada <w:t>
      const novoXml = []
      let cursor = 0
      for (const b of blocks) {
        const m = b.match
        novoXml.push(xml.slice(cursor, m.index))
        // Reescreve <w:t...>texto novo</w:t>
        const tagAbertura = m[0].match(/^<w:t[^>]*>/)[0]
        novoXml.push(`${tagAbertura}${b.texto}</w:t>`)
        cursor = m.index + m[0].length
      }
      novoXml.push(xml.slice(cursor))
      xml = novoXml.join('')
      aplicados.push(`${full} → ${target} (×${substituicoes}, recompôs runs)`)
    } else {
      naoAchados.push(full)
    }
  }

  zip.file('word/document.xml', xml)
  const out = await zip.generateAsync({ type: 'nodebuffer' })
  writeFileSync(join(outFolder, f), out)

  console.log(`\n→ ${f}`)
  for (const a of aplicados) console.log(`   ✓ ${a}`)
  for (const n of naoAchados) console.log(`   · ${n} (não encontrado, nada a fazer)`)
}

console.log(`\n✅ Arquivos corrigidos salvos em: ${outFolder}`)
