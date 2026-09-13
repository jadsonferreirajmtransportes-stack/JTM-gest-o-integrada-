# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Equipe interna da Jobson de Moraes Transportes (JMT) — uma transportadora especializada em logística de saúde (farma aéreo e rodoviário, cadeia fria RDC 430/ANVISA). O sistema é de uso exclusivo interno, acesso restrito à Diretoria e times autorizados ("Acesso restrito à Diretoria" na tela de login); não é um produto vendido a terceiros.

Três papéis de acesso (`userRole`: admin/supervisor/colaborador), com módulos liberados por login individual (tabela `usuarios`, campo `modulosPermitidos`):
- **Diretoria/Admin**: visão completa — Torre de Controle (Dashboard Geral), Controladoria (DRE gerencial), Usuários & Acessos, todos os setores operacionais.
- **Supervisores**: gestão dos setores sob sua responsabilidade (Farma Aéreo, Farma Rodoviário, DP).
- **Colaboradores**: acesso mais restrito, ao que lhes for liberado (ex.: Chat Interno, Agenda, Notas).

Por decisão explícita do usuário nesta rodada, este trabalho de aprimoramento visual cobre apenas as telas internas autenticadas — os formulários públicos usados por candidatos e terceiros sem login (pré-admissão, registro de ocorrência) ficam fora de escopo por ora.

## Product Purpose

Sistema de gestão integrada da JMT: substitui controle disperso em planilhas/Coda por um painel único para operação, RH e financeiro. Módulos confirmados em produção:

- **Clientes** — CRM da carteira (contratos, tabela de frete, contatos, interações).
- **Farma Aéreo** e **Farma Rodoviário** — painéis gerenciais por setor (Visão Geral & DRE, Empresas Atreladas, Equipe do Setor, Faturamento, Controle Financeiro de CT-e/NF-e, Custos Operacionais).
- **Departamento Pessoal (DP)** — folha, admissão/pré-admissão, férias, exames ASO (RDC 430), EPI, ocorrências/advertências, cargos e salários, aniversariantes, arquivo de demitidos.
- **Controladoria** — DRE Gerencial e Orçado x Realizado.
- **Projetos** — gestão de projetos/OKRs internos.
- **Agenda**, **Notas**, **Instruções de Trabalho** — colaboração e documentação interna, com visibilidade por usuário/marcação.
- **Chat Interno** — mensagens 1:1 e em grupo, tempo real (Supabase Realtime).
- **Usuários & Acessos (Logins)** — cadastro de contas, permissões por módulo, vínculo com autenticação real do Supabase.

Sucesso = a Diretoria e os times enxergam rápido o que precisa de atenção (prazos, vencimentos, indicadores financeiros) sem procurar em planilhas, e cada operação (farma aéreo/rodoviário) tem seu próprio painel de DRE gerencial.

## Positioning

Não é um SaaS genérico de gestão — é moldado às exigências regulatórias específicas do negócio: cadeia fria farmacêutica (RDC 430/2020, ANVISA) no transporte aéreo e rodoviário, e conformidade trabalhista CLT (exames ASO, férias, admissão/demissão). Um concorrente genérico de "CRM + RH" não replica esse encaixe regulatório nem os dois centros de custo operacionais (Aéreo/Rodoviário) tratados como unidades de negócio com DRE próprio.

## Operating Context

- Deploy ao vivo na Vercel (https://jtm-gest-o-integrada.vercel.app), dados reais em produção via Supabase (projetos `jmt-gestao-dev` e `jmt-gestao-producao`) — dado de verdade, não fixture; nenhuma tela deve ser desenhada com dado fabricado.
- Login real por pessoa (Supabase Auth, vínculo automático por e-mail) já em andamento; papel (`role`) checado no backend via Edge Function `convidar-usuario`.
- Sistema 100% em tema claro (decisão explícita do usuário nesta mesma sessão de trabalho) — nenhuma área escura deve ser reintroduzida.
- Migração de fonte de dados concluída (Coda → Supabase, 10/10 empresas) — não é mais um projeto de migração, é produto em uso diário.

## Capabilities and Constraints

- Stack: React 19 + TypeScript + Vite 6 + Tailwind v4, ícones `lucide-react`, `motion` disponível para animação, Supabase (Postgres + Auth + Realtime + Edge Functions) como backend.
- **Lacuna técnica conhecida**: `@types/react`/`@types/react-dom` não estão instalados — `tsc --noEmit` não valida props de JSX. Qualquer refatoração de props de componente precisa ser conferida manualmente lendo o call site e a interface lado a lado, não só rodando o typecheck.
- LGPD: minimizar/proteger dado pessoal em qualquer tela ou export que toque dados de colaborador/cliente.
- Sem upload de foto de perfil/avatar de usuário no momento (restrição confirmada em rodada anterior de redesenho) — qualquer padrão visual que dependa de avatares de usuário (como nas referências anexadas) precisa de um substituto (iniciais, ícone, cor) em vez de fotos reais.
- Sem biblioteca de gráficos adicional — indicadores visuais (barras, anéis, sparklines) são construídos com CSS/SVG simples, não uma lib de charting nova.

## Brand Commitments

Manual de Identidade Visual Jobson de Moraes Transportes (Ed. 01 · 2026) — referenciado no código (`src/components/Brand/JmtLogo.tsx`, `src/index.css`). Paleta oficial:

| Nome | Hex | Uso confirmado hoje |
|---|---|---|
| Bronze JMT | `#B38F4F` | Acento primário da marca — único acento de cor mandatado em toda reformulação visual já feita |
| Bronze Profundo | `#8A6A39` | Variante escura do bronze (hover, texto sobre bronze claro) |
| Grafite | `#111111` | Texto primário / era o fundo escuro do sistema (removido pelo mandato de tema 100% claro) |
| Branco | `#FFFFFF` | Fundo base das superfícies |
| Areia | `#F4EEE1` | Neutro quente — hoje subutilizado no app |
| Névoa | `#6E6A62` | Cinza neutro da marca — hoje subutilizado no app |
| Petróleo | `#28464E` | Cor secundária da marca — hoje **não usada** em nenhuma tela |

Regras já confirmadas nesta mesma linha de trabalho (não reabrir sem motivo):
- Bronze/gold é o único acento de marca — nunca adotar azul ou outra cor de destaque "genérica de SaaS" mesmo que a referência visual use azul.
- Tipografia: Plus Jakarta Sans (texto) + Space Grotesk (títulos e números de indicador, via `.font-display`).
- Tema 100% claro — sem áreas escuras.
- Logo (`JmtLogo`) tem variantes `full`/`compact`/`icon`/`seal`, sempre `theme="light"` no app.
- Selo institucional inclui a assinatura "Logística de Saúde" e "RDC 430/2020 · ANVISA" — usada como tagline em contextos institucionais/impressos.

## Evidence on Hand

- Dado real de produção via Supabase para todos os módulos listados acima — sem dado fabricado em nenhuma tela.
- Duas referências visuais anexadas pelo usuário nesta rodada (não fazem parte do produto, são inspiração de padrão de interface): um dashboard de gerenciador de arquivos (Dropbox/Google Drive/OneDrive, cards de armazenamento, acesso rápido em grid de ícones, atividade recente com avatares) e um template de dashboard Figma (Teamfit — metas, desafios, standings, sidebar azul). Ambas usam azul como acento — não será adotado; o valor a extrair são os padrões de composição (cards de armazenamento/indicador, grid de acesso rápido, lista de atividade recente, sidebar com hierarquia clara), reinterpretados na paleta oficial JMT.
- Sem depoimentos, cases, benchmarks ou dados de terceiros — não inventar nada disso.

## Product Principles

1. O bronze/dourado da marca é o único acento de cor permitido — qualquer padrão emprestado de referência externa é recolorido para a paleta oficial JMT, nunca copiado com a cor original.
2. Tema 100% claro, sem exceção, em toda superfície nova ou retrabalhada.
3. Um indicador visual por cartão — evitar poluição visual com múltiplos gráficos concorrendo por atenção no mesmo cartão.
4. Dado real ou nada — nenhuma tela usa números ou nomes fictícios; onde não há dado, mostrar estado vazio explícito.
5. Cada setor operacional (Farma Aéreo, Farma Rodoviário) é tratado como unidade de negócio com seu próprio DRE gerencial — a composição visual deve deixar isso claro (identidade visual própria dentro do sistema, sempre com o mesmo vocabulário de design).

## Accessibility & Inclusion

Nenhum requisito específico de acessibilidade foi levantado formalmente até agora; nenhuma tela deve regredir contraste de texto ou tamanho de alvo de clique ao aplicar o novo padrão visual.
