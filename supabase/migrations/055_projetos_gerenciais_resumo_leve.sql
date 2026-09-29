-- ============================================================================
-- Mesmo problema (e mesma solução) da 030_colaboradores_resumo_leve.sql, agora
-- em Projetos Gerenciais: os anexos do dossiê do projeto ficam em base64
-- dentro de `documentos` (e até 2026-09 cada anexo era gravado DUAS vezes, em
-- `url` e em `arquivoUrl`). Com só 3 projetos a tabela já tinha ~24MB em
-- produção — e a lista inteira de projetos é baixada de novo a cada gravação
-- em qualquer tela de Gestão (loadGestaoData), o que fez o Egress do plano
-- gratuito estourar (7,5GB / 5GB no ciclo set-out/2026).
--
-- Esta função devolve os projetos no mesmo formato de sempre, mas tira o
-- conteúdo do arquivo de cada item de `documentos`: remove `arquivoUrl`, e
-- `url` só quando for um arquivo embutido (data:...) — link externo de verdade
-- continua. Marca o item com "arquivoOmitido": true pra que o app saiba que o
-- arquivo existe mas não veio (ver saveProjetoGerencial em gestaoApi.ts, que
-- restaura o arquivo antes de gravar, e getProjetoGerencialCompleto, usado ao
-- abrir o projeto).
-- ============================================================================

create or replace function obter_projetos_gerenciais_resumo()
returns setof projetos_gerenciais
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec projetos_gerenciais;
begin
  for rec in select * from projetos_gerenciais order by criado_em desc loop
    rec.documentos := (
      select coalesce(
        jsonb_agg(
          case
            when elem ? 'arquivoUrl' or coalesce(elem->>'url', '') like 'data:%'
              then (elem - 'arquivoUrl'
                         - (case when coalesce(elem->>'url', '') like 'data:%' then 'url' else '' end))
                   || '{"arquivoOmitido": true}'::jsonb
            else elem
          end
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements(coalesce(rec.documentos, '[]'::jsonb)) elem
    );
    return next rec;
  end loop;
end;
$$;

-- Limpeza única: anexos antigos gravados em dobro (url = arquivoUrl, os dois
-- com o arquivo inteiro em base64) — mantém só arquivoUrl, que é o que todas
-- as telas leem primeiro (doc.arquivoUrl || doc.url). Reduz o tamanho da
-- tabela pela metade sem perder nenhum arquivo.
update projetos_gerenciais
set documentos = (
  select coalesce(
    jsonb_agg(
      case
        when elem ? 'arquivoUrl' and elem->>'url' = elem->>'arquivoUrl' then elem - 'url'
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(documentos) elem
)
where jsonb_typeof(documentos) = 'array'
  and exists (
    select 1 from jsonb_array_elements(documentos) e
    where e ? 'arquivoUrl' and e->>'url' = e->>'arquivoUrl'
  );
