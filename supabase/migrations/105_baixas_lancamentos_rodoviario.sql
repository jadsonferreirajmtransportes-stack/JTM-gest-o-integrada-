-- 105: as notas importadas na Performance das baixas entram no Controle Financeiro do
-- FARMA RODOVIÁRIO como lançamentos (NF, cliente pelo CNPJ do remetente, destinatário, cidade,
-- datas). O Valor a Cobrar é calculado pelo app com o tarifário do cliente; CT-e e peso podem ser
-- completados depois. Marcados com origem = 'baixas' → sempre no Rodoviário (o Aéreo não muda).
-- Não duplica: NF que já tem lançamento (em qualquer setor) não é criada de novo; quando a nota
-- pendente for entregue numa importação seguinte, a data de conclusão é preenchida.
-- Também lança as notas das importações que já existem.
-- Rodar no dev e na produção ANTES de publicar.

alter table baixas_notas add column if not exists cnpj_remetente text;
alter table lancamentos_faturamento_aereo add column if not exists origem text;
create index if not exists lanc_fat_nf_norm_idx on lancamentos_faturamento_aereo (baixas__nf(nota_fiscal));

create or replace function baixas__lancar_financeiro(p_upload text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_criados integer;
begin
  -- Pendente que foi entregue depois: completa a data de conclusão do lançamento já criado.
  update lancamentos_faturamento_aereo l set
    data_conclusao = (coalesce(n.entrega_tardia_em, n.data_entrega) at time zone 'America/Fortaleza')::date,
    atualizado_em = now()
  from baixas_notas n
  where n.upload_id = p_upload and l.origem = 'baixas' and l.data_conclusao is null
    and baixas__nf(l.nota_fiscal) = baixas__nf(n.numero)
    and n.abono_motivo is null and baixas__entregue(n.situacao, n.entrega_tardia_em)
    and coalesce(n.entrega_tardia_em, n.data_entrega) is not null;

  insert into lancamentos_faturamento_aereo (
    id, cliente_id, cliente_nome, cnpj_remetente, remetente_lab, destinatario, cidade_destino, nota_fiscal,
    data_emissao, modal, data_conclusao, valor_a_cobrar, confirmacao_pagamento, observacao, origem, criado_em
  )
  select distinct on (baixas__nf(n.numero))
    'lanc-bx-' || n.id, c.id, coalesce(c.nome_fantasia, n.remetente, ''), n.cnpj_remetente, n.remetente, n.destinatario, n.cidade, n.numero,
    (n.data_emissao at time zone 'America/Fortaleza')::date, 'Rodoviário',
    case when n.abono_motivo is null and baixas__entregue(n.situacao, n.entrega_tardia_em)
      then (coalesce(n.entrega_tardia_em, n.data_entrega) at time zone 'America/Fortaleza')::date end,
    0, false,
    'Lançado pela Performance das baixas — ' || u.responsavel || ', ' || to_char(u.data_referencia, 'DD/MM/YYYY'),
    'baixas', now()
  from baixas_notas n
  join baixas_uploads u on u.id = n.upload_id
  left join lateral (
    select cl.id, cl.nome_fantasia from clientes cl
    where (n.cnpj_remetente is not null and nullif(regexp_replace(n.cnpj_remetente, '\D', '', 'g'), '') = regexp_replace(coalesce(cl.cnpj, ''), '\D', '', 'g'))
       or (n.cnpj_remetente is null and n.remetente is not null and (upper(btrim(cl.razao_social)) = upper(btrim(n.remetente)) or upper(btrim(cl.nome_fantasia)) = upper(btrim(n.remetente))))
    order by coalesce(cl.setores_vinculados ? 'farma_rodoviario', false) desc
    limit 1
  ) c on true
  where n.upload_id = p_upload
    and baixas__nf(n.numero) is not null
    and not exists (select 1 from lancamentos_faturamento_aereo l where baixas__nf(l.nota_fiscal) = baixas__nf(n.numero))
  order by baixas__nf(n.numero)
  on conflict (id) do nothing;
  get diagnostics v_criados = row_count;
  return v_criados;
end;
$$;
revoke all on function baixas__lancar_financeiro(text) from public;
grant execute on function baixas__lancar_financeiro(text) to authenticated;

-- Importação pelo link pessoal: agora guarda o CNPJ do remetente e lança no financeiro.
create or replace function portal_baixas_importar(p_token text, p_cpf text, p_nascimento date, p_data date, p_arquivo text, p_notas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r baixas_responsaveis;
  v_id text := 'bxu-' || replace(gen_random_uuid()::text, '-', '');
  v_nome text;
begin
  if portal__colaborador(p_token, p_cpf, p_nascimento) is null then return jsonb_build_object('erro', 'dados'); end if;
  r := baixas__responsavel(p_token, p_cpf, p_nascimento);
  if r.colaborador_id is null then return jsonb_build_object('erro', 'sem_acesso'); end if;
  if p_data is null or p_data > current_date + 1 or p_data < current_date - 60 then return jsonb_build_object('erro', 'data'); end if;
  if jsonb_typeof(p_notas) <> 'array' or jsonb_array_length(p_notas) = 0 or jsonb_array_length(p_notas) > 5000 then return jsonb_build_object('erro', 'notas'); end if;
  select nome_completo into v_nome from colaboradores where id = r.colaborador_id;
  delete from baixas_uploads where lower(responsavel) = lower(r.nome) and data_referencia = p_data and base = r.base;
  insert into baixas_uploads (id, responsavel, base, data_referencia, arquivo_nome, criado_por, colaborador_id, origem)
  values (v_id, r.nome, r.base, p_data, left(p_arquivo, 200), coalesce(v_nome, r.nome), r.colaborador_id, 'portal');
  insert into baixas_notas (id, upload_id, numero, status, situacao, remetente, destinatario, cidade, transportadora, romaneio, motorista, data_emissao, data_entrega, prazo, cnpj_remetente)
  select 'bxn-' || replace(gen_random_uuid()::text, '-', ''), v_id,
    left(n->>'numero', 40), left(n->>'status', 40), left(n->>'situacao', 40), left(n->>'remetente', 200), left(n->>'destinatario', 200),
    left(n->>'cidade', 100), left(n->>'transportadora', 200), left(n->>'romaneio', 60), left(n->>'motorista', 120),
    nullif(n->>'dataEmissao', '')::timestamptz, nullif(n->>'dataEntrega', '')::timestamptz, left(n->>'prazo', 20), left(n->>'cnpjRemetente', 30)
  from jsonb_array_elements(p_notas) n
  where coalesce(n->>'numero', '') <> '';
  perform baixas__recontar(v_id);
  perform baixas__lancar_financeiro(v_id);
  return jsonb_build_object('id', v_id);
end;
$$;

-- Lança as notas das importações que já existem (da mais antiga para a mais nova).
do $$
declare
  x record;
begin
  for x in select id from baixas_uploads order by data_referencia, criado_em loop
    perform baixas__lancar_financeiro(x.id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
