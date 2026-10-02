import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Megaphone } from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { ComunicadoPublico, abrirComunicadoPublico, confirmarCienciaComunicado, personalizar } from '../../utils/comunicadosApi';

/** Link do comunicado (?form=comunicado&token=...) — mostra a imagem e o texto e, se o
 *  comunicado pedir, registra a confirmação de ciência. Sem login. */
export const ComunicadoPublicView: React.FC<{ token?: string }> = ({ token }) => {
  const [comunicado, setComunicado] = useState<ComunicadoPublico | null>(null);
  const [carregando, setCarregando] = useState(!!token);
  const [erro, setErro] = useState<string | null>(token ? null : 'Este link não é válido.');
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!token) return;
    abrirComunicadoPublico(token)
      .then((r) => {
        if (r.erro) setErro('Este link não é válido ou o comunicado foi removido.');
        else setComunicado(r.comunicado || null);
      })
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível abrir agora. Verifique sua internet e tente de novo.');
      })
      .finally(() => setCarregando(false));
  }, [token]);

  const handleConfirmar = async () => {
    if (!token || !comunicado) return;
    setConfirmando(true);
    try {
      const r = await confirmarCienciaComunicado(token);
      if (r.cienteEm) setComunicado({ ...comunicado, cienteEm: r.cienteEm });
    } catch (err) {
      console.error(err);
      setErro('Não foi possível confirmar. Tente de novo.');
    } finally {
      setConfirmando(false);
    }
  };

  // Negrito do WhatsApp (*texto*) vira negrito na página.
  const paragrafos = comunicado ? personalizar(comunicado.corpo, comunicado.primeiroNome).split(/\n/) : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <JmtLogo variant="compact" theme="light" iconSize={28} />
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Megaphone className="w-4 h-4 text-[#C48229]" /> Comunicado
        </span>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-4">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
          </div>
        ) : !comunicado ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-700 font-semibold flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {erro}
          </div>
        ) : (
          <>
            {comunicado.imagemUrl && <img src={comunicado.imagemUrl} alt={comunicado.titulo} className="w-full rounded-2xl border border-slate-200 shadow-xs" />}
            <article className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
              <p className="text-[11px] font-bold text-[#92611F]">
                Comunicado nº {String(comunicado.numero).padStart(3, '0')}/{comunicado.ano} · {comunicado.categoria} ·{' '}
                {new Date(comunicado.criadoEm).toLocaleDateString('pt-BR')}
              </p>
              <h1 className="text-lg font-black text-slate-900">{comunicado.titulo}</h1>
              <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                {paragrafos.map((p, i) =>
                  p.trim() ? (
                    <p key={i}>
                      {p.split(/(\*[^*\n]+\*)/g).map((parte, k) =>
                        /^\*[^*\n]+\*$/.test(parte) ? <strong key={k}>{parte.slice(1, -1)}</strong> : <React.Fragment key={k}>{parte}</React.Fragment>
                      )}
                    </p>
                  ) : null
                )}
              </div>
              <p className="text-sm font-bold text-slate-900 pt-2">{comunicado.assinatura}</p>
              <p className="text-xs text-slate-500 -mt-2">JM Transportes</p>
            </article>
            {comunicado.exigeCiencia &&
              (comunicado.cienteEm ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-emerald-800 mt-1">Ciência confirmada</p>
                  <p className="text-xs text-emerald-700">Em {new Date(comunicado.cienteEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. Obrigado!</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={confirmando}
                  className="w-full py-3.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {confirmando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Li e estou ciente
                </button>
              ))}
            {erro && <p className="text-xs text-rose-700 font-semibold text-center">{erro}</p>}
          </>
        )}
      </main>
    </div>
  );
};
