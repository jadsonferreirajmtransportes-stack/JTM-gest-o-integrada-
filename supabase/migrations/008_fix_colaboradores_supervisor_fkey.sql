-- ============================================================================
-- Corrige o alvo errado da chave estrangeira de colaboradores.supervisor_id.
--
-- Em 001_departamento_pessoal.sql essa coluna foi criada apontando (por engano)
-- para colaboradores(id) — uma auto-referência. Mas a tela de cadastro sempre
-- populou esse campo com o id de um registro da tabela SUPERVISORES (lista
-- separada, com ids como "sup-dp-1"), não com o id de outro colaborador.
-- Resultado: qualquer tentativa de salvar um colaborador com um supervisor
-- selecionado violava a constraint e o salvamento falhava, sempre, com
-- "violates foreign key constraint colaboradores_supervisor_id_fkey".
--
-- Usa NOT VALID pra não travar nessa alteração por causa de registros antigos
-- que já tenham (por causa do próprio bug) um valor inconsistente em
-- supervisor_id — a constraint corrigida passa a valer só para os próximos
-- INSERT/UPDATE, sem exigir uma limpeza prévia dos dados existentes.
-- ============================================================================

alter table colaboradores drop constraint if exists colaboradores_supervisor_id_fkey;

alter table colaboradores
  add constraint colaboradores_supervisor_id_fkey
  foreign key (supervisor_id) references supervisores(id) on delete set null
  not valid;

-- Mesmo engano, copiado pra tabela de ocorrências (supervisor_id também vem da
-- lista de Supervisores ali, não de outro colaborador).
alter table ocorrencias drop constraint if exists ocorrencias_supervisor_id_fkey;

alter table ocorrencias
  add constraint ocorrencias_supervisor_id_fkey
  foreign key (supervisor_id) references supervisores(id) on delete set null
  not valid;
