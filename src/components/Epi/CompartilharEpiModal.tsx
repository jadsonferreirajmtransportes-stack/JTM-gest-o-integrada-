import React, { useEffect, useMemo, useState } from 'react';
import { X, Link2, Copy, Check, Trash2, Loader2, ShieldAlert, Clock } from 'lucide-react';
import { Colaborador, EntregaEpi } from '../../types';
import {
  EpiCompartilhada,
  gerarLinkEpiCompartilhado,
  listarLinksEpiCompartilhado,
  revogarLinkEpiCompartilhado,
} from '../../utils/dpApi';
import { formatDate } from '../../utils/formatters';

interface CompartilharEpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaborador: Colaborador | null;
  entregasDoColaborador: EntregaEpi[];
  criadoPor?: string;
}

function montarUrlEpi(token: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?form=epi&token=${token}`;
}

/** Gera/gerencia links de compartilhamento da ficha de EPI (mesmo padrão de
 *  CompartilharFichaModal.tsx) — pra enviar por WhatsApp/e-mail sem precisar de login. Cada
 *  link é uma "foto" das entregas já feitas até o momento da geração, expira em 7 dias e pode
 *  ser revogado antes disso. */
export const CompartilharEpiModal: React.FC<CompartilharEpiModalProps> = ({
  isOpen,
  onClose,
  colaborador,
  entregasDoColaborador,
  criadoPor,
}) => {
  const [links, setLinks] = useState<EpiCompartilhada[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [tokenCopiado, setTokenCopiado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const linhas = useMemo(
    () =>
      [...entregasDoColaborador]
        .sort((a, b) => a.data.localeCompare(b.data))
        .flatMap((entrega) =>
          entrega.itens.map((item) => ({
            descricao: item.tamanho ? `${item.descricao} — Tam. ${item.tamanho}` : item.descricao,
            ca: item.ca,
            entrega: entrega.data,
            devolucao: item.devolucao,
            assinaturaDigitalUrl: entrega.assinaturaDigitalUrl,
          }))
        ),
    [entregasDoColaborador]
  );

  useEffect(() => {
    if (isOpen && colaborador) {
      carregarLinks();
    } else {
      setLinks([]);
      setErro(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, colaborador?.id]);

  const carregarLinks = async () => {
    if (!colaborador) return;
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarLinksEpiCompartilhado(colaborador.id);
      setLinks(lista);
    } catch (e) {
      console.error('Erro ao listar links da ficha de EPI compartilhada:', e);
      setErro('Não foi possível carregar os links já gerados. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  };

  const handleGerarLink = async () => {
    if (!colaborador) return;
    setGerando(true);
    setErro(null);
    try {
      await gerarLinkEpiCompartilhado(
        colaborador.id,
        colaborador.nomeCompleto,
        { colaboradorNome: colaborador.nomeCompleto, funcaoCargo: colaborador.funcaoCargo, linhas },
        criadoPor,
        7
      );
      await carregarLinks();
    } catch (e) {
      console.error('Erro ao gerar link da ficha de EPI:', e);
      setErro('Não foi possível gerar o link. Verifique sua conexão e tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  const handleCopiar = async (token: string) => {
    try {
      await navigator.clipboard.writeText(montarUrlEpi(token));
      setTokenCopiado(token);
      setTimeout(() => setTokenCopiado((atual) => (atual === token ? null : atual)), 2000);
    } catch (e) {
      console.error('Erro ao copiar link:', e);
    }
  };

  const handleRevogar = async (token: string) => {
    if (!window.confirm('Revogar este link agora? Quem tiver o link não vai mais conseguir abrir a ficha.')) {
      return;
    }
    try {
      await revogarLinkEpiCompartilhado(token);
      await carregarLinks();
    } catch (e) {
      console.error('Erro ao revogar link:', e);
      setErro('Não foi possível revogar o link. Tente novamente.');
    }
  };

  if (!isOpen || !colaborador) return null;

  const agora = Date.now();

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#92611F]" />
              Compartilhar Ficha de EPI
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{colaborador.nomeCompleto}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              O link mostra uma <strong>foto das entregas de agora</strong> (não inclui entregas registradas depois),
              expira em <strong>7 dias</strong> e pode ser revogado a qualquer momento.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGerarLink}
            disabled={gerando}
            className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
          >
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {gerando ? 'Gerando link...' : 'Gerar Novo Link (válido por 7 dias)'}
          </button>

          {erro && <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">{erro}</p>}

          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Links Gerados</h3>
            {carregando ? (
              <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : links.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nenhum link gerado ainda.</p>
            ) : (
              links.map((link) => {
                const expirado = new Date(link.expiraEm).getTime() < agora;
                const inativo = link.revogado || expirado;
                return (
                  <div
                    key={link.token}
                    className={`border rounded-xl p-3 space-y-2 ${
                      inativo ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-emerald-200 bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          link.revogado
                            ? 'bg-rose-100 text-rose-700'
                            : expirado
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {link.revogado ? 'Revogado' : expirado ? 'Expirado' : 'Ativo'}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> expira em {formatDate(link.expiraEm.slice(0, 10))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={montarUrlEpi(link.token)}
                        className="flex-1 text-[11px] font-mono bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 truncate"
                        onFocus={(e) => e.target.select()}
                      />
                      {!inativo && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopiar(link.token)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shrink-0"
                            title="Copiar link"
                          >
                            {tokenCopiado === link.token ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevogar(link.token)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg shrink-0"
                            title="Revogar link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                    {link.criadoPor && (
                      <p className="text-[10px] text-slate-400">
                        Gerado por {link.criadoPor} em {formatDate(link.criadoEm.slice(0, 10))}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
