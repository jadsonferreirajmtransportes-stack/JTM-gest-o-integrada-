import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, PenLine, Send, Copy, MessageCircle, CheckCircle2, Clock, Eye, Download, Trash2, AlertTriangle } from 'lucide-react';
import { Colaborador } from '../../types';
import type { DocumentoPadronizado } from '../../utils/documentosPadronizadosApi';
import {
  CampoAssinaturaPdf,
  DocumentoAssinatura,
  criarDocumentoAssinatura,
  excluirDocumentoAssinatura,
  getAssinaturasDaReferencia,
  montarLinkDocumento,
} from '../../utils/documentosAssinaturaApi';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';
import { baixarBlob } from '../../utils/downloadUtils';
import { gerarPdfDocumento } from './gerarDocumento';

/** Referência das assinaturas = documento + versão (uma revisão nova pede assinaturas novas). */
export const referenciaAssinaturaDocumento = (d: DocumentoPadronizado) => `${d.id}@v${d.versao}`;

interface Signatario {
  posicao: string;
  papel: string;
  nome: string;
  cargo?: string;
}

interface Destino {
  modo: 'colaborador' | 'externo';
  colaboradorId: string;
  nome: string;
  cpf: string;
  contato: string;
}

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
const soDigitos = (t: string) => t.replace(/\D/g, '');
const cpfValido = (cpf: string) => soDigitos(cpf).length === 11;

/** Envio do documento padronizado para quem está no bloco "Assinaturas" (Elaborado/Revisado/
 *  Aprovado...). Colaborador assina pelo portal ou pelo link; pessoa de fora assina pelo link,
 *  conferindo o CPF informado aqui (migração 081). No fim sai o PDF com todas as assinaturas. */
export const EnviarAssinaturaDocumentoModal: React.FC<{
  documento: DocumentoPadronizado;
  colaboradores: Colaborador[];
  criadoPor?: string;
  onClose: () => void;
}> = ({ documento: d, colaboradores, criadoPor, onClose }) => {
  const referencia = referenciaAssinaturaDocumento(d);
  const signatarios: Signatario[] = useMemo(
    () =>
      d.blocos.flatMap((b) =>
        b.tipo === 'assinaturas' ? b.pessoas.map((p, i) => ({ posicao: `${b.id}:${i}`, papel: p.papel, nome: p.nome, cargo: p.cargo })) : []
      ),
    [d.blocos]
  );
  const ativos = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)), [colaboradores]);

  const [enviados, setEnviados] = useState<DocumentoAssinatura[] | null>(null);
  const [destinos, setDestinos] = useState<Record<string, Destino>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = () =>
    getAssinaturasDaReferencia('padronizado', referencia)
      .then(setEnviados)
      .catch((e) => {
        console.error(e);
        setErro('Não foi possível carregar as assinaturas. Confira se a migração 081 já foi rodada no Supabase.');
        setEnviados([]);
      });
  useEffect(() => {
    carregar();
    // Sugere o colaborador pelo nome escrito no bloco (quando bate com o cadastro).
    const inicial: Record<string, Destino> = {};
    signatarios.forEach((s) => {
      const c = s.nome ? ativos.find((x) => normalizar(x.nomeCompleto) === normalizar(s.nome)) : undefined;
      inicial[s.posicao] = { modo: c || !s.nome ? 'colaborador' : 'externo', colaboradorId: c?.id || '', nome: s.nome, cpf: '', contato: '' };
    });
    setDestinos(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referencia]);

  const envioDe = (posicao: string) => (enviados ?? []).find((e) => e.posicao === posicao);
  const mudar = (posicao: string, campos: Partial<Destino>) => setDestinos((prev) => ({ ...prev, [posicao]: { ...prev[posicao], ...campos } }));
  const colaboradorPorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);

  const podeEnviar = (s: Signatario) => {
    const dst = destinos[s.posicao];
    if (!dst) return false;
    return dst.modo === 'colaborador' ? !!dst.colaboradorId : !!dst.nome.trim() && cpfValido(dst.cpf);
  };

  const enviar = async (s: Signatario) => {
    const dst = destinos[s.posicao];
    if (!dst || !podeEnviar(s)) return;
    setOcupado(s.posicao);
    setErro(null);
    try {
      const campos: Record<string, CampoAssinaturaPdf> = {};
      const arquivo = await gerarPdfDocumento(d, { campos });
      const colab = dst.modo === 'colaborador' ? colaboradorPorId.get(dst.colaboradorId) : undefined;
      const novo = await criarDocumentoAssinatura({
        categoria: 'padronizado',
        colaboradorId: colab?.id || '',
        colaboradorNome: colab?.nomeCompleto || dst.nome.trim(),
        signatarioCpf: colab ? undefined : soDigitos(dst.cpf),
        signatarioContato: colab ? undefined : dst.contato.trim() || undefined,
        posicao: s.posicao,
        referencia,
        tipo: s.papel || 'Assinatura',
        titulo: `${d.codigo || 'Documento'} — ${d.titulo} (versão ${d.versao})`,
        arquivo,
        camposAssinatura: campos[s.posicao] ? [campos[s.posicao]] : undefined,
        loteId: `lote-padronizado-${d.id}`,
        criadoPor,
      });
      setEnviados((prev) => [...(prev ?? []), novo]);
    } catch (e) {
      console.error(e);
      setErro(`Não foi possível gerar o link: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setOcupado(null);
    }
  };

  const cancelar = async (envio: DocumentoAssinatura) => {
    if (!window.confirm(`Cancelar o link de ${envio.colaboradorNome}? O link enviado para de funcionar.`)) return;
    setOcupado(envio.posicao || envio.id);
    try {
      await excluirDocumentoAssinatura(envio);
      setEnviados((prev) => (prev ?? []).filter((e) => e.id !== envio.id));
    } catch (e) {
      console.error(e);
      setErro('Não foi possível cancelar o link.');
    } finally {
      setOcupado(null);
    }
  };

  const linkDe = (envio: DocumentoAssinatura) => montarLinkDocumento(envio.token, 'padronizado');
  const mensagem = (envio: DocumentoAssinatura) =>
    `Olá, ${envio.colaboradorNome.split(' ')[0]}! O documento "${d.titulo}" está pronto para a sua assinatura (${envio.tipo}).\n\n` +
    `Abra o link, informe seu CPF, confira o documento e assine:\n${linkDe(envio)}\n\nJM Transportes`;
  const telefoneDe = (envio: DocumentoAssinatura) => (envio.colaboradorId ? colaboradorPorId.get(envio.colaboradorId)?.telefoneWhatsapp : envio.signatarioContato) || '';

  const copiar = async (envio: DocumentoAssinatura) => {
    await navigator.clipboard.writeText(linkDe(envio)).catch(() => undefined);
    setCopiado(envio.id);
    setTimeout(() => setCopiado(null), 2000);
  };

  const assinados = (enviados ?? []).filter((e) => e.status === 'Assinado' && e.assinaturaImagem && e.assinadoEm);
  const baixarAssinado = async () => {
    setOcupado('pdf');
    try {
      const assinaturas = Object.fromEntries(assinados.filter((e) => e.posicao).map((e) => [e.posicao!, { imagem: e.assinaturaImagem!, em: e.assinadoEm! }]));
      const arquivo = await gerarPdfDocumento(d, { assinaturas });
      const nome = arquivo.name.replace(/\.pdf$/i, assinados.length === signatarios.length ? '_assinado.pdf' : '_assinaturas_parciais.pdf');
      baixarBlob(arquivo, nome);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível gerar o PDF assinado.');
    } finally {
      setOcupado(null);
    }
  };

  const campo = 'w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <PenLine className="w-4 h-4 text-[#C48229]" /> Enviar para assinatura
            </h2>
            <p className="text-slate-500 mt-0.5">
              {d.codigo || 'Documento'} — {d.titulo} (versão {d.versao}). Colaborador assina pelo portal (Documentos) ou pelo link; pessoa de fora assina pelo link, com o CPF informado aqui.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {erro && <p className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</p>}
          {signatarios.length === 0 ? (
            <p className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Este documento não tem bloco de <b className="mx-1">Assinaturas</b>. Adicione o bloco (Elaborado/Revisado/Aprovado), salve e volte aqui.
            </p>
          ) : enviados === null ? (
            <p className="text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </p>
          ) : (
            signatarios.map((s) => {
              const envio = envioDe(s.posicao);
              const dst = destinos[s.posicao];
              return (
                <div key={s.posicao} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black text-[#92611F] uppercase">{s.papel || 'Assinatura'}</p>
                      <p className="font-bold text-slate-800">{envio?.colaboradorNome || s.nome || 'Nome não preenchido no bloco'}</p>
                    </div>
                    {envio && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          envio.status === 'Assinado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : envio.status === 'Visualizado'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {envio.status === 'Assinado' ? <CheckCircle2 className="w-3 h-3" /> : envio.status === 'Visualizado' ? <Eye className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {envio.status === 'Assinado' ? `Assinado em ${new Date(envio.assinadoEm!).toLocaleDateString('pt-BR')}` : envio.status}
                      </span>
                    )}
                  </div>

                  {envio ? (
                    envio.status !== 'Assinado' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-500 mr-1">{envio.colaboradorId ? 'Colaborador — também aparece no portal dele.' : 'Pessoa de fora — assina pelo link.'}</span>
                        <button type="button" onClick={() => copiar(envio)} className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold flex items-center gap-1 normal-case tracking-normal">
                          <Copy className="w-3.5 h-3.5" /> {copiado === envio.id ? 'Copiado!' : 'Copiar link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const link = buildWhatsAppLink(telefoneDe(envio), mensagem(envio));
                            if (link) window.open(link, '_blank', 'noopener');
                            else alert('Sem WhatsApp cadastrado — use "Copiar link" e envie por outro meio.');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-semibold flex items-center gap-1 normal-case tracking-normal"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                        <button type="button" onClick={() => cancelar(envio)} disabled={!!ocupado} className="p-1.5 text-slate-400 hover:text-rose-600" title="Cancelar o link (para corrigir o destinatário)">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  ) : (
                    dst && (
                      <div className="space-y-2">
                        <div className="flex gap-3">
                          {(['colaborador', 'externo'] as const).map((m) => (
                            <label key={m} className="flex items-center gap-1.5 font-semibold text-slate-600 cursor-pointer">
                              <input type="radio" checked={dst.modo === m} onChange={() => mudar(s.posicao, { modo: m })} />
                              {m === 'colaborador' ? 'Colaborador' : 'Pessoa de fora da empresa'}
                            </label>
                          ))}
                        </div>
                        {dst.modo === 'colaborador' ? (
                          <select value={dst.colaboradorId} onChange={(e) => mudar(s.posicao, { colaboradorId: e.target.value })} className={campo}>
                            <option value="">Escolha o colaborador...</option>
                            {ativos.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nomeCompleto} {c.funcaoCargo ? `· ${c.funcaoCargo}` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="grid sm:grid-cols-3 gap-2">
                            <input value={dst.nome} onChange={(e) => mudar(s.posicao, { nome: e.target.value })} placeholder="Nome completo" className={campo} />
                            <input value={dst.cpf} onChange={(e) => mudar(s.posicao, { cpf: e.target.value })} placeholder="CPF (confere no link)" inputMode="numeric" className={campo} />
                            <input value={dst.contato} onChange={(e) => mudar(s.posicao, { contato: e.target.value })} placeholder="WhatsApp (opcional)" inputMode="tel" className={campo} />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => enviar(s)}
                          disabled={!podeEnviar(s) || !!ocupado}
                          className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50 normal-case tracking-normal"
                        >
                          {ocupado === s.posicao ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Gerar link de assinatura
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
          {signatarios.length > 0 && (
            <p className="text-[11px] text-slate-500">
              As assinaturas valem para esta versão. Se o conteúdo mudar, abra uma <b>Nova revisão</b> e envie de novo.
            </p>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-slate-600">
            <b>{assinados.length}</b> de {signatarios.length} assinatura(s) feita(s)
          </span>
          <button
            type="button"
            onClick={baixarAssinado}
            disabled={!assinados.length || !!ocupado}
            className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 normal-case tracking-normal"
          >
            {ocupado === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {assinados.length === signatarios.length && signatarios.length ? 'Baixar PDF assinado' : 'Baixar PDF com as assinaturas já feitas'}
          </button>
        </div>
      </div>
    </div>
  );
};
