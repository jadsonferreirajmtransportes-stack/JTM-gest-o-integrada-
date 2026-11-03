import React, { useState } from 'react';
import { Download, Loader2, Paperclip, Plus, Save, Trash2, X } from 'lucide-react';
import { CampoQualidade, COR_SELO, STATUS_ACAO, configQualidade } from '../../data/qualidadeConfig';
import {
  AcaoQualidade,
  AnexoQualidade,
  RegistroQualidade,
  apagarArquivoQualidade,
  diasAte,
  enviarAnexoQualidade,
  excluirRegistroQualidade,
  hojeIso,
  linkAnexoQualidade,
  protocoloQualidade,
  salvarRegistroQualidade,
} from '../../utils/qualidadeApi';

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const campoCls = 'mt-1 w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm';

/** Formulário de um registro da Qualidade (qualquer tipo — campos vêm de qualidadeConfig). */
export const RegistroQualidadeModal: React.FC<{
  registro: RegistroQualidade;
  novo: boolean;
  usuario?: string;
  podeExcluir?: boolean;
  onClose: () => void;
  onSalvo: (r: RegistroQualidade) => void;
  onExcluido: (id: string) => void;
}> = ({ registro, novo, usuario, podeExcluir, onClose, onSalvo, onExcluido }) => {
  const cfg = configQualidade(registro.tipo);
  const [r, setR] = useState<RegistroQualidade>(registro);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [mudou, setMudou] = useState(false);

  const alterar = (p: Partial<RegistroQualidade>) => {
    setR((x) => ({ ...x, ...p }));
    setMudou(true);
  };
  const alterarDado = (chave: string, v: any) => alterar({ dados: { ...r.dados, [chave]: v } });
  const alterarAcao = (id: string, p: Partial<AcaoQualidade>) =>
    alterar({
      acoes: r.acoes.map((a) =>
        a.id === id ? { ...a, ...p, ...(p.status === 'Concluída' && !a.concluidaEm ? { concluidaEm: hojeIso() } : p.status && p.status !== 'Concluída' ? { concluidaEm: undefined } : {}) } : a
      ),
    });

  const fechar = () => {
    if ((mudou || nota.trim()) && !window.confirm("Fechar sem salvar? O que você mudou será perdido.")) return;
    onClose();
  };

  const salvar = async () => {
    setErro(null);
    if (!r.titulo.trim()) return setErro(`Preencha "${cfg.rotuloTitulo}".`);
    const faltando = cfg.campos.find((c) => c.obrigatorio && (r.dados[c.chave] === undefined || r.dados[c.chave] === ''));
    if (faltando) return setErro(`Preencha "${faltando.rotulo}".`);
    const hist = [...r.historico];
    const agora = new Date().toISOString();
    const por = usuario || 'Qualidade';
    if (novo) hist.push({ em: agora, por, texto: 'Registro criado' });
    else if (r.status !== registro.status) hist.push({ em: agora, por, texto: `Situação: ${rotuloStatus(registro.status)} → ${rotuloStatus(r.status)}` });
    else if (mudou) hist.push({ em: agora, por, texto: 'Registro atualizado' });
    if (nota.trim()) hist.push({ em: agora, por, texto: nota.trim() });
    setSalvando(true);
    try {
      const salvo = await salvarRegistroQualidade({ ...r, historico: hist.slice(-200) }, novo);
      onSalvo(salvo);
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!window.confirm(`Excluir ${protocoloQualidade(r)}? Não dá para desfazer.`)) return;
    try {
      await Promise.all(r.anexos.map((a) => apagarArquivoQualidade(a).catch(() => undefined)));
      await excluirRegistroQualidade(r.id);
      onExcluido(r.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível excluir.');
    }
  };

  const anexar = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setEnviando(true);
    setErro(null);
    try {
      const novos: AnexoQualidade[] = [];
      for (const arq of Array.from(lista)) novos.push(await enviarAnexoQualidade(r.id, arq));
      alterar({ anexos: [...r.anexos, ...novos] });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível anexar.');
    } finally {
      setEnviando(false);
    }
  };
  const abrirAnexo = async (a: AnexoQualidade) => {
    try {
      window.open(await linkAnexoQualidade(a), '_blank', 'noopener');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível abrir o anexo.');
    }
  };
  const tirarAnexo = async (a: AnexoQualidade) => {
    if (!window.confirm(`Tirar o anexo "${a.nome}"?`)) return;
    await apagarArquivoQualidade(a).catch(() => undefined);
    alterar({ anexos: r.anexos.filter((x) => x.caminho !== a.caminho) });
  };

  const rotuloStatus = (id: string) => cfg.status.find((s) => s.id === id)?.rotulo || id;
  const statusAtual = cfg.status.find((s) => s.id === r.status);
  const dias = cfg.prazoEhValidade ? diasAte(r.prazo) : undefined;

  const campo = (c: CampoQualidade) => {
    const v = r.dados[c.chave];
    const cheio = c.tipo === 'paragrafo' || c.inteira;
    let entrada: React.ReactNode;
    if (c.tipo === 'paragrafo') entrada = <textarea value={v || ''} onChange={(e) => alterarDado(c.chave, e.target.value)} rows={3} className={campoCls} />;
    else if (c.tipo === 'lista')
      entrada = (
        <select value={v || ''} onChange={(e) => alterarDado(c.chave, e.target.value)} className={campoCls}>
          <option value="">Escolha...</option>
          {(c.opcoes || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    else if (c.tipo === 'simnao')
      entrada = (
        <select value={v === true ? 'sim' : v === false ? 'nao' : ''} onChange={(e) => alterarDado(c.chave, e.target.value === '' ? undefined : e.target.value === 'sim')} className={campoCls}>
          <option value="">—</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      );
    else if (c.tipo === 'numero')
      entrada = <input type="number" step="any" value={v ?? ''} onChange={(e) => alterarDado(c.chave, e.target.value === '' ? undefined : Number(e.target.value))} className={campoCls} />;
    else entrada = <input type={c.tipo === 'data' ? 'date' : 'text'} value={v || ''} onChange={(e) => alterarDado(c.chave, e.target.value)} className={campoCls} />;
    return (
      <label key={c.chave} className={`block ${cheio ? 'sm:col-span-2' : ''}`}>
        <span className="font-bold text-slate-700">
          {c.rotulo} {c.obrigatorio && <span className="text-rose-600">*</span>}
        </span>
        {entrada}
        {c.dica && <span className="block text-[10px] text-slate-500 mt-0.5">{c.dica}</span>}
      </label>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2 sm:p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">
              {cfg.singular} · {novo ? 'novo registro' : protocoloQualidade(r)}
              {r.origem === 'portal' && ` · relatado pelo portal${r.colaboradorNome ? ` por ${r.colaboradorNome}` : ''}`}
            </p>
            <h2 className="text-base font-black text-slate-900 normal-case truncate">{r.titulo || (novo ? `Novo: ${cfg.singular.toLowerCase()}` : '—')}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select value={r.status} onChange={(e) => alterar({ status: e.target.value })} className={`py-1 px-2 rounded-lg border text-[11px] font-bold ${statusAtual ? COR_SELO[statusAtual.cor] : ''}`}>
              {cfg.status.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rotulo}
                </option>
              ))}
            </select>
            <button type="button" onClick={fechar} className="p-1 text-slate-400 hover:text-slate-700" title="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <section className="grid sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="font-bold text-slate-700">
                {cfg.rotuloTitulo} <span className="text-rose-600">*</span>
              </span>
              <input value={r.titulo} onChange={(e) => alterar({ titulo: e.target.value })} maxLength={160} className={campoCls} />
            </label>
            <label className="block">
              <span className="font-bold text-slate-700">{cfg.rotuloData}</span>
              <input type="date" value={r.data || ''} onChange={(e) => alterar({ data: e.target.value || undefined })} className={campoCls} />
            </label>
            {cfg.rotuloPrazo && (
              <label className="block">
                <span className="font-bold text-slate-700">{cfg.rotuloPrazo}</span>
                <input type="date" value={r.prazo || ''} onChange={(e) => alterar({ prazo: e.target.value || undefined })} className={campoCls} />
                {dias !== undefined && (
                  <span className={`block text-[10px] font-bold mt-0.5 ${dias < 0 ? 'text-rose-600' : dias <= 30 ? 'text-[#92611F]' : 'text-emerald-700'}`}>
                    {dias < 0 ? `Vencido há ${-dias} dia(s)` : dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia(s)`}
                  </span>
                )}
              </label>
            )}
            <label className="block">
              <span className="font-bold text-slate-700">Responsável</span>
              <input value={r.responsavel || ''} onChange={(e) => alterar({ responsavel: e.target.value })} maxLength={120} className={campoCls} />
            </label>
          </section>

          <section className="grid sm:grid-cols-2 gap-3">{cfg.campos.map(campo)}</section>

          {cfg.acoes && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 normal-case">{cfg.acoes.titulo}</h3>
                <button
                  type="button"
                  onClick={() =>
                    alterar({
                      acoes: [...r.acoes, { id: `ac-${Date.now()}`, tipo: cfg.acoes!.tipos[0], descricao: '', status: 'Pendente' }],
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-[#C48229] text-[#92611F] font-bold flex items-center gap-1 hover:bg-amber-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {r.acoes.length === 0 && <p className="text-slate-400">Nenhuma ação registrada.</p>}
              {r.acoes.map((a) => {
                const atrasada = (a.status === 'Pendente' || a.status === 'Em andamento') && a.prazo && a.prazo < hojeIso();
                return (
                  <div key={a.id} className={`p-3 rounded-xl border space-y-2 ${atrasada ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <select value={a.tipo} onChange={(e) => alterarAcao(a.id, { tipo: e.target.value })} className="p-2 border border-slate-300 rounded-lg bg-white">
                        {cfg.acoes!.tipos.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <input value={a.responsavel || ''} onChange={(e) => alterarAcao(a.id, { responsavel: e.target.value })} placeholder="Responsável" className="p-2 border border-slate-300 rounded-lg bg-white" />
                      <input type="date" value={a.prazo || ''} onChange={(e) => alterarAcao(a.id, { prazo: e.target.value || undefined })} title="Prazo" className="p-2 border border-slate-300 rounded-lg bg-white" />
                      <select value={a.status} onChange={(e) => alterarAcao(a.id, { status: e.target.value as AcaoQualidade['status'] })} className="p-2 border border-slate-300 rounded-lg bg-white font-bold">
                        {STATUS_ACAO.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <textarea value={a.descricao} onChange={(e) => alterarAcao(a.id, { descricao: e.target.value })} rows={2} placeholder="O que será feito" className="w-full p-2 border border-slate-300 rounded-lg bg-white" />
                    <div className="flex items-center gap-2">
                      <input value={a.evidencia || ''} onChange={(e) => alterarAcao(a.id, { evidencia: e.target.value })} placeholder="Evidência (o que comprova que foi feito)" className="flex-1 p-2 border border-slate-300 rounded-lg bg-white" />
                      {atrasada && <span className="text-[10px] font-black text-rose-600">ATRASADA</span>}
                      {a.concluidaEm && <span className="text-[10px] text-emerald-700 font-bold">Concluída em {dataBr(a.concluidaEm)}</span>}
                      <button type="button" onClick={() => alterar({ acoes: r.acoes.filter((x) => x.id !== a.id) })} className="p-1.5 text-slate-400 hover:text-rose-600" title="Tirar ação">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-black text-slate-900 normal-case">Anexos</h3>
            <div className="flex flex-wrap gap-2">
              {r.anexos.map((a) => (
                <span key={a.caminho} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border border-slate-200 bg-slate-50">
                  <button type="button" onClick={() => abrirAnexo(a)} className="flex items-center gap-1 font-semibold text-slate-700 hover:text-[#92611F] normal-case">
                    <Download className="w-3.5 h-3.5" /> {a.nome}
                  </button>
                  <button type="button" onClick={() => tirarAnexo(a)} className="p-0.5 text-slate-400 hover:text-rose-600" title="Tirar">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 text-slate-600 font-bold cursor-pointer hover:bg-amber-50">
                {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                Anexar (certificado, laudo, foto, relatório)
                <input type="file" multiple className="hidden" onChange={(e) => anexar(e.target.files)} disabled={enviando} />
              </label>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black text-slate-900 normal-case">Histórico</h3>
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} placeholder="Acrescentar uma anotação ao histórico (opcional)" className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm" />
            {r.historico.length > 0 && (
              <ul className="space-y-1">
                {[...r.historico].reverse().map((h, i) => (
                  <li key={i} className="text-slate-600">
                    <span className="text-slate-400">{dataHora(h.em)} · {h.por}:</span> {h.texto}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center gap-2">
          {!novo && podeExcluir && (
            <button type="button" onClick={excluir} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5 hover:bg-rose-50">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          )}
          {erro && <p className="text-rose-700 font-semibold flex-1">{erro}</p>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={fechar} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
              Cancelar
            </button>
            <button type="button" onClick={salvar} disabled={salvando || enviando} className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
