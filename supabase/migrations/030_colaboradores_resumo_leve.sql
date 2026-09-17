-- ============================================================================
-- Carregar a lista inteira de colaboradores (usado o tempo todo — tabelas,
-- dropdowns, badges, Vale Alimentação, Agenda etc.) estava lento porque
-- `select('*')` traz também os arquivos em base64 embutidos: a foto/PDF do
-- ASO (aso_imagem_url) e cada item de `documentos`/`anexos` (dossiê), que
-- juntos podem chegar a ~20MB POR colaborador (ver limite combinado já
-- existente em AsoImageUploader.tsx / EmployeeDossierSection.tsx). Com várias
-- dezenas de colaboradores, isso significa dezenas/centenas de MB toda vez
-- que o módulo de DP carrega — mesmo quando a tela só precisa dos nomes,
-- status e datas.
--
-- Esta função devolve os colaboradores no mesmo formato de sempre, mas com
-- aso_imagem_url zerado e sem o campo "arquivoUrl" dentro de cada item de
-- documentos/anexos — mantém tipo/status/nome/data (usados em contadores e
-- selos) e só tira o conteúdo pesado do arquivo em si. Quem realmente precisa
-- ver/editar o arquivo (abrir a ficha, editar cadastro, renovar o ASO) busca
-- o registro completo por id com obter_colaborador_completo.
-- ============================================================================

create or replace function obter_colaboradores_resumo()
returns setof colaboradores
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec colaboradores;
begin
  for rec in select * from colaboradores order by nome_completo loop
    rec.aso_imagem_url := null;
    rec.documentos := (
      select coalesce(jsonb_agg(elem - 'arquivoUrl'), '[]'::jsonb)
      from jsonb_array_elements(coalesce(rec.documentos, '[]'::jsonb)) elem
    );
    rec.anexos := (
      select coalesce(jsonb_agg(elem - 'arquivoUrl'), '[]'::jsonb)
      from jsonb_array_elements(coalesce(rec.anexos, '[]'::jsonb)) elem
    );
    return next rec;
  end loop;
end;
$$;

-- Um registro completo (com os arquivos de verdade) continua vindo de
-- select('*').eq('id', ...) direto na tabela — não precisa de função própria
-- pra isso, só a lista inteira é que precisava da versão leve acima.
