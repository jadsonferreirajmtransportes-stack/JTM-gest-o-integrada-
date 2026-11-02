import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { FormularioPublico, formularioPublico, responderFormularioPublico } from '../../utils/formulariosApi';
import { PreencherFormulario } from './PreencherFormulario';

/** Link externo de um formulário (?form=formulario&t=...): qualquer pessoa responde, sem login. */
export const FormularioPublicoView: React.FC<{ token?: string }> = ({ token }) => {
  const [formulario, setFormulario] = useState<FormularioPublico | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErro('Link incompleto. Peça o link do formulário de novo.');
      return;
    }
    formularioPublico(token)
      .then(setFormulario)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível abrir o formulário.'));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-center">
        <JmtLogo variant="compact" theme="light" iconSize={28} />
      </header>
      <main className="max-w-2xl mx-auto p-4 sm:p-6 pb-16">
        {erro ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-sm text-slate-600">{erro}</div>
        ) : !formulario ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando formulário...
          </div>
        ) : (
          <PreencherFormulario
            formulario={formulario}
            identificar
            onEnviar={(respostas, nome, contato) => responderFormularioPublico(token as string, nome, contato, respostas)}
          />
        )}
        <p className="text-center text-[11px] text-slate-400 mt-6">JM Transportes · formulário seguro do sistema JMT</p>
      </main>
    </div>
  );
};
