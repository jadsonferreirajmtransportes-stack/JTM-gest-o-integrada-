# Telas dos treinamentos do sistema

As imagens em `public/treinamento-sistema/*.png` são capturas das telas reais do JMT com
**dados fictícios** (o banco é simulado em `cenas.tsx`; nada é lido do Supabase nem enviado
para ele) e com números marcados nos botões. Elas aparecem:

- no Portal de Educação (conteúdo "Passo a passo com imagens" dos Treinamentos do sistema);
- na Ajuda (botão "?" / F1), na seção "Veja nas telas".

## Onde fica cada coisa

- `src/data/telasTreinamento.ts`: lista das telas, o alvo de cada número e o texto de cada número.
- `ferramentas/telas-treinamento/cenas.tsx`: como cada tela é montada (dados fictícios, cliques, preenchimentos).
- `ferramentas/telas-treinamento/capturar.mjs`: abre cada cena no Chrome sem janela e salva o PNG.

## Gerar de novo (depois de mudar uma tela)

1. Num terminal: `npx vite --port=3085 --strictPort`
2. Em outro terminal: `node ferramentas/telas-treinamento/capturar.mjs` (todas as telas) ou
   `node ferramentas/telas-treinamento/capturar.mjs com-1 cmp-2` (só algumas).
3. Para conferir uma cena no navegador: `http://localhost:3085/ferramentas/telas-treinamento/telas.html?cena=com-1`.

Os treinamentos já criados guardam o caminho da imagem (`/treinamento-sistema/<id>.png`),
então uma imagem gerada de novo com o mesmo id já aparece atualizada para todos. Se mudar
**os textos** dos números, use "Treinamentos do sistema" → atualizar, no Portal de Educação.

Nunca use dados reais (nomes, CPF, telefones) nas cenas: as imagens são públicas no site.
