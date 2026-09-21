import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Package,
  Plus,
  Trash2,
  Download,
  Settings2,
  X,
  Check,
} from 'lucide-react';
import {
  TipoOperacaoDiaria,
  RegistroDiaOperacao,
  FaixaVolumeOperacao,
  ColetaOperacao,
} from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AcompanhamentoOperacionalSectionProps {
  operacaoId: string;
  operacaoNome: string;
  tiposOperacaoDiaria: TipoOperacaoDiaria[];
  registrosDia: RegistroDiaOperacao[];
  faixasVolume: FaixaVolumeOperacao[];
  coletas: ColetaOperacao[];
  onSaveTipo: (t: TipoOperacaoDiaria) => void;
  onDeleteTipo: (id: string) => void;
  onMarcarDia: (registro: RegistroDiaOperacao) => void;
  onDesmarcarDia: (id: string) => void;
  onSaveFaixa: (f: FaixaVolumeOperacao) => void;
  onDeleteFaixa: (id: string) => void;
  onSaveColeta: (c: ColetaOperacao) => void;
  onDeleteColeta: (id: string) => void;
}

function calcularValorPorFaixa(volumes: number, faixas: FaixaVolumeOperacao[]): number {
  const ordenadas = [...faixas].sort((a, b) => a.volumeMin - b.volumeMin);
  const faixa = ordenadas.find(
    (f) => volumes >= f.volumeMin && (f.volumeMax === undefined || volumes <= f.volumeMax)
  );
  return faixa ? faixa.valor : 0;
}

function baixarCSV(nomeArquivo: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [headers.join(';'), ...rows.map((r) => r.map((c) => `"${c}"`).join(';'))].join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Acompanhamento operacional pros dois jeitos de cobrança recorrente encontrados na
 *  prática (ex.: Unimed): "por dia corrido" (Operação CD/Extra — dias marcados × valor
 *  diário) e "por coleta com tabela de faixas de volume" (Operação Interior — cada coleta
 *  cobrada conforme a quantidade de volumes). Gera relatório CSV pra mandar ao parceiro
 *  pra conciliação, mesmo padrão de planilha que já é enviado por e-mail hoje. */
export const AcompanhamentoOperacionalSection: React.FC<AcompanhamentoOperacionalSectionProps> = ({
  operacaoId,
  operacaoNome,
  tiposOperacaoDiaria,
  registrosDia,
  faixasVolume,
  coletas,
  onSaveTipo,
  onDeleteTipo,
  onMarcarDia,
  onDesmarcarDia,
  onSaveFaixa,
  onDeleteFaixa,
  onSaveColeta,
  onDeleteColeta,
}) => {
  const hoje = new Date();
  const [modo, setModo] = useState<'dia' | 'coleta'>('dia');
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
  const [showConfigTipos, setShowConfigTipos] = useState(false);
  const [showConfigFaixas, setShowConfigFaixas] = useState(false);
  const [showNovaColeta, setShowNovaColeta] = useState(false);

  const tiposAtivos = tiposOperacaoDiaria.filter((t) => t.ativo).sort((a, b) => a.ordem - b.ordem);
  const faixasOrdenadas = [...faixasVolume].sort((a, b) => a.volumeMin - b.volumeMin);

  const [ano, mesNum] = mes.split('-').map(Number);
  const diasNoMes = new Date(ano, mesNum, 0).getDate();
  const diasDoMes = Array.from({ length: diasNoMes }, (_, i) => {
    const dia = String(i + 1).padStart(2, '0');
    return `${mes}-${dia}`;
  });

  const registrosPorChave = useMemo(() => {
    const mapa = new Map<string, RegistroDiaOperacao>();
    registrosDia.forEach((r) => mapa.set(`${r.tipoOperacaoId}_${r.data}`, r));
    return mapa;
  }, [registrosDia]);

  const resumoPorDiaTipo = tiposAtivos.map((tipo) => {
    const diasMarcados = diasDoMes.filter((d) => registrosPorChave.has(`${tipo.id}_${d}`));
    return { tipo, quantidade: diasMarcados.length, total: diasMarcados.length * tipo.valorDiario };
  });
  const totalPorDia = resumoPorDiaTipo.reduce((sum, r) => sum + r.total, 0);

  const coletasDoMes = coletas.filter((c) => c.data.startsWith(mes)).sort((a, b) => a.data.localeCompare(b.data));
  const totalColetas = coletasDoMes.reduce((sum, c) => sum + c.valor, 0);

  // Novo Tipo (por dia)
  const [novoTipoNome, setNovoTipoNome] = useState('');
  const [novoTipoValor, setNovoTipoValor] = useState('');

  // Nova Faixa
  const [novaFaixaMin, setNovaFaixaMin] = useState('');
  const [novaFaixaMax, setNovaFaixaMax] = useState('');
  const [novaFaixaValor, setNovaFaixaValor] = useState('');

  // Nova Coleta
  const [coletaData, setColetaData] = useState(`${mes}-01`);
  const [coletaDestinatario, setColetaDestinatario] = useState('');
  const [coletaCidade, setColetaCidade] = useState('');
  const [coletaVolumes, setColetaVolumes] = useState('1');
  const [coletaNF, setColetaNF] = useState('');
  const [coletaObs, setColetaObs] = useState('');

  const parseValor = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0;

  const handleToggleDia = (tipo: TipoOperacaoDiaria, data: string) => {
    const chave = `${tipo.id}_${data}`;
    const existente = registrosPorChave.get(chave);
    if (existente) {
      onDesmarcarDia(existente.id);
    } else {
      onMarcarDia({ id: chave, operacaoId, tipoOperacaoId: tipo.id, data });
    }
  };

  const handleAddTipo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTipoNome.trim()) return;
    onSaveTipo({
      id: `tipo-op-${Date.now()}`,
      operacaoId,
      nome: novoTipoNome.trim(),
      valorDiario: parseValor(novoTipoValor),
      ativo: true,
      ordem: tiposOperacaoDiaria.length,
    });
    setNovoTipoNome('');
    setNovoTipoValor('');
  };

  const handleAddFaixa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaFaixaMin || !novaFaixaValor) return;
    onSaveFaixa({
      id: `faixa-op-${Date.now()}`,
      operacaoId,
      volumeMin: Number(novaFaixaMin),
      volumeMax: novaFaixaMax ? Number(novaFaixaMax) : undefined,
      valor: parseValor(novaFaixaValor),
      ordem: faixasVolume.length,
    });
    setNovaFaixaMin('');
    setNovaFaixaMax('');
    setNovaFaixaValor('');
  };

  const handleAddColeta = (e: React.FormEvent) => {
    e.preventDefault();
    const volumes = Number(coletaVolumes) || 1;
    const valor = calcularValorPorFaixa(volumes, faixasVolume);
    onSaveColeta({
      id: `coleta-op-${Date.now()}`,
      operacaoId,
      data: coletaData,
      destinatario: coletaDestinatario.trim() || undefined,
      cidade: coletaCidade.trim() || undefined,
      quantidadeVolumes: volumes,
      numeroDocumento: coletaNF.trim() || undefined,
      valor,
      observacao: coletaObs.trim() || undefined,
      criadoEm: new Date().toISOString(),
    });
    setColetaDestinatario('');
    setColetaCidade('');
    setColetaVolumes('1');
    setColetaNF('');
    setColetaObs('');
    setShowNovaColeta(false);
  };

  const handleExportDia = () => {
    const rows: (string | number)[][] = [];
    resumoPorDiaTipo.forEach((r) => {
      rows.push([r.tipo.nome, `${r.quantidade} dias × ${formatCurrency(r.tipo.valorDiario)}`, formatCurrency(r.total)]);
    });
    rows.push(['TOTAL', '', formatCurrency(totalPorDia)]);
    baixarCSV(`acompanhamento_diario_${operacaoNome}_${mes}.csv`, ['Tipo de Operação', 'Cálculo', 'Valor'], rows);
  };

  const handleExportColetas = () => {
    const headers = ['DATA COLETA', 'NF/DOCUMENTO', 'PARCEIRO/AGENTE DE ENTREGA', 'DESTINATÁRIO', 'CIDADE', 'CUSTO R$', 'QUANTIDADES VL', 'OBS'];
    const rows = coletasDoMes.map((c) => [
      c.data.split('-').reverse().join('/'),
      c.numeroDocumento || 'N/A',
      'JOBSON',
      c.destinatario || '',
      c.cidade || '',
      formatCurrency(c.valor),
      c.quantidadeVolumes,
      c.observacao || '',
    ]);
    rows.push(['', '', '', '', 'VALOR TOTAL', formatCurrency(totalColetas), '', '']);
    baixarCSV(`coletas_${operacaoNome}_${mes}.csv`, headers, rows);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-xs font-bold text-slate-900">Acompanhamento Operacional</h4>
          <p className="text-[11px] text-slate-500">
            Registre os dias/coletas realizados pra contabilizar sozinho e gerar o relatório pra {operacaoNome}.
          </p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
        />
      </div>

      <div className="flex items-center gap-2 p-3 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setModo('dia')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            modo === 'dia' ? 'bg-[#C48229] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Por Dia Corrido</span>
        </button>
        <button
          type="button"
          onClick={() => setModo('coleta')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            modo === 'coleta' ? 'bg-[#C48229] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Por Coleta / Volume</span>
        </button>
      </div>

      {modo === 'dia' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-slate-700">
              {tiposAtivos.length} tipo{tiposAtivos.length === 1 ? '' : 's'} configurado{tiposAtivos.length === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfigTipos(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"
              >
                <Settings2 className="w-3 h-3" /> Tipos de Operação
              </button>
              <button
                type="button"
                onClick={handleExportDia}
                disabled={tiposAtivos.length === 0}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Relatório CSV
              </button>
            </div>
          </div>

          {tiposAtivos.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Nenhum tipo de operação por dia configurado. Clique em "Tipos de Operação" pra criar (ex.: "Operação CD", R$ 800,00/dia).
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Dia</th>
                      {tiposAtivos.map((t) => (
                        <th key={t.id} className="px-2 py-1.5 text-center whitespace-nowrap">
                          {t.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 max-h-80">
                    {diasDoMes.map((data) => (
                      <tr key={data}>
                        <td className="px-2 py-1 font-mono text-slate-600">{data.split('-')[2]}</td>
                        {tiposAtivos.map((t) => {
                          const marcado = registrosPorChave.has(`${t.id}_${data}`);
                          return (
                            <td key={t.id} className="px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleDia(t, data)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center mx-auto transition-colors ${
                                  marcado
                                    ? 'bg-[#C48229] border-[#C48229] text-white'
                                    : 'bg-white border-slate-300 hover:border-[#C48229]'
                                }`}
                              >
                                {marcado && <Check className="w-3 h-3" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {resumoPorDiaTipo.map((r) => (
                  <div key={r.tipo.id} className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg text-[11px]">
                    <div className="font-bold text-[#5c4526]">{r.tipo.nome}</div>
                    <div className="text-slate-600">
                      {r.quantidade} dias × {formatCurrency(r.tipo.valorDiario)} = <strong>{formatCurrency(r.total)}</strong>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right text-xs font-bold text-slate-800">
                Total do mês: {formatCurrency(totalPorDia)}
              </div>
            </>
          )}
        </div>
      )}

      {modo === 'coleta' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-slate-700">
              {coletasDoMes.length} coleta{coletasDoMes.length === 1 ? '' : 's'} no mês
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfigFaixas(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"
              >
                <Settings2 className="w-3 h-3" /> Tabela de Faixas
              </button>
              <button
                type="button"
                onClick={() => setShowNovaColeta(true)}
                disabled={faixasVolume.length === 0}
                className="px-2.5 py-1.5 bg-[#C48229] hover:bg-[#92611F] disabled:bg-slate-300 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Nova Coleta
              </button>
              <button
                type="button"
                onClick={handleExportColetas}
                disabled={coletasDoMes.length === 0}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Relatório CSV
              </button>
            </div>
          </div>

          {faixasVolume.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Nenhuma faixa de volume configurada. Clique em "Tabela de Faixas" pra criar (ex.: 1-3 volumes = R$ 50,00).
            </div>
          ) : coletasDoMes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Nenhuma coleta registrada neste mês ainda.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Data</th>
                    <th className="px-2 py-1.5 text-left">Destinatário</th>
                    <th className="px-2 py-1.5 text-left">Cidade</th>
                    <th className="px-2 py-1.5 text-center">Volumes</th>
                    <th className="px-2 py-1.5 text-right">Valor</th>
                    <th className="px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coletasDoMes.map((c) => (
                    <tr key={c.id}>
                      <td className="px-2 py-1.5 font-mono">{c.data.split('-').reverse().join('/')}</td>
                      <td className="px-2 py-1.5">{c.destinatario || '—'}</td>
                      <td className="px-2 py-1.5">{c.cidade || '—'}</td>
                      <td className="px-2 py-1.5 text-center">{c.quantidadeVolumes}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{formatCurrency(c.valor)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteColeta(c.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {coletasDoMes.length > 0 && (
            <div className="text-right text-xs font-bold text-slate-800">Total do mês: {formatCurrency(totalColetas)}</div>
          )}
        </div>
      )}

      {/* Modal: Tipos de Operação (por dia) */}
      {showConfigTipos && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tipos de Operação (por dia)</h3>
              <button type="button" onClick={() => setShowConfigTipos(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              {tiposOperacaoDiaria.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">{t.nome}</div>
                    <div className="text-slate-500">{formatCurrency(t.valorDiario)}/dia</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSaveTipo({ ...t, ativo: !t.ativo })}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        t.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {t.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                    <button type="button" onClick={() => onDeleteTipo(t.id)} className="p-1 text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <form onSubmit={handleAddTipo} className="pt-3 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={novoTipoNome}
                    onChange={(e) => setNovoTipoNome(e.target.value)}
                    placeholder="Ex: Operação CD"
                    className="p-2 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={novoTipoValor}
                    onChange={(e) => setNovoTipoValor(e.target.value)}
                    placeholder="Valor/dia (ex: 800,00)"
                    className="p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold">
                  Adicionar Tipo
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tabela de Faixas (por coleta) */}
      {showConfigFaixas && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tabela de Faixas por Volume</h3>
              <button type="button" onClick={() => setShowConfigFaixas(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              {faixasOrdenadas.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">
                    {f.volumeMax ? `${f.volumeMin} a ${f.volumeMax} volumes` : `Acima de ${f.volumeMin} volumes`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#92611F]">{formatCurrency(f.valor)}</span>
                    <button type="button" onClick={() => onDeleteFaixa(f.id)} className="p-1 text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <form onSubmit={handleAddFaixa} className="pt-3 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={novaFaixaMin}
                    onChange={(e) => setNovaFaixaMin(e.target.value)}
                    placeholder="De (vol.)"
                    className="p-2 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    value={novaFaixaMax}
                    onChange={(e) => setNovaFaixaMax(e.target.value)}
                    placeholder="Até (vazio = +)"
                    className="p-2 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={novaFaixaValor}
                    onChange={(e) => setNovaFaixaValor(e.target.value)}
                    placeholder="Valor R$"
                    className="p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold">
                  Adicionar Faixa
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Coleta */}
      {showNovaColeta && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Nova Coleta</h3>
              <button type="button" onClick={() => setShowNovaColeta(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddColeta} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={coletaData}
                    onChange={(e) => setColetaData(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Qtd. Volumes *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={coletaVolumes}
                    onChange={(e) => setColetaVolumes(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Destinatário</label>
                <input
                  type="text"
                  value={coletaDestinatario}
                  onChange={(e) => setColetaDestinatario(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cidade</label>
                <input
                  type="text"
                  value={coletaCidade}
                  onChange={(e) => setColetaCidade(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">NF/Documento</label>
                <input
                  type="text"
                  value={coletaNF}
                  onChange={(e) => setColetaNF(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observação</label>
                <input
                  type="text"
                  value={coletaObs}
                  onChange={(e) => setColetaObs(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-[#5c4526]">
                Valor calculado pela tabela de faixas:{' '}
                <strong>{formatCurrency(calcularValorPorFaixa(Number(coletaVolumes) || 1, faixasVolume))}</strong>
              </div>
              <div className="pt-2 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setShowNovaColeta(false)} className="px-3 py-1.5 text-slate-600 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-lg">
                  Salvar Coleta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
