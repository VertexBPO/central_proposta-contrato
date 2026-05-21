# Design System — Central de Propostas e Contratos

Fonte de verdade visual. Tokens em `src/lib/design/tokens.ts`.

## Cores

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#0D1B3E` | Vertex blue — fundo headers, botões principais |
| `primaryHover` | `#1A2954` | Hover do primary |
| `background` | `#F0F4FB` | Fundo padrão da app |
| `surface` | `#FFFFFF` | Cards, modais |
| `textPrimary` | `#0D1B3E` | Texto principal |
| `textSecondary` | `#8A9AB5` | Texto secundário, labels |
| `border` | `#E5EAF2` | Bordas e divisores |
| `success` | `#1B9E5C` | Confirmação |
| `error` | `#D64545` | Erro |
| `warning` | `#E8A93C` | Aviso |
| `info` | `#2E6FE5` | Informação |

## Espaçamento (base 4px)

`xs=4 · sm=8 · md=12 · base=16 · lg=24 · xl=32 · 2xl=48 · 3xl=64`

## Tipografia (Inter)

| Token | Tamanho/Line | Peso |
|---|---|---|
| `display` | 32/40 | 700 |
| `h1` | 24/32 | 600 |
| `h2` | 20/28 | 600 |
| `h3` | 16/24 | 600 |
| `body` | 14/20 | 400 |
| `small` | 12/16 | 400 |

## Radius

`sm=6 · md=10 · lg=16 · full=9999`

## Shadows

- `sm`: `0 1px 3px rgba(13,27,62,0.08)`
- `md`: `0 4px 12px rgba(13,27,62,0.12)`
- `lg`: `0 12px 32px rgba(13,27,62,0.16)`

## Componentes base

| Componente | Variantes | Estados |
|---|---|---|
| Button | primary, secondary, ghost, danger | default, hover, active, disabled, loading |
| Input | text, email, number, date, textarea, select | default, focus, error, disabled |
| Card | default, padded | — |
| Modal | sm, md, lg | open, closing |
| Toast | success, error, warning, info | enter, leave |
| Badge | primary, success, error, warning, info, neutral | — |

## Acessibilidade

- WCAG AA mínimo
- Contraste texto/fundo ≥ 4.5:1
- Áreas de toque ≥ 44×44px
- Foco sempre visível (outline 2px primary)
- `aria-label` em ícones-botão

## Layout

- **Cliente** (mobile-first): largura máx 480px, padding lateral 20px
- **Operador/Admin** (desktop): sidebar fixa 240px à esquerda + conteúdo
- **Admin mobile**: bottom nav (4 itens)
