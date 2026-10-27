# Configurador "Monte seu PC"

Web Component independente de framework. Checa compatibilidade (socket, DDR, formato, conectores), encaixe físico no gabinete (mm) e consumo de energia.

```
src/core/   regras em TypeScript puro, sem DOM (roda no navegador ou no servidor)
src/ui/     <monte-seu-pc>, <mp-part-picker> (card de cada peça) e <mp-picker-dialog> (janela "Selecionar Componente", com filtros de src/core/filters.ts) (Lit)
data/       catalog.json — peças fictícias para estudo
test/       testes das regras (vitest)
```

## Comandos

```sh
npm install
npm test          # regras + validação do catálogo
npm run build     # gera ../assets/configurador/monte-seu-pc.js, catalog.json e img/
npm run thumbs    # renderiza as miniaturas (data/img) e as fotos dos PCs (../assets/img/pcs) a partir dos modelos 3D
```

`npm run thumbs` usa um Chromium do Playwright (`npx playwright install chromium`) com WebGL por software e preenche `image` no catálogo.

Para ver a página, sirva a pasta `loja-clone/` por HTTP (módulos ES não carregam via `file://`):

```sh
cd .. && python3 -m http.server 8765   # http://127.0.0.1:8765/monte-seu-pc.html
```

## Como usar em qualquer site

```html
<monte-seu-pc catalog="/caminho/catalog.json">
  <p slot="notice">Aviso opcional exibido acima da lista</p>
</monte-seu-pc>
<script type="module" src="/caminho/monte-seu-pc.js"></script>
```

- `catalog`: URL do JSON. Ou passe o objeto direto: `el.catalogData = {...}`.
- `sync-url` (padrão ligado): guarda a build em `?b=` para compartilhar e recarregar. A URL só leva ids de peças, nenhum dado pessoal.
- Eventos (`bubbles` + `composed`):
  - `build-change`: `detail` é a avaliação completa (peças, conflitos, energia, totais).
  - `add-to-cart`: `detail = { build, parts, totals }`. O site integra com o próprio carrinho.
- Tema: herda as variáveis CSS do site quando existem, então o modo claro/escuro do site vale para o componente. Superfícies e texto: `--box`, `--field`, `--panel`, `--txt`, `--mut`; bordas: `--edge`, `--line`; estados: `--hover`, `--chip`, `--focus`, `--shadow`; cores de status: `--red`, `--price`, `--danger-txt`, `--warn-txt`; fundo da prévia: `--stage-a`, `--stage-b`.
- Imagens: `image` de cada peça é relativo ao próprio `catalog.json` (pode ser URL absoluta).

## Regras

| Tipo | Efeito | Exemplos |
|---|---|---|
| `incompatible` | opção desabilitada, com motivo | socket, DDR, pentes > slots, formato da placa-mãe, conector da GPU |
| `nofit` | selecionável, fica vermelho, bloqueia COMPRAR | GPU mais longa ou mais grossa que o gabinete, cooler alto, radiador sem suporte, fonte longa |
| `power` | bloqueia COMPRAR acima de 85% de carga | `consumo = CPU + GPU + 75W`; recomendado = consumo / 0,70 |
| `warning` | só avisa | BIOS, cooler fraco para o processador, fonte entre 70% e 85% |

Valores do catálogo: preços em centavos (PIX), medidas em mm, potência em W. Placa-mãe pode trazer `rearIo` (USB 2.0/5G/10G/C, HDMI, DP, rede, Wi-Fi, áudio, PS/2, botões): o espelho de I/O do 3D é montado a partir dele (`src/three/rear-io.ts`). `validateCatalog()` aponta campos faltando ou com tipo errado.

## Prévia 3D

- `src/three/layout.ts`: geometria pura, em mm (1 unidade = 1 mm). As medidas do gabinete saem dos limites do catálogo: a GPU máxima termina na face das ventoinhas da frente, o cooler máximo na face interna do vidro e a fonte máxima na parede da gaiola de discos (`test/case-dims.test.ts`). O tamanho do gabinete sai dos limites dele (GPU, cooler, fonte, slots), então o "não cabe" aparece por medida, não por animação ensaiada. Tem testes em `test/layout.test.ts`.
- `src/three/models.ts`: modelos procedurais (ventoinhas com pás, aletas, heatpipes, slots da placa-mãe, pentes com RGB, GPU com backplate, gabinete com vidro). Cada modelo é construído no tamanho real e ocupa exatamente a caixa do layout (`test/models.test.ts`), então o "não cabe" continua exato. Sem arquivos GLTF de terceiros.
- `src/three/scene.ts`: Three.js, num arquivo separado (~170 KB gzip). Só é baixado quando a prévia aparece na tela.
- `<mp-pc-viewer>`: a peça escolhida entra pelo painel lateral e a câmera foca nela. Se não cabe, bate no limite e treme; a parte que sobra fica hachurada em vermelho, com a cota "faltam X mm".
- Renderiza só quando algo muda (sem loop contínuo) e pausa fora da tela. Com `prefers-reduced-motion` não anima.
- Sem WebGL, com economia de dados ou em aparelho com pouca memória, usa a vista 2D (`src/ui/side-view.ts`): SVG detalhado visto pelo vidro, com as mesmas medidas do 3D, soquete conforme a placa, cabos, gaiola de discos e régua de 100 mm. O usuário pode alternar entre 2D e 3D.
- No celular, a prévia abre como painel pelo botão "Ver PC" da barra inferior.
- Controles: vistas prontas (Geral, Lateral, Frente, Traseira, Topo), zoom (+/−) e tela cheia. Pelo teclado, com foco na prévia: setas giram, + e − aproximam, 0 a 4 escolhem a vista. A roda do mouse só aproxima em tela cheia (na página ela continua rolando a página). As portas traseiras da placa-mãe também aparecem em texto, abaixo da prévia.
