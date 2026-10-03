// ============================================================================
// Cenas dos módulos de Departamento Pessoal, Gestão, Operações e Logins (ver
// cenas.tsx). Todos os dados passam por dadosFicticios.ts → anonimizar().
// Componentes carregados com import() dentro de cada cena — assim o banco
// simulado (apoio.tsx) já está no lugar quando o Supabase carrega.
// ============================================================================

import React from 'react';
import { tabelas, esperar, clicar, digitar, achar, moldura, Cena } from './apoio';
import { anonimizar } from './dadosFicticios';

const nada = () => {};
const nadaAsync = async () => {};
const AGORA = new Date('2026-10-02T10:00:00-03:00');
const iso = (dias = 0) => new Date(AGORA.getTime() + dias * 86400000).toISOString();
const dia = (dias = 0) => iso(dias).slice(0, 10);

let cache: any = null;
async function D() {
  if (cache) return cache;
  const base = await import('../../src/data/initialData');
  const { INITIAL_PROJETOS_GERENCIAIS } = await import('../../src/data/initialProjectsData');
  const { INITIAL_ATIVIDADES_GESTAO } = await import('../../src/data/initialAgendaData');
  const { INITIAL_USERS_DATA } = await import('../../src/data/initialUsersData');
  cache = anonimizar({
    colaboradores: base.INITIAL_COLABORADORES,
    supervisores: base.INITIAL_SUPERVISORES,
    empregadores: base.INITIAL_EMPREGADORES,
    cargos: base.INITIAL_CARGOS,
    ferias: base.INITIAL_FERIAS,
    ocorrencias: base.INITIAL_OCORRENCIAS,
    feriados: base.INITIAL_FERIADOS,
    preAdmissoes: base.INITIAL_PRE_ADMISSOES,
    clientes: base.INITIAL_CLIENTES,
    embarques: base.INITIAL_EMBARQUES_AEREOS,
    viagens: base.INITIAL_VIAGENS_RODOVIARIAS,
    custos: base.INITIAL_CUSTOS_OPERACIONAIS,
    projetos: INITIAL_PROJETOS_GERENCIAIS,
    atividades: INITIAL_ATIVIDADES_GESTAO,
    usuarios: INITIAL_USERS_DATA.map((u: any) => ({ ...u, senha: undefined })),
  });
  // Datas de ASO perto de hoje, pra ter válidos, a vencer e vencidos na tela.
  cache.colaboradores.forEach((c: any, i: number) => {
    c.dataNascimento = `198${i % 10}-10-${String(2 + i).padStart(2, '0')}`;
    if (c.exameAso) c.exameAso = { ...c.exameAso, dataVencimento: dia([-12, 18, 120, 240, 300, 25, 400, 60, 90][i % 9]) };
  });
  return cache;
}

// Faturamento fictício do mês (as duas operações filtram pelo setor do cliente).
function lancamentosFicticios(clientes: any[]) {
  const l: any[] = [];
  clientes.forEach((c: any, ci: number) => {
    for (let i = 0; i < 24; i++) {
      const v = 3200 + ((ci * 37 + i * 53) % 1500);
      l.push({ id: `lan-${ci}-${i}`, clienteId: c.id, clienteNome: c.nomeFantasia || c.razaoSocial, dataEmissao: dia(-((i * 3) % 28) - 2), numeroCte: `CT-${1000 + ci * 50 + i}`, notaFiscal: String(50000 + ci * 100 + i), modal: i % 2 ? 'Aéreo' : 'Rodoviário', valorNF: v * 30, valorPrestacao: v, valorACobrar: v, cidadeDestino: 'Natal', estadoDestino: 'RN', volumes: 1 + (i % 4), pesoKg: 5 + (i % 9) });
    }
  });
  return l;
}
const ADMIN: any = { id: 'u-admin', nome: 'Marcos Andrade', login: 'marcos', email: 'marcos@exemplo.com', cargo: 'Gerente', status: 'Ativo', dataCriacao: iso(-300), modulosPermitidos: [], role: 'admin' };

// ---- Tabelas simuladas de algumas telas ----
function prepararFrequencia(cols: any[]) {
  tabelas.ponto_jornadas = [
    { id: 'jor-a', nome: 'Farma Aéreo (motoristas e ajudantes)', dias_semana: [1, 2, 3, 4, 5], entrada: '08:00', saida_intervalo: '12:00', volta_intervalo: '13:12', saida: '18:00', tolerancia_min: 15, ativo: true },
    { id: 'jor-r', nome: 'Farma Rodoviário (motoristas e ajudantes)', dias_semana: [2, 3, 4, 5, 6], entrada: '06:00', saida_intervalo: '11:00', volta_intervalo: '12:12', saida: '16:00', tolerancia_min: 15, ativo: true },
  ];
  tabelas.ponto_colaborador_jornada = cols.map((c, i) => ({ colaborador_id: c.id, jornada_id: i % 2 ? 'jor-r' : 'jor-a' }));
  tabelas.ponto_locais = [{ id: 'loc1', nome: 'Base Parnamirim', latitude: -5.91, longitude: -35.26, raio_m: 300, ativo: true }];
  tabelas.portal_colaborador = [];
  const bat: any[] = [];
  const hoje = dia(0);
  cols.forEach((c, i) => {
    for (let d = -20; d <= 0; d++) {
      const data = dia(d);
      const sem = new Date(`${data}T12:00:00`).getDay();
      const jorA = i % 2 === 0;
      if (jorA ? sem === 0 || sem === 6 : sem === 0 || sem === 1) continue;
      if ((i + d) % 9 === 0 && data !== hoje) continue; // algumas faltas
      const [e, si, vi, s] = jorA ? ['08:0', '12:0', '13:1', '18:0'] : ['06:0', '11:0', '12:1', '16:0'];
      const atraso = (i + d) % 7 === 0 ? 2 : 0;
      const horas = data === hoje ? (i % 3 === 2 ? [] : [`${e.slice(0, 3)}${atraso}${i % 10}`]) : [`${e.slice(0, 3)}${atraso}${i % 10}`, `${si}${i % 6}`, `${vi}${(i + 2) % 10}`, `${s}${i % 9}`];
      horas.forEach((h, k) => bat.push({ id: `b${i}-${d}-${k}`, colaborador_id: c.id, registrado_em: new Date(`${data}T${h}:00-03:00`).toISOString(), origem: 'celular', latitude: -5.91, longitude: -35.26, local_nome: 'Base Parnamirim', distancia_m: 40 + i * 7, anulado: false }));
    }
  });
  tabelas.ponto_registros = bat;
  tabelas.ponto_justificativas = [{ id: 'j1', colaborador_id: cols[0].id, data: dia(-6), tipo: 'Atestado médico', abona: true, observacao: 'Atestado de 1 dia' }];
}

const CENAS_DP: Record<string, Cena> = {
  'dpd-1': {
    montar: async () => {
      const d = await D();
      const { Dashboard } = await import('../../src/components/Dashboard');
      return moldura(<Dashboard colaboradores={d.colaboradores} ferias={d.ferias} ocorrencias={d.ocorrencias} alertas={[]} userRole="admin" temAcessoGeralDp onNavigate={nada} onSelectColaborador={nada} onOpenNovoColaborador={nada} onOpenAdmissionLink={nada} onOpenNovaOcorrencia={nada} />);
    },
  },
  'col-1': {
    montar: async () => {
      const d = await D();
      const { EmployeeList } = await import('../../src/components/Employees/EmployeeList');
      return moldura(
        <EmployeeList colaboradores={d.colaboradores.filter((c: any) => c.status !== 'Inativo')} empregadores={d.empregadores} supervisores={d.supervisores} userRole="admin" temAcessoGeralDp searchQuery="" onSearchChange={nada} onOpenNovo={nada} onSelectColaborador={nada} onEditColaborador={nada} onDeleteColaborador={nada} onOpenDemissaoModal={nada} onOpenProgramarFerias={nada} onOpenRegistrarOcorrencia={nada} />
      );
    },
  },
  'pre-1': {
    montar: async () => {
      const d = await D();
      const { PreAdmissionsManagerView } = await import('../../src/components/Admission/PreAdmissionsManagerView');
      return moldura(<PreAdmissionsManagerView preAdmissoes={d.preAdmissoes} empregadores={d.empregadores} cargos={d.cargos} supervisores={d.supervisores} temAcessoGeralDp onOpenLinkGenerator={nada} onEfetivarAdmissao={nada} onUpdateStatus={nada} onDeletePreAdmissao={nada} onSelectColaboradorDetail={nada} />);
    },
  },
  'cus-1': {
    montar: async () => {
      const d = await D();
      const { MonthlyCostView } = await import('../../src/components/Cost/MonthlyCostView');
      return moldura(<MonthlyCostView colaboradores={d.colaboradores} empregadores={d.empregadores} />);
    },
  },
  'va-1': {
    montar: async () => {
      const d = await D();
      const q = { id: 'q1', identificacao: '1ª QUINZENA - OUTUBRO/2026', dataInicio: '2026-10-01', dataTermino: '2026-10-15' };
      const lanc = d.colaboradores
        .filter((c: any) => c.status !== 'Inativo')
        .map((c: any, i: number) => ({ id: `l${i}`, colaboradorId: c.id, colaboradorNome: c.nomeCompleto, quinzenaId: 'q1', identificacaoQuinzena: q.identificacao, dataInicio: q.dataInicio, dataTermino: q.dataTermino, valorDiaria: 25, faltas: i % 4 === 0 ? 1 : 0, diasFerias: 0, diariasExtras: 0, quantidadeDiarias: i % 4 === 0 ? 10 : 11, valorDisponibilizado: (i % 4 === 0 ? 10 : 11) * 25, criadoEm: iso(-1) }));
      const { ValeAlimentacaoView } = await import('../../src/components/Vacation/ValeAlimentacaoView');
      return moldura(<ValeAlimentacaoView colaboradores={d.colaboradores} ocorrencias={d.ocorrencias} feriasList={d.ferias} quinzenas={[q]} lancamentos={lanc} onSaveQuinzena={nada} onDeleteQuinzena={nada} onGerarLancamentos={nada} onSincronizarFaltas={nada} onSaveLancamento={nada} onDeleteLancamento={nada} />);
    },
  },
  'fer-1': {
    montar: async () => {
      const d = await D();
      tabelas.documentos_assinatura = [];
      const { VacationView } = await import('../../src/components/Vacation/VacationView');
      return moldura(<VacationView colaboradores={d.colaboradores} feriasList={d.ferias} userRole="admin" currentUser={ADMIN} onSaveFerias={nada} onUpdateStatusFerias={nada} />);
    },
  },
  'aso-1': {
    montar: async () => {
      const d = await D();
      const { AnvisaExamsView } = await import('../../src/components/Health/AnvisaExamsView');
      return moldura(<AnvisaExamsView colaboradores={d.colaboradores} empregadores={d.empregadores} onUpdateExame={nada} onAgendarExame={nada} onCarregarColaboradorCompleto={async (id: string) => d.colaboradores.find((c: any) => c.id === id)} />);
    },
  },
  'epi-1': {
    montar: async () => {
      const d = await D();
      const itens = (n: number) => [
        { id: `i${n}a`, descricao: 'Luva de proteção', ca: '12345', tamanho: 'M', quantidade: 2, motivo: 'Primeira entrega' },
        { id: `i${n}b`, descricao: 'Bota de segurança', ca: '67890', tamanho: '42', quantidade: 1, motivo: 'Primeira entrega' },
      ];
      const entregas = d.colaboradores.slice(0, 5).map((c: any, i: number) => ({ id: `e${i}`, colaboradorId: c.id, data: dia(-i * 9), responsavelEntrega: 'Paula Ribeiro', itens: itens(i), criadoEm: iso(-i * 9) }));
      const { EpiView } = await import('../../src/components/Epi/EpiView');
      return moldura(<EpiView colaboradores={d.colaboradores} entregas={entregas} currentUserName="Paula Ribeiro" onSaveEntrega={nada} onDeleteEntrega={nada} onOpenEpiLinkModal={nada} />);
    },
  },
  'cc-1': {
    montar: async () => {
      const d = await D();
      const status = ['Assinado', 'Assinado', 'Visualizado', 'Pendente', 'Assinado', 'Pendente', 'Assinado', 'Visualizado'];
      tabelas.documentos_assinatura = d.colaboradores.slice(0, 8).map((c: any, i: number) => ({ id: `doc${i}`, categoria: 'contracheque', colaborador_id: c.id, colaborador_nome: c.nomeCompleto, referencia: '2026-09', tipo: 'Folha mensal', titulo: 'Contracheque de setembro/2026', arquivo_ref: '', arquivo_nome: 'contracheque.pdf', token: `t${i}`, link_expira_em: iso(20), status: status[i], visualizado_em: status[i] !== 'Pendente' ? iso(-1) : null, assinado_em: status[i] === 'Assinado' ? iso(-1) : null, criado_em: iso(-3) }));
      const { DocumentosAssinaturaView } = await import('../../src/components/Contracheques/DocumentosAssinaturaView');
      return moldura(<DocumentosAssinaturaView categoria="contracheque" colaboradores={d.colaboradores} currentUser={ADMIN} />);
    },
  },
  'onb-1': {
    montar: async () => {
      const d = await D();
      const { OnboardingView } = await import('../../src/components/Onboarding/OnboardingView');
      return moldura(<OnboardingView colaboradores={d.colaboradores} onUpdateOnboardingItem={nada} />);
    },
  },
  'oco-1': {
    montar: async () => {
      const d = await D();
      const { OccurrencesView } = await import('../../src/components/Occurrences/OccurrencesView');
      return moldura(<OccurrencesView colaboradores={d.colaboradores} supervisores={d.supervisores} ocorrencias={d.ocorrencias} userRole="admin" temAcessoGeralDp onSaveOcorrencia={nada} onDeleteOcorrencia={nada} onOpenPublicFormModal={nada} onOpenOccurrenceLinkModal={nada} onOpenPortalView={nada} />);
    },
  },
  'oco-2': {
    montar: async () => CENAS_DP['oco-1'].montar(),
    acoes: async () => {
      await clicar('Nova Ocorrência');
      await esperar(500);
    },
  },
  'dis-1': {
    montar: async () => {
      const d = await D();
      const cols = d.colaboradores.filter((c: any) => c.status !== 'Inativo');
      tabelas.medidas_disciplinares = [
        { id: 'm1', colaborador_id: cols[1].id, colaborador_nome: cols[1].nomeCompleto, tipo: 'Advertência escrita', etapa: 2, data_fato: dia(-3), data_ciencia_fato: dia(-3), descricao_fato: 'Atraso reincidente acima da tolerância.', enquadramento: [], status: 'Proposta', proposto_por: 'Paula Ribeiro', proposto_em: iso(-2), criado_em: iso(-2) },
        { id: 'm2', colaborador_id: cols[2].id, colaborador_nome: cols[2].nomeCompleto, tipo: 'Advertência verbal', etapa: 1, data_fato: dia(-15), data_ciencia_fato: dia(-15), descricao_fato: 'Não utilizou a luva na descarga.', enquadramento: [], status: 'Aprovada', proposto_por: 'Paula Ribeiro', proposto_em: iso(-14), aprovado_por: 'Marcos Andrade', aprovado_em: iso(-13), criado_em: iso(-14) },
      ];
      tabelas.documentos_assinatura = [];
      const { DisciplinarView } = await import('../../src/components/Disciplinar/DisciplinarView');
      return moldura(<DisciplinarView colaboradores={d.colaboradores} empregadores={d.empregadores} ocorrencias={d.ocorrencias} currentUser={ADMIN} userRole="admin" onSalvarOcorrencia={nadaAsync} onExcluirOcorrencia={nadaAsync} />);
    },
  },
  'dis-2': {
    montar: async () => CENAS_DP['dis-1'].montar(),
    acoes: async () => {
      await esperar(600);
      await clicar(achar('Registrar medida') ? 'Registrar medida' : 'Nova medida');
      await esperar(600);
    },
  },
  'freq-1': {
    montar: async () => {
      const d = await D();
      const cols = d.colaboradores.filter((c: any) => c.status !== 'Inativo');
      prepararFrequencia(cols);
      const { FrequenciaView } = await import('../../src/components/Frequencia/FrequenciaView');
      return moldura(<FrequenciaView colaboradores={cols} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(1200);
    },
  },
  'freq-2': {
    montar: async () => CENAS_DP['freq-1'].montar(),
    acoes: async () => {
      await esperar(1200);
      await clicar('Espelho do colaborador');
      const sel = document.querySelector('main select, select') as HTMLSelectElement | null;
      const s = Array.from(document.querySelectorAll('select')).find((x) => Array.from(x.options).some((o) => o.textContent?.includes('Escolha o colaborador'))) as HTMLSelectElement | undefined;
      const alvo = s || sel;
      if (alvo) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(alvo, alvo.options[1]?.value || '');
        alvo.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await esperar(800);
    },
  },
  'edu-1': {
    montar: async () => {
      const d = await D();
      const cols = d.colaboradores.filter((c: any) => c.status !== 'Inativo');
      tabelas.treinamentos = [
        { id: 't1', titulo: 'Boas Práticas de Transporte (RDC 430)', carga_horaria_min: 45, conteudos: [{ id: 'a', tipo: 'texto', titulo: 'Introdução', texto: '...' }], prova: { notaMinima: 70, perguntas: [{ id: 'p', enunciado: '?', alternativas: ['a', 'b'], correta: 0 }] }, obrigatorio_todos: true, obrigatorio_cargos: [], obrigatorio_setores: [], validade_meses: 12, prazo_dias: 15, ativo: true, criado_em: iso(-30) },
        { id: 't2', titulo: 'Uso correto de EPI no galpão', carga_horaria_min: 20, conteudos: [{ id: 'a', tipo: 'texto', titulo: 'EPI', texto: '...' }], obrigatorio_todos: true, obrigatorio_cargos: [], obrigatorio_setores: [], prazo_dias: 10, ativo: true, criado_em: iso(-20) },
        { id: 't3', titulo: 'Sistema JMT — Comunicados', carga_horaria_min: 20, conteudos: [{ id: 'a', tipo: 'texto', titulo: 'Para que serve', texto: '...' }], obrigatorio_todos: false, obrigatorio_cargos: ['SUPERVISOR'], obrigatorio_setores: [], ativo: true, criado_em: iso(-5) },
      ];
      tabelas.treinamento_atribuicoes = cols.flatMap((c: any, i: number) => [
        { id: `a1-${i}`, treinamento_id: 't1', colaborador_id: c.id, origem: 'regra', atribuido_em: iso(-30), prazo: dia(-15), status: i % 3 ? 'Concluído' : 'Em andamento', conteudos_vistos: ['a'], tentativas: [], nota: i % 3 ? 80 : null, concluido_em: i % 3 ? iso(-10) : null, valido_ate: i % 3 ? dia(355) : null },
        { id: `a2-${i}`, treinamento_id: 't2', colaborador_id: c.id, origem: 'regra', atribuido_em: iso(-20), prazo: dia(-10), status: i % 2 ? 'Concluído' : 'Pendente', conteudos_vistos: [], tentativas: [], concluido_em: i % 2 ? iso(-12) : null },
      ]);
      tabelas.portal_colaborador = [];
      const { EducacaoView } = await import('../../src/components/Educacao/EducacaoView');
      return moldura(<EducacaoView colaboradores={cols} instrucoes={[]} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(1200);
    },
  },
  'ani-1': {
    montar: async () => {
      const d = await D();
      const { BirthdaysView } = await import('../../src/components/Birthdays/BirthdaysView');
      return moldura(<BirthdaysView colaboradores={d.colaboradores} empregadores={d.empregadores} onSelectColaborador={nada} onNotifySuccess={nada} />);
    },
  },
  'arq-1': {
    montar: async () => {
      const d = await D();
      const inativos = d.colaboradores.map((c: any, i: number) => (i < 3 ? { ...c, status: 'Inativo', dataDemissao: dia(-40 * (i + 1)), motivoDemissao: ['Pedido de demissão', 'Término de contrato de experiência', 'Dispensa sem justa causa'][i] } : c)).filter((c: any) => c.status === 'Inativo');
      const { EmployeeList } = await import('../../src/components/Employees/EmployeeList');
      return moldura(
        <EmployeeList colaboradores={inativos} empregadores={d.empregadores} supervisores={d.supervisores} userRole="admin" temAcessoGeralDp searchQuery="" onSearchChange={nada} onOpenNovo={nada} onSelectColaborador={nada} onEditColaborador={nada} onDeleteColaborador={nada} onOpenDemissaoModal={nada} onOpenProgramarFerias={nada} onOpenRegistrarOcorrencia={nada} />
      );
    },
  },
  'car-1': {
    montar: async () => {
      const d = await D();
      const { SettingsView } = await import('../../src/components/Settings/SettingsView');
      return moldura(<SettingsView empregadores={d.empregadores} cargos={d.cargos} supervisores={d.supervisores} feriados={d.feriados} operacoes={[]} userRole="admin" onAddEmpregador={nada} onAddCargo={nada} onAddSupervisor={nada} onAddFeriado={nada} onSaveOperacao={nada} onDeleteOperacao={nada} />);
    },
  },
};

const CENAS_GESTAO: Record<string, Cena> = {
  'vg-1': {
    montar: async () => {
      const d = await D();
      const { GeneralDashboard } = await import('../../src/components/DashboardGeral/GeneralDashboard');
      return moldura(
        <GeneralDashboard clientes={d.clientes} embarquesAereos={d.embarques} viagensRodoviarias={d.viagens} colaboradores={d.colaboradores} projetos={d.projetos} atividadesGestao={d.atividades} custosOperacionais={d.custos} feriasList={d.ferias} ocorrencias={d.ocorrencias} preAdmissoes={d.preAdmissoes} alertas={[]} userRole="admin" temAcessoGeralDp onNavigateModule={nada} onNavigateSection={nada} onOpenNovoColaborador={nada} onOpenNovaOcorrencia={nada} onOpenAdmissionLink={nada} onOpenNovoCliente={nada} onOpenNovoCustoOperacional={nada} onExportBackup={nada} onImportBackup={nada} onResetDatabase={nada} searchQuery="" onSearchChange={nada} />
      );
    },
  },
  'cli-1': {
    montar: async () => {
      const d = await D();
      const { ClientsView } = await import('../../src/components/Clients/ClientsView');
      return moldura(<ClientsView clientes={d.clientes} onSaveCliente={nada} onDeleteCliente={nada} empregadores={d.empregadores} supervisores={d.supervisores} userRole="admin" />);
    },
  },
  'fa-1': {
    montar: async () => {
      const d = await D();
      const { FarmaAereoView } = await import('../../src/components/FarmaAereo/FarmaAereoView');
      const P: any = FarmaAereoView;
      return moldura(
        <P embarques={d.embarques} onSaveEmbarque={nada} onDeleteEmbarque={nada} clientes={d.clientes} colaboradores={d.colaboradores} custosOperacionais={d.custos} onSaveCliente={nada} onSaveColaborador={nada} onSaveCusto={nada} onDeleteCusto={nada} onOpenNovoCliente={nada} onOpenNovoColaborador={nada} onSelectClienteDetail={nada} onSelectColaboradorDetail={nada} onOpenLinkModal={nada} userRole="admin" currentUser={ADMIN} lancamentosFaturamentoAereo={lancamentosFicticios(d.clientes)} faturasAereo={[]} onImportFaturamentoAereo={nada} onCreateFaturaAereo={nada} onUpdateFaturaAereo={nada} onDeleteFaturaAereo={nada} onUpdateLancamentoFaturamentoAereo={nada} onDeleteLancamentoFaturamentoAereo={nada} operacoesExtras={[]} />
      );
    },
  },
  'fr-1': {
    montar: async () => {
      const d = await D();
      const { FarmaRodoviarioView } = await import('../../src/components/FarmaRodoviario/FarmaRodoviarioView');
      const P: any = FarmaRodoviarioView;
      return moldura(
        <P viagens={d.viagens} onSaveViagem={nada} onDeleteViagem={nada} clientes={d.clientes} colaboradores={d.colaboradores} custosOperacionais={d.custos} onSaveCliente={nada} onSaveColaborador={nada} onSaveCusto={nada} onDeleteCusto={nada} onOpenNovoCliente={nada} onOpenNovoColaborador={nada} onSelectClienteDetail={nada} onSelectColaboradorDetail={nada} onOpenLinkModal={nada} userRole="admin" currentUser={ADMIN} lancamentosFaturamentoAereo={lancamentosFicticios(d.clientes)} faturasAereo={[]} onImportFaturamentoAereo={nada} onCreateFaturaAereo={nada} onUpdateFaturaAereo={nada} onDeleteFaturaAereo={nada} onUpdateLancamentoFaturamentoAereo={nada} onDeleteLancamentoFaturamentoAereo={nada} operacoesExtras={[]} />
      );
    },
  },
  'prj-1': {
    montar: async () => {
      const d = await D();
      const { ProjetosView } = await import('../../src/components/Projetos/ProjetosView');
      return moldura(<ProjetosView projetos={d.projetos} onSaveProjeto={nada} onDeleteProjeto={nada} onUpdateProjetoStatus={nada} supervisores={d.supervisores} colaboradores={d.colaboradores} usuarios={d.usuarios} userRole="admin" />);
    },
  },
  'age-1': {
    montar: async () => {
      const d = await D();
      const { AgendaGestaoView } = await import('../../src/components/Agenda/AgendaGestaoView');
      return moldura(<AgendaGestaoView atividades={d.atividades} supervisores={d.supervisores} colaboradores={d.colaboradores} usuarios={d.usuarios} onSaveAtividade={nada} onDeleteAtividade={nada} onStatusChange={nada} onUpdateDeliberacoes={nada} />);
    },
  },
  'ctl-1': {
    montar: async () => {
      const d = await D();
      const { ControladoriaView } = await import('../../src/components/Controladoria/ControladoriaView');
      return moldura(<ControladoriaView custosOperacionais={d.custos.map((c: any) => ({ ...c, dataCompetencia: '2026-10' }))} colaboradores={d.colaboradores} lancamentosFaturamentoAereo={lancamentosFicticios(d.clientes).map((l) => ({ ...l, dataEmissao: '2026-10-01' }))} projetos={[]} orcamentos={[]} userRole="admin" onSaveOrcamento={nada} />);
    },
  },
  'usr-1': {
    montar: async () => {
      const d = await D();
      const { UsuariosView } = await import('../../src/components/Usuarios/UsuariosView');
      const usuarios = d.usuarios.length ? d.usuarios : [ADMIN];
      return moldura(<UsuariosView users={usuarios} currentUser={usuarios[0]} onSaveUser={nada} onDeleteUser={nada} onSelectUserSession={nada} onToggleUserModuleAccess={nada} onEnviarConvite={nadaAsync} supervisores={d.supervisores} operacoesExtras={[]} />);
    },
  },
};

export const CENAS_MODULOS: Record<string, Cena> = { ...CENAS_DP, ...CENAS_GESTAO };
// evita aviso de import não usado quando nenhuma cena digita
void digitar;
