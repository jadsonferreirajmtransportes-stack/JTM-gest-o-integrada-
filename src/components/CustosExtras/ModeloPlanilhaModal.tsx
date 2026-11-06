import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import { CAMPOS_PLANILHA, CampoPlanilha, ColunaModelo, ModeloPlanilhaCusto, excluirModeloPlanilha, salvarModeloPlanilha } from '../../utils/custosExtrasApi';
import { enviarArquivo, obterUrlArquivo, removerArquivo } from '../../utils/arquivosStorage';
import { baixarBlob } from '../../utils/downloadUtils';
import { CustoParaPlanilha, LayoutModelo, LeituraModelo, gerarPlanilhaPeloModelo, layoutDoModelo, letraColuna, lerModeloPlanilha } from './planilhaCustosExtras';

const LIMITE_MB = 10;

/** Formato da planilha de uma empresa: sobe a planilha que o cliente usa e confere o que vai em cada coluna. */
export const ModeloPlanilhaModal: React.FC<{
  chave: string;
  empresa: string;
  modelo?: ModeloPlanilhaCusto;
  itensTeste: CustoParaPlanilha[];
  usuario?: string;
  onClose: () => void;
  onSalvo: (m: ModeloPlanilhaCusto | null) => void;
}> = ({ chave, empresa, modelo, itensTeste, usuario, onClose, onSalvo }) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState(modelo?.arquivoNome || '');
  const [leitura, setLeitura] = useState<LeituraModelo | null>(null);
  const [carregando, setCarregando] = useState(!!modelo);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Modelo já salvo: baixa a planilha do cliente para poder trocar a aba/linha ou testar.
  useEffect(() => {
    if (!modelo) return;
    (async () => {
      try {
        const r = await fetch(await obterUrlArquivo(modelo.arquivoRef));
        if (!r.ok) throw new Error('Não consegui baixar a planilha do modelo.');
        const buf = await r.arrayBuffer();
        const layout = layoutDoModelo(modelo);
        const l = await lerModeloPlanilha(buf, modelo.aba, modelo.linhaCabecalho || undefined, layout);
        const chave = (c: { coluna: number; linha?: number }) => `${c.linha || 0}:${c.coluna}`;
        const salvo = new Map<string, ColunaModelo>(modelo.colunas.map((c) => [chave(c), c]));
        setBuffer(buf);
        setLeitura({
          ...l,
          colunas: l.colunas.map((c) => {
            const s = salvo.get(chave(c));
            return s ? { ...c, campo: s.campo, noRotulo: s.noRotulo, texto: s.texto } : c;
          }),
        });
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não consegui abrir o modelo.');
      } finally {
        setCarregando(false);
      }
    })();
  }, [modelo]);

  const escolherArquivo = async (f?: File) => {
    if (!f) return;
    setErro(null);
    if (!/\.xlsx$/i.test(f.name)) return setErro('Use a planilha em .xlsx (se ela for .xls ou .csv, abra no Excel e salve como "Pasta de Trabalho do Excel").');
    if (f.size > LIMITE_MB * 1024 * 1024) return setErro(`A planilha passa de ${LIMITE_MB}MB.`);
    setCarregando(true);
    try {
      const buf = await f.arrayBuffer();
      setLeitura(await lerModeloPlanilha(buf));
      setBuffer(buf);
      setArquivoNovo(f);
      setNomeArquivo(f.name);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui ler a planilha.');
    } finally {
      setCarregando(false);
    }
  };

  const reler = async (aba: string, linha?: number, layout?: LayoutModelo) => {
    if (!buffer) return;
    setErro(null);
    try {
      setLeitura(await lerModeloPlanilha(buffer, aba, linha, layout || leitura?.layout));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui ler a planilha.');
    }
  };

  const mudarColuna = (alvo: { coluna: number; linha?: number }, p: Partial<ColunaModelo>) =>
    setLeitura((l) => (l ? { ...l, colunas: l.colunas.map((c) => (c.coluna === alvo.coluna && c.linha === alvo.linha ? { ...c, ...p } : c)) } : l));
  const mudarCampo = (alvo: { coluna: number; linha?: number }, campo: CampoPlanilha) => mudarColuna(alvo, { campo });
  const ficha = leitura?.layout === 'ficha';

  const ligadas = leitura?.colunas.filter((c) => c.campo !== 'nada').length || 0;

  const testar = async () => {
    if (!buffer || !leitura) return;
    setErro(null);
    try {
      const exemplo: CustoParaPlanilha[] = [
        { id: 'teste', clienteNome: empresa, notaFiscal: '123456', numeroCte: '7890', destinatario: 'DESTINATÁRIO EXEMPLO', cidade: 'CIDADE EXEMPLO', dataOcorrencia: new Date().toLocaleDateString('sv-SE'), tipo: 'Custo exemplo', descricao: 'Exemplo de motivo', valor: 100, volumes: 1, status: 'Pendente', lancadoNoCte: false, criadoEm: '' },
      ];
      const arq = await gerarPlanilhaPeloModelo(leitura, buffer, empresa, itensTeste.length ? itensTeste : exemplo, 'TESTE');
      baixarBlob(arq, arq.name.replace('.xlsx', '_TESTE.xlsx'));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui gerar o teste.');
    }
  };

  const salvar = async () => {
    if (!leitura || (!arquivoNovo && !modelo)) return;
    if (!ligadas) return setErro('Ligue pelo menos uma coluna a um campo (ex.: NF e Valor).');
    setSalvando(true);
    setErro(null);
    try {
      const ref = arquivoNovo ? await enviarArquivo(arquivoNovo, 'custos-extras/modelos') : modelo!.arquivoRef;
      const novo: ModeloPlanilhaCusto = {
        clienteChave: chave,
        clienteNome: empresa,
        arquivoRef: ref,
        arquivoNome: nomeArquivo || undefined,
        aba: leitura.aba,
        linhaCabecalho: ficha ? 0 : leitura.linhaCabecalho,
        colunas: ficha ? leitura.colunas : leitura.colunas.map(({ linha: _l, ...c }) => c),
        atualizadoEm: new Date().toISOString(),
      };
      await salvarModeloPlanilha(novo, usuario);
      if (arquivoNovo && modelo) await removerArquivo(modelo.arquivoRef).catch(() => undefined);
      onSalvo(novo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar o modelo.');
      setSalvando(false);
    }
  };

  const voltarPadrao = async () => {
    if (!modelo || !window.confirm(`Voltar a usar a planilha padrão JMT para ${empresa}?`)) return;
    setSalvando(true);
    try {
      await excluirModeloPlanilha(chave);
      await removerArquivo(modelo.arquivoRef).catch(() => undefined);
      onSalvo(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui remover o modelo.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case">Formato da planilha — {empresa}</h2>
            <p className="text-xs text-slate-500">Suba a planilha que a empresa usa. O sistema preenche as linhas abaixo dos títulos e mantém o resto do layout dela.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-[#C48229] hover:bg-amber-50/40">
            <Upload className="w-5 h-5 text-[#C48229] shrink-0" />
            <span className="text-xs text-slate-600">
              {nomeArquivo ? (
                <>
                  <b className="text-slate-900">{nomeArquivo}</b>
                  <span className="block">Clique para trocar por outra planilha (.xlsx)</span>
                </>
              ) : (
                <>
                  <b className="text-slate-900">Escolher a planilha do cliente (.xlsx)</b>
                  <span className="block">Pode ser uma que ele já mandou preenchida — os exemplos são apagados na hora de gerar.</span>
                </>
              )}
            </span>
            <input type="file" accept=".xlsx" className="hidden" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
          </label>

          {carregando && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" /> Lendo a planilha...
            </p>
          )}

          {leitura && !carregando && (
            <>
              <div>
                <span className="text-xs text-slate-600 block mb-1">Jeito da planilha</span>
                <div className="flex gap-1">
                  {(
                    [
                      ['tabela', 'Tabela — um custo por linha'],
                      ['ficha', 'Formulário — um custo por folha'],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => valor !== leitura.layout && reler(leitura.aba, undefined, valor)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold ${leitura.layout === valor ? 'bg-[#C48229] text-white border-[#C48229]' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {leitura.abas.length > 1 && (
                  <label className="text-xs text-slate-600">
                    Aba
                    <select value={leitura.aba} onChange={(e) => reler(e.target.value)} className="block mt-1 px-2 py-1.5 border border-slate-200 rounded-lg bg-white">
                      {leitura.abas.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                )}
                {!ficha && (
                <label className="text-xs text-slate-600">
                  Linha dos títulos
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={leitura.linhaCabecalho}
                    onChange={(e) => Number(e.target.value) > 0 && reler(leitura.aba, Number(e.target.value))}
                    className="block mt-1 w-24 px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                </label>
                )}
                <p className="text-[11px] text-slate-500 self-end pb-1">
                  {ficha ? 'Cada custo sai numa folha própria, copiando este formulário (1º, 2º, 3º...).' : `Os custos entram a partir da linha ${leitura.linhaCabecalho + 1}.`}
                </p>
              </div>

              {leitura.colunas.length === 0 ? (
                <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">{ficha ? 'Não achei rótulos com espaço para o valor à direita. Tente "Tabela".' : 'Não há títulos nessa linha. Ajuste o número da linha dos títulos.'}</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="p-2 w-12">{ficha ? 'Célula' : 'Col.'}</th>
                        <th className="p-2">{ficha ? 'Rótulo no formulário do cliente' : 'Título na planilha do cliente'}</th>
                        <th className="p-2 w-56">O que vai nela</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leitura.colunas.map((c) => (
                        <tr key={`${c.linha || 0}:${c.coluna}`} className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-400">
                            {letraColuna(c.coluna)}
                            {c.linha || ''}
                          </td>
                          <td className="p-2 text-slate-800">{c.titulo}</td>
                          <td className="p-2">
                            <select
                              value={c.campo}
                              onChange={(e) => mudarCampo(c, e.target.value as CampoPlanilha)}
                              className={`w-full px-2 py-1.5 border rounded-lg bg-white ${c.campo === 'nada' ? 'border-slate-200 text-slate-400' : 'border-[#C48229] text-slate-900 font-semibold'}`}
                            >
                              {CAMPOS_PLANILHA.map((o) => (
                                <option key={o.campo} value={o.campo}>
                                  {o.rotulo}
                                </option>
                              ))}
                            </select>
                            {c.campo === 'texto' && (
                              <input
                                value={c.texto || ''}
                                onChange={(e) => mudarColuna(c, { texto: e.target.value })}
                                placeholder="Ex.: JMT - Nome do representante"
                                className="mt-1 w-full px-2 py-1.5 border border-[#C48229] rounded-lg"
                              />
                            )}
                            {ficha && c.campo !== 'nada' && c.colunaRotulo && (
                              <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                                <input type="checkbox" checked={!!c.noRotulo} onChange={(e) => mudarColuna(c, { noRotulo: e.target.checked || undefined })} className="accent-[#C48229]" />
                                Escrever no lugar deste texto (ex.: título)
                              </label>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                O que o sistema não tem (ex.: "De acordo?", tipo de veículo, ajudante) fica em branco para preencher à mão. Confira e, se quiser, baixe um teste com os custos desta empresa antes de salvar.
              </p>
            </>
          )}

          {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            {modelo && (
              <button type="button" disabled={salvando} onClick={voltarPadrao} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Voltar à planilha padrão JMT
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {leitura && (
              <button type="button" disabled={salvando || !ligadas} onClick={testar} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50">
                <Download className="w-4 h-4" /> Baixar teste
              </button>
            )}
            <button
              type="button"
              disabled={salvando || !leitura || !ligadas}
              onClick={salvar}
              className="px-4 py-2 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Salvar formato
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
