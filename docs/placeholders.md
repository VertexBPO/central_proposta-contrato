# Placeholders Oficiais

Lista canônica de placeholders disponíveis nos templates Word. Esses são os nomes
que `montarValores()` (em [src/lib/docs/valores-placeholders.ts](../src/lib/docs/valores-placeholders.ts))
entrega ao docxtemplater na hora de gerar o PDF.

**Convenção:**
- `snake_case` lowercase para Propostas Assessoria e Contratos
- `UPPER_SNAKE_CASE` para Proposta BPO Financeiro (legado)
- Sem espaços, sem acentos, sem cedilhas

Cada template usa **apenas os placeholders que tem no .docx** — os demais são ignorados.

---

## Propostas Assessoria (12 placeholders)

Vale pra TODAS as propostas do tipo Assessoria Empresarial:
Arquitetura Interna, Estruturação Completa, Estruturação Financeira, Gestão de
Preços e Lucratividade, Gestão de Preços e Estruturação Financeira, Estrutura
Financeira e Preços SystemClient.

| Placeholder | Descrição | Exemplo |
|-------------|-----------|---------|
| `{{ano_atual}}` | Ano da proposta | `2026` |
| `{{ano_subsequente}}` | Ano seguinte | `2027` |
| `{{data_atual_extenso}}` | Data da proposta por extenso | `22 de maio de 2026` |
| `{{nome_cliente}}` | Nome do responsável do contratante | `João Silva` |
| `{{nome_empresa}}` | Razão social do contratante | `Boechat Brindes Ltda` |
| `{{num_proposta}}` | Número da proposta | `0526-22.01` |
| `{{parcelas}}` | Número de parcelas | `5` |
| `{{parcelas_extenso}}` | Número de parcelas por extenso | `cinco` |
| `{{tempo_contrato}}` | Prazo do contrato em meses | `5` |
| `{{valor_adesao}}` | Valor de adesão formatado | `R$ 2.700,00` |
| `{{valor_extenso}}` | Valor de adesão por extenso | `dois mil e setecentos reais` |
| `{{valor_parcela}}` | Valor de cada parcela | `R$ 540,00` |

---

## Proposta BPO Financeiro (8 placeholders)

Vale pra propostas BPO (SystemVertex e SystemClient compartilham mesmo schema).

| Placeholder | Descrição | Exemplo |
|-------------|-----------|---------|
| `{{ADESAO_EXTENSO}}` | Valor de adesão por extenso | `dois mil e setecentos reais` |
| `{{DATA_ATUAL_EXTENSO}}` | Data da proposta por extenso | `22 de maio de 2026` |
| `{{EMPRESA}}` | Razão social do contratante | `Boechat Brindes Ltda` |
| `{{NOME_CLIENTE}}` | Nome do responsável | `João Silva` |
| `{{NUM_PROPOSTA}}` | Número da proposta | `0526-22.01` |
| `{{VALOR_ADESAO}}` | Valor de adesão formatado | `R$ 2.700,00` |
| `{{VALOR_MENSALIDADE}}` | Valor da mensalidade | `R$ 540,00` |
| `{{VALOR_MENSALIDADE_EXTENSO}}` | Mensalidade por extenso | `quinhentos e quarenta reais` |

> O BPO usa nomenclatura UPPERCASE e o conceito "mensalidade" em vez de "parcela".

---

## Contratos (8 placeholders)

Vale pra TODOS os contratos.

| Placeholder | Descrição | Exemplo |
|-------------|-----------|---------|
| `{{nome_empresa}}` | Razão social do CONTRATANTE | `Boechat Brindes Ltda` |
| `{{cnpj_contratante}}` | CNPJ do CONTRATANTE | `48.547.684/0001-72` |
| `{{endereco_contratante}}` | Endereço completo do CONTRATANTE | `Rua José Resende Filho, 303, Centro, Vitória/ES, CEP 29107-248` |
| `{{nome_contratada}}` | Razão social da CONTRATADA | `Vertex BPO e Assessoria Empresarial Ltda` |
| `{{cnpj_contratada}}` | CNPJ da CONTRATADA | `62.308.347/0001-53` |
| `{{endereco_contratada}}` | Endereço da CONTRATADA | `Av. Mauro Gurgel, 5353, Sala 614, São Francisco, Cariacica/ES` |
| `{{num_proposta}}` | Número da proposta vinculada | `0526-22.01` |
| `{{data_assinatura_extenso}}` | Data da assinatura por extenso | `22 de maio de 2026` |

---

## Como o sistema usa

O usuário escolhe um template no momento de criar a proposta. O sistema:

1. Carrega o `.docx` do template via Supabase Storage
2. Roda `montarValores()` em [valores-placeholders.ts](../src/lib/docs/valores-placeholders.ts) que
   devolve o superset dos 3 conjuntos (Assessoria + BPO + Contrato)
3. Roda `preencherDocx()` que usa docxtemplater pra substituir cada `{{xxx}}` pelo valor
4. Roda pós-processamento (margens, watermark alpha, parágrafos vazios) em [gerar-com-template.ts](../src/lib/docs/gerar-com-template.ts)
5. Manda pro CloudConvert → PDF final

## Adicionar um novo placeholder

1. Em [valores-placeholders.ts](../src/lib/docs/valores-placeholders.ts), adicionar a chave no objeto de retorno de `montarValores()`
2. Adicionar entrada em `PLACEHOLDERS_DISPONIVEIS` na categoria correta
3. Atualizar este `placeholders.md`
4. Cadastrar o `{{novo_placeholder}}` no template Word (.docx)
