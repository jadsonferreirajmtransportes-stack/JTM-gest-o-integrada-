import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, FileSpreadsheet, Link2, Loader2, MessageCircle, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { DocumentoPadronizado } from '../../utils/documentosPadronizadosApi';
import {
  CONFIG_PADRAO,
  ConfigCiencia,
  LinkCiencia,
  PerguntaCiencia,
  RespostaCiencia,
  getLinkCiencia,
  getRespostasCiencia,
  novaPerguntaCiencia,
  salvarLinkCiencia,
  urlCiencia,
} from '../../utils/cienciaLinkApi';

const mascararCpf = (cpf: string) => (cpf.length === 11 ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : '***');

/** Ciência por link (pessoas de fora do sistema): perguntas com resposta certa, o link para
 *  mandar pelo WhatsApp e a lista de quem já confirmou. */
export const CienciaLinkModal: React.FC<{ documento: DocumentoPadronizado; usuario?: string; onClose: () => void }> = ({ documento, usuario, onClose }) => {
  const [link, setLink] = useState<LinkCiencia | null | undefined>(undefined);
  const [perguntas, setPerguntas] = useState<PerguntaCiencia[]>([]);
  const [config, setConfig] = useState<ConfigCiencia>(CONFIG_PADRAO);
  const [respostas, setRespostas] = useState<RespostaCiencia[]>([]);
  const [aba, setAba] = useState<'perguntas' | 'quem'>('perguntas');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    getLinkCiencia(documento.id)
      .then((l) => {
        setLink(l);
        setPerguntas(l?.perguntas.length ? l.perguntas : [novaPerguntaCiencia()]);
        if (l) setConfig(l.config);
        if (l) {
          setAba('quem');
          getRespostasCiencia(l.id).then(setRespostas).catch(() => undefined);
        }
      })
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível abrir.');
        setLink(null);
      });
  }, [documento.id]);

  const problema = (): string | null => {
    if (!config.questionario) return null;
    for (const [i, p] of perguntas.entries()) {
      if (!p.texto.trim()) return `Escreva a pergunta ${i + 1}.`;
      const opcoes = p.opcoes.map((o) => o.trim());
      if (opcoes.filter(Boolean).length < 2 || opcoes.some((o) => !o)) return `Pergunta ${i + 1}: preencha todas as opções (pelo menos 2).`;
      if (p.correta < 0 || p.correta >= opcoes.length) return `Pergunta ${i + 1}: marque a resposta certa.`;
    }
    return null;
  };

  const salvar = async (opcoes: { atualizarDocumento?: boolean; ativo?: boolean } = {}) => {
    const p = problema();
    if (p) return setErro(p);
    setSalvando(true);
    setErro(null);
    try {
      const limpas = perguntas.map((q) => ({ ...q, texto: q.texto.trim(), opcoes: q.opcoes.map((o) => o.trim()), explicacao: q.explicacao?.trim() || undefined }));
      const salvo = await salvarLinkCiencia(documento, config.questionario ? limpas : perguntas, config, link || null, { ...opcoes, por: usuario });
      setLink(salvo);
      setPerguntas(salvo.perguntas);
      setAviso(!link ? 'Link criado. Copie ou mande pelo WhatsApp.' : opcoes.atualizarDocumento ? 'O link agora mostra a versão atual do documento.' : opcoes.ativo === false ? 'Link desativado.' : opcoes.ativo ? 'Link reativado.' : 'Configuração salva.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const url = link ? urlCiencia(link.token) : '';
  const textoWhats = `Olá! Leia o "${documento.titulo}" da JM Transportes e confirme que está ciente (leva poucos minutos): ${url}`;
  const copiar = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      setAviso('Copiado!');
    } catch {
      window.prompt('Copie:', t);
    }
  };

  const baixarExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ciência');
    ws.addRow(['Nome', 'CPF', 'Telefone', 'Ciente em', 'Tentativas no questionário', 'Versão do documento', 'Assinou', 'Leu até o fim']);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92611F' } };
    respostas.forEach((r) => ws.addRow([r.nome, r.cpf, r.telefone || '', new Date(r.cienteEm).toLocaleString('pt-BR'), r.totalPerguntas ? r.tentativas : '', r.versao ?? '', r.assinatura ? 'Sim' : '', r.leuAteFim ? 'Sim' : '']));
    ws.columns.forEach((c, i) => (c.width = [36, 16, 18, 20, 14, 12][i] || 14));
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `Ciencia_${documento.codigo || 'documento'}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const mudar = (i: number, p: Partial<PerguntaCiencia>) => setPerguntas((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const campo = 'w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col text-xs" onClick={(e) => e.stopPropagation()} data-texto-livre="true">
        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 normal-case tracking-normal flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-[#C48229]" /> Ciência por link (pessoas de fora)
            </h3>
            <p className="text-slate-500">Um link só: a pessoa lê "{documento.titulo}" no celular, responde o questionário e confirma com nome, CPF e telefone.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {link === undefined ? (
          <p className="p-6 flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" /> Carregando...
          </p>
        ) : (
          <>
            {link && (
              <div className="p-4 border-b border-slate-100 space-y-2 bg-[#FCFAF6]">
                <div className="flex items-center gap-2">
                  <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-white text-[11px]" />
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${link.ativo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-300'}`}>
                    {link.ativo ? 'Ativo' : 'Desativado'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(textoWhats)}`, 'jmt-whatsapp')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button type="button" onClick={() => copiar(url)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copiar link
                  </button>
                  <button type="button" onClick={() => window.open(url, '_blank')} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold">
                    Ver como o motorista vê
                  </button>
                  {link.versao !== documento.versao || JSON.stringify(link.documento.blocos) !== JSON.stringify(documento.blocos) ? (
                    <button type="button" disabled={salvando} onClick={() => salvar({ atualizarDocumento: true })} className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-[#92611F] font-bold flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Atualizar o documento do link
                    </button>
                  ) : null}
                  <button type="button" disabled={salvando} onClick={() => salvar({ ativo: !link.ativo })} className={`px-3 py-1.5 rounded-lg border font-bold ${link.ativo ? 'border-rose-200 text-rose-700' : 'border-emerald-200 text-emerald-700'}`}>
                    {link.ativo ? 'Desativar link' : 'Reativar link'}
                  </button>
                </div>
              </div>
            )}

            {link && (
              <div className="px-4 pt-3 flex gap-1">
                {(
                  [
                    ['quem', `Quem confirmou (${respostas.length})`],
                    ['perguntas', 'Como declarar ciência'],
                  ] as const
                ).map(([id, rot]) => (
                  <button key={id} type="button" onClick={() => setAba(id)} className={`px-3 py-1.5 rounded-lg font-bold normal-case tracking-normal ${aba === id ? 'bg-[#C48229] text-white' : 'text-slate-600'}`}>
                    {rot}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {link && aba === 'quem' ? (
                respostas.length === 0 ? (
                  <p className="text-slate-500">Ninguém confirmou ainda.</p>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <button type="button" onClick={baixarExcel} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> Baixar lista (Excel)
                      </button>
                    </div>
                    <table className="w-full">
                      <thead className="text-left text-slate-500 bg-slate-50">
                        <tr>
                          <th className="p-2">Nome</th>
                          <th className="p-2">CPF</th>
                          <th className="p-2">Telefone</th>
                          <th className="p-2">Ciente em</th>
                          <th className="p-2 text-center">Tentativas</th>
                          <th className="p-2">Assinatura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {respostas.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="p-2 font-semibold text-slate-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                              {r.nome}
                            </td>
                            <td className="p-2 text-slate-500">{mascararCpf(r.cpf)}</td>
                            <td className="p-2 text-slate-500">{r.telefone || '—'}</td>
                            <td className="p-2 text-slate-500">
                              {new Date(r.cienteEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                              {r.versao && r.versao !== link.versao ? <span className="block text-[10px] text-amber-700">versão {r.versao}</span> : null}
                            </td>
                            <td className="p-2 text-center">
                              {r.totalPerguntas ? r.tentativas : '—'}
                              {r.leuAteFim ? <span className="block text-[10px] text-emerald-700">leu até o fim</span> : null}
                            </td>
                            <td className="p-2">{r.assinatura ? <img src={r.assinatura} alt="Assinatura" className="h-8 max-w-[110px] object-contain bg-white border border-slate-200 rounded" /> : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )
              ) : (
                <>
                  <div className="border border-amber-200 bg-[#FCFAF6] rounded-xl p-3 space-y-2">
                    <p className="font-black text-slate-800">Como a pessoa declara a ciência</p>
                    <p className="text-[11px] text-slate-500">Sempre: nome completo, CPF e a caixa "Li e estou ciente". Some as formas abaixo (pode marcar várias):</p>
                    {(
                      [
                        ['questionario', 'Questionário', 'Perguntas com resposta certa; se errar, vê a explicação e refaz.'],
                        ['assinatura', 'Assinatura no celular', 'Assina com o dedo na tela; a assinatura fica guardada no registro.'],
                        ['leituraCompleta', 'Leitura até o fim', 'Só libera o "continuar" depois de rolar o documento inteiro.'],
                        ['pedirTelefone', 'Pedir telefone (WhatsApp)', 'Guarda o telefone junto com a confirmação.'],
                      ] as [keyof ConfigCiencia, string, string][]
                    ).map(([k, rot, desc]) => (
                      <label key={k} className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={config[k]} onChange={(e) => setConfig((c) => ({ ...c, [k]: e.target.checked }))} className="mt-0.5" />
                        <span>
                          <b className="text-slate-800">{rot}</b>
                          <span className="block text-[11px] text-slate-500">{desc}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {config.questionario && <p className="text-slate-500">Marque a resposta certa de cada pergunta. Se a pessoa errar, ela vê a explicação e precisa acertar todas antes de confirmar.</p>}
                  {config.questionario && perguntas.map((p, i) => (
                    <div key={p.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-black text-[#92611F] pt-1.5">{i + 1}.</span>
                        <input value={p.texto} onChange={(e) => mudar(i, { texto: e.target.value })} placeholder="Pergunta (ex.: Quando a baixa deve ser feita?)" className={campo} />
                        <button type="button" onClick={() => setPerguntas((l) => l.filter((_, k) => k !== i))} className="p-1.5 text-slate-400 hover:text-rose-600" title="Tirar pergunta">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {p.opcoes.map((o, k) => (
                        <div key={k} className="flex items-center gap-2 pl-5">
                          <input type="radio" name={`certa-${p.id}`} checked={p.correta === k} onChange={() => mudar(i, { correta: k })} title="Resposta certa" />
                          <input value={o} onChange={(e) => mudar(i, { opcoes: p.opcoes.map((x, j) => (j === k ? e.target.value : x)) })} placeholder={`Opção ${k + 1}`} className={`${campo} ${p.correta === k ? 'border-emerald-300 bg-emerald-50/40' : ''}`} />
                          {p.opcoes.length > 2 && (
                            <button
                              type="button"
                              onClick={() => mudar(i, { opcoes: p.opcoes.filter((_, j) => j !== k), correta: p.correta === k ? 0 : p.correta > k ? p.correta - 1 : p.correta })}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="pl-5 flex flex-wrap items-center gap-2">
                        {p.opcoes.length < 5 && (
                          <button type="button" onClick={() => mudar(i, { opcoes: [...p.opcoes, ''] })} className="text-[11px] font-bold text-[#92611F]">
                            + Opção
                          </button>
                        )}
                        <span className="text-[10px] text-emerald-700">● marque a bolinha da resposta certa</span>
                      </div>
                      <input value={p.explicacao || ''} onChange={(e) => mudar(i, { explicacao: e.target.value })} placeholder="Explicação para quem errar (opcional)" className={`${campo} ml-5 w-[calc(100%-1.25rem)]`} />
                    </div>
                  ))}
                  {config.questionario && <button type="button" onClick={() => setPerguntas((l) => [...l, novaPerguntaCiencia()])} className="px-3 py-1.5 rounded-lg border border-dashed border-slate-300 font-bold text-[#92611F] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Adicionar pergunta
                  </button>}
                  {config.questionario && perguntas.length === 0 && <p className="text-amber-700">Sem perguntas: a pessoa só lê e confirma.</p>}
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 space-y-2">
              {erro && <p className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</p>}
              {aviso && !erro && <p className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-semibold">{aviso}</p>}
              {(!link || aba === 'perguntas') && (
                <button type="button" onClick={() => salvar()} disabled={salvando} className="w-full py-2.5 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} {link ? 'Salvar' : 'Criar o link'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
