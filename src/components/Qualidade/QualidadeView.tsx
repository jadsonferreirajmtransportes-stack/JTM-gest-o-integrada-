import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  MessageSquareWarning,
  Plus,
  Search,
  ShieldCheck,
  Thermometer,
} from 'lucide-react';
import type { UsuarioLogin } from '../../types';
import { CONFIG_QUALIDADE, COR_SELO, TipoQualidade, configQualidade } from '../../data/qualidadeConfig';
import { RegistroQualidade, acoesAtrasadas, diasAte, emAberto, getRegistrosQualidade, protocoloQualidade, registroNovo } from '../../utils/qualidadeApi';
import { AcoesTela } from '../Common/AcoesTela';
import { RegistroQualidadeModal } from './RegistroQualidadeModal';

type Aba = 'painel' | TipoQualidade;

const ICONES: Record<Aba, React.ElementType> = {
  painel: LayoutDashboard,
  desvio: AlertTriangle,
  excursao: Thermometer,
  qualificacao: BadgeCheck,
  fornecedor: Building2,
  reclamacao: MessageSquareWarning,
  auditoria: ClipboardCheck,
};

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const valorTexto = (v: any) => (v === true ? 'Sim' : v === false ? 'Não' : v === undefined || v === null ? '' : String(v));

const Selo: React.FC<{ r: RegistroQualidade }> = ({ r }) => {
  const s = configQualidade(r.tipo).status.find((x) => x.id === r.status);
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${s ? COR_SELO[s.cor] : COR_SELO.cinza}`}>{s?.rotulo || r.status}</span>;
};

/** Selo de validade (qualificações e fornecedores). */
const Validade: React.FC<{ prazo?: string }> = ({ prazo }) => {
  const d = diasAte(prazo);
  if (d === undefined) return <span className="text-slate-400">—</span>;
  const cls = d < 0 ? 'text-rose-700 font-black' : d <= 30 ? 'text-[#92611F] font-black' : 'text-slate-700';
  return (
    <span className={cls}>
      {dataBr(prazo)}
      {d < 0 ? ' · vencido' : d <= 30 ? ` · ${d}d` : ''}
    </span>
  );
};

/** Módulo Qualidade (área farmacêutica — RDC 430/2020). */
export const QualidadeView: React.FC<{ currentUser?: UsuarioLogin | null }> = ({ currentUser }) => {
  const [lista, setLista] = useState<RegistroQualidade[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>(() => {
    try {
      return (sessionStorage.getItem('jmt_qualidade_aba') as Aba) || 'painel';
    } catch {
      return 'painel';
    }
  });
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'abertos' | 'todos' | string>('abertos');
  const [aberto, setAberto] = useState<{ r: RegistroQualidade; novo: boolean } | null>(null);
  const admin = currentUser?.role === 'admin';

  useEffect(() => {
    getRegistrosQualidade()
      .then(setLista)
      .catch((e) => {
        console.error(e);
        setErro('Não foi possível carregar a Qualidade. Rode a migração 092 no Supabase, se ainda não rodou.');
        setLista([]);
      });
  }, []);

  const irPara = (a: Aba) => {
    setAba(a);
    setFiltro('abertos');
    setBusca('');
    try {
      sessionStorage.setItem('jmt_qualidade_aba', a);
    } catch {
      /* sem armazenamento */
    }
  };

  const novo = (tipo: TipoQualidade) => setAberto({ r: registroNovo(tipo, currentUser?.nome), novo: true });

  const doTipo = (t: TipoQualidade) => (lista || []).filter((r) => r.tipo === t);

  const filtrados = useMemo(() => {
    if (aba === 'painel') return [];
    const q = busca.trim().toLowerCase();
    return doTipo(aba)
      .filter((r) => (filtro === 'todos' ? true : filtro === 'abertos' ? emAberto(r) : r.status === filtro))
      .filter((r) => !q || [protocoloQualidade(r), r.titulo, r.responsavel, r.colaboradorNome, ...Object.values(r.dados).map(valorTexto)].join(' ').toLowerCase().includes(q))
      .sort((a, b) =>
        configQualidade(aba).prazoEhValidade ? (a.prazo || '9999').localeCompare(b.prazo || '9999') : (b.data || b.criadoEm).localeCompare(a.data || a.criadoEm)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, aba, busca, filtro]);

  const exportarExcel = async () => {
    if (aba === 'painel') return;
    const cfg = configQualidade(aba);
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(cfg.aba.slice(0, 30));
    const colunas = ['Nº', cfg.rotuloTitulo, 'Situação', cfg.rotuloData, ...(cfg.rotuloPrazo ? [cfg.rotuloPrazo] : []), 'Responsável', ...cfg.campos.map((c) => c.rotulo), ...(cfg.acoes ? ['Ações pendentes'] : [])];
    ws.addRow(colunas);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92611F' } };
    filtrados.forEach((r) =>
      ws.addRow([
        protocoloQualidade(r),
        r.titulo,
        cfg.status.find((s) => s.id === r.status)?.rotulo || r.status,
        dataBr(r.data),
        ...(cfg.rotuloPrazo ? [dataBr(r.prazo)] : []),
        r.responsavel || '',
        ...cfg.campos.map((c) => (c.tipo === 'data' ? dataBr(r.dados[c.chave]) : valorTexto(r.dados[c.chave]))),
        ...(cfg.acoes ? [r.acoes.filter((a) => a.status === 'Pendente' || a.status === 'Em andamento').length] : []),
      ])
    );
    ws.columns.forEach((c, i) => (c.width = i === 1 ? 40 : 18));
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `Qualidade_${cfg.aba.replace(/[^\p{L}\p{N}]+/gu, '_')}_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---- Painel ----
  const painel = () => {
    const todos = lista || [];
    const desviosAbertos = doTipo('desvio').filter(emAberto);
    const criticos = desviosAbertos.filter((r) => r.dados.classificacao === 'Crítico');
    const relatosNovos = doTipo('desvio').filter((r) => r.origem === 'portal' && r.status === 'aberto');
    const excursoes = doTipo('excursao').filter(emAberto);
    const atrasadas = todos.filter(emAberto).flatMap((r) => acoesAtrasadas(r).map((a) => ({ r, a })));
    const validades = [...doTipo('qualificacao'), ...doTipo('fornecedor')]
      .filter((r) => emAberto(r) && r.status !== 'reprovado')
      .map((r) => ({ r, d: diasAte(r.prazo) }))
      .filter((x) => x.d !== undefined && x.d <= 30)
      .sort((a, b) => a.d! - b.d!);
    const reclamacoes = doTipo('reclamacao').filter(emAberto);
    const prazosVencidos = todos.filter((r) => emAberto(r) && !configQualidade(r.tipo).prazoEhValidade && r.prazo && r.prazo < new Date().toLocaleDateString('sv-SE'));
    const fornecedoresEmQualif = doTipo('fornecedor').filter((r) => r.status === 'qualificacao');

    const cartao = (titulo: string, n: number, detalhe: string, alvo: Aba, alerta?: boolean) => {
      const Icone = ICONES[alvo];
      return (
        <button
          key={titulo}
          type="button"
          onClick={() => irPara(alvo)}
          className={`text-left bg-white rounded-2xl border p-4 shadow-xs hover:border-[#C48229] normal-case tracking-normal ${alerta && n > 0 ? 'border-rose-200' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">{titulo}</span>
            <Icone className={`w-4 h-4 ${alerta && n > 0 ? 'text-rose-600' : 'text-[#C48229]'}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${alerta && n > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{n}</p>
          <p className="text-[11px] text-slate-500">{detalhe}</p>
        </button>
      );
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cartao('Desvios em aberto', desviosAbertos.length, criticos.length ? `${criticos.length} crítico(s)` : 'nenhum crítico', 'desvio', criticos.length > 0)}
          {cartao('Relatos novos do portal', relatosNovos.length, 'enviados pelos colaboradores', 'desvio', relatosNovos.length > 0)}
          {cartao('Excursões de temperatura', excursoes.length, 'em aberto', 'excursao', excursoes.length > 0)}
          {cartao('Ações (CAPA) atrasadas', atrasadas.length, 'com prazo vencido', 'desvio', true)}
          {cartao('Vencidos ou a vencer (30 dias)', validades.length, 'qualificações e fornecedores', 'qualificacao', validades.some((x) => x.d! < 0))}
          {cartao('Fornecedores em qualificação', fornecedoresEmQualif.length, `${doTipo('fornecedor').filter((r) => r.status === 'qualificado' || r.status === 'restricao').length} qualificado(s)`, 'fornecedor')}
          {cartao('Reclamações em aberto', reclamacoes.length, 'de clientes', 'reclamacao', reclamacoes.some((r) => r.prazo && r.prazo < new Date().toLocaleDateString('sv-SE')))}
          {cartao('Auditorias', doTipo('auditoria').filter(emAberto).length, 'planejadas ou com achados em aberto', 'auditoria')}
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-black text-slate-900 normal-case">Atenção agora</h3>
            {atrasadas.length === 0 && prazosVencidos.length === 0 && relatosNovos.length === 0 && <p className="text-xs text-slate-400">Nada atrasado. 👏</p>}
            {relatosNovos.slice(0, 6).map((r) => (
              <button key={r.id} type="button" onClick={() => setAberto({ r, novo: false })} className="w-full text-left text-xs p-2 rounded-lg hover:bg-amber-50 normal-case tracking-normal">
                <span className="font-black text-[#92611F]">Relato novo</span> · {protocoloQualidade(r)} · {r.dados.categoria || r.titulo}
              </button>
            ))}
            {atrasadas.slice(0, 8).map(({ r, a }) => (
              <button key={r.id + a.id} type="button" onClick={() => setAberto({ r, novo: false })} className="w-full text-left text-xs p-2 rounded-lg hover:bg-rose-50 normal-case tracking-normal">
                <span className="font-black text-rose-700">Ação atrasada</span> · {protocoloQualidade(r)} · {a.descricao || a.tipo} {a.responsavel ? `(${a.responsavel})` : ''} — prazo {dataBr(a.prazo)}
              </button>
            ))}
            {prazosVencidos.slice(0, 8).map((r) => (
              <button key={r.id} type="button" onClick={() => setAberto({ r, novo: false })} className="w-full text-left text-xs p-2 rounded-lg hover:bg-rose-50 normal-case tracking-normal">
                <span className="font-black text-rose-700">Prazo vencido</span> · {protocoloQualidade(r)} · {r.titulo} — {dataBr(r.prazo)}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-black text-slate-900 normal-case">Vencimentos (qualificações, calibrações, licenças e fornecedores)</h3>
            {validades.length === 0 && <p className="text-xs text-slate-400">Nada vencido nem vencendo nos próximos 30 dias.</p>}
            {validades.slice(0, 12).map(({ r, d }) => (
              <button key={r.id} type="button" onClick={() => setAberto({ r, novo: false })} className="w-full text-left text-xs p-2 rounded-lg hover:bg-amber-50 flex justify-between gap-2 normal-case tracking-normal">
                <span className="min-w-0 truncate">
                  {r.titulo} <span className="text-slate-400">· {r.dados.categoria || configQualidade(r.tipo).singular}</span>
                </span>
                <span className={`shrink-0 font-black ${d! < 0 ? 'text-rose-700' : 'text-[#92611F]'}`}>{d! < 0 ? `vencido há ${-d!}d` : d === 0 ? 'vence hoje' : `${d}d`}</span>
              </button>
            ))}
          </div>
        </div>
        {todos.length === 0 && !erro && (
          <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
            Comece cadastrando os fornecedores e as qualificações/licenças com validade — o painel passa a avisar os vencimentos. Os colaboradores já podem relatar ocorrências pelo link pessoal (Mais → Relatar ocorrência).
          </p>
        )}
      </div>
    );
  };

  // ---- Lista de um tipo ----
  const listaTipo = (tipo: TipoQualidade) => {
    const cfg = configQualidade(tipo);
    const colunas = cfg.campos.filter((c) => c.naLista);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-full bg-white" />
          </div>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="py-2 px-2 border border-slate-200 rounded-lg text-xs bg-white">
            <option value="abertos">Em aberto</option>
            <option value="todos">Todos</option>
            {cfg.status.map((s) => (
              <option key={s.id} value={s.id}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-slate-500">{cfg.descricao}</p>
        {filtrados.length === 0 ? (
          <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Nenhum registro {filtro === 'abertos' ? 'em aberto' : 'encontrado'}.</p>
        ) : (
          <div className="envelope-cartoes bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="tabela-cartoes w-full text-xs min-w-[760px]">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3">{cfg.rotuloTitulo.split(' (')[0]}</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3">{cfg.prazoEhValidade ? cfg.rotuloPrazo : cfg.rotuloData}</th>
                  {colunas.map((c) => (
                    <th key={c.chave} className="p-3">
                      {c.rotulo}
                    </th>
                  ))}
                  {cfg.acoes && <th className="p-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => {
                  const pend = r.acoes.filter((a) => a.status === 'Pendente' || a.status === 'Em andamento').length;
                  const atr = acoesAtrasadas(r).length;
                  return (
                    <tr key={r.id} onClick={() => setAberto({ r, novo: false })} className="border-t border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                      <td className="p-3 cartao-titulo">
                        <p className="text-[10px] font-black text-[#92611F]">
                          {protocoloQualidade(r)}
                          {r.origem === 'portal' && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-[#92611F]">portal</span>}
                        </p>
                        <p className="font-bold text-slate-900">{r.titulo}</p>
                        {r.responsavel && <p className="text-[11px] text-slate-500">Resp.: {r.responsavel}</p>}
                      </td>
                      <td className="p-3" data-label="Situação">
                        <Selo r={r} />
                      </td>
                      <td className="p-3" data-label={cfg.prazoEhValidade ? cfg.rotuloPrazo : cfg.rotuloData}>
                        {cfg.prazoEhValidade ? <Validade prazo={r.prazo} /> : dataBr(r.data)}
                      </td>
                      {colunas.map((c) => (
                        <td key={c.chave} className="p-3" data-label={c.rotulo}>
                          {valorTexto(r.dados[c.chave])}
                        </td>
                      ))}
                      {cfg.acoes && (
                        <td className="p-3" data-label="Ações">
                          {r.acoes.length === 0 ? '—' : `${pend} pendente(s)`}
                          {atr > 0 && <span className="ml-1 font-black text-rose-700">· {atr} atrasada(s)</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const abas: { id: Aba; rotulo: string; n?: number }[] = [
    { id: 'painel', rotulo: 'Painel' },
    ...CONFIG_QUALIDADE.map((c) => ({ id: c.tipo as Aba, rotulo: c.aba, n: doTipo(c.tipo).filter(emAberto).length })),
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hidden lg:flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Qualidade</h1>
            <p className="text-xs text-slate-500">Boas Práticas de Armazenagem, Distribuição e Transporte (RDC 430/2020)</p>
          </div>
        </div>
      </div>
      <AcoesTela
        principal={
          aba !== 'painel' ? (
            <button type="button" onClick={() => novo(aba)} className="px-4 py-2 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-xs font-bold flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Novo: {configQualidade(aba).singular.toLowerCase()}
            </button>
          ) : undefined
        }
      >
        {aba !== 'painel' && (
          <button type="button" onClick={exportarExcel} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Excel
          </button>
        )}
      </AcoesTela>

      <div className="flex gap-1.5 overflow-x-auto sem-barra">
        {abas.map((a) => {
          const Icone = ICONES[a.id];
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => irPara(a.id)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 normal-case tracking-normal ${aba === a.id ? 'bg-[#C48229] border-[#C48229] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-[#C48229]'}`}
            >
              <Icone className="w-4 h-4" /> {a.rotulo}
              {!!a.n && <span className={`px-1.5 rounded-full text-[10px] ${aba === a.id ? 'bg-white/25' : 'bg-amber-100 text-[#92611F]'}`}>{a.n}</span>}
            </button>
          );
        })}
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {lista === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : aba === 'painel' ? (
        painel()
      ) : (
        listaTipo(aba)
      )}

      {aberto && (
        <RegistroQualidadeModal
          key={aberto.r.id}
          registro={aberto.r}
          novo={aberto.novo}
          usuario={currentUser?.nome}
          podeExcluir={admin}
          onClose={() => setAberto(null)}
          onSalvo={(salvo) => {
            setLista((p) => (aberto.novo ? [salvo, ...(p || [])] : (p || []).map((x) => (x.id === salvo.id ? salvo : x))));
            setAberto(null);
          }}
          onExcluido={(id) => {
            setLista((p) => (p || []).filter((x) => x.id !== id));
            setAberto(null);
          }}
        />
      )}
    </div>
  );
};

export default QualidadeView;
