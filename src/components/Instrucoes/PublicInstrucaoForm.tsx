import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, FileCheck2, CheckCircle2, AlertTriangle, PenLine } from 'lucide-react';
import { InstrucaoTrabalho } from '../../types';
import { JmtLogo } from '../Brand/JmtLogo';
import { InstrucaoEditor } from './InstrucaoEditor';

interface PublicInstrucaoFormProps {
  instrucoes: InstrucaoTrabalho[];
  instrucaoId?: string;
  onSaveInstrucao: (instrucao: InstrucaoTrabalho) => void;
  onAdminBack?: () => void;
}

/** Portal público (sem login) para um colaborador preencher UMA Instrução de Trabalho
 *  específica — mesmo padrão do Link de Admissão / Formulário Público de Ocorrências:
 *  acessível por link direto, sem precisar de conta no sistema JMT. */
export const PublicInstrucaoForm: React.FC<PublicInstrucaoFormProps> = ({
  instrucoes,
  instrucaoId,
  onSaveInstrucao,
  onAdminBack,
}) => {
  const [concluido, setConcluido] = useState(false);
  const [statusEnviado, setStatusEnviado] = useState<InstrucaoTrabalho['status'] | null>(null);
  const instrucao = instrucoes.find((i) => i.id === instrucaoId);

  const handleSave = (atualizada: InstrucaoTrabalho) => {
    onSaveInstrucao(atualizada);
  };

  const handleConcluir = () => {
    if (!instrucao) return;
    const novoStatus = instrucao.status === 'Rascunho' ? 'Em Revisão' : instrucao.status;
    onSaveInstrucao({
      ...instrucao,
      status: novoStatus,
    });
    setStatusEnviado(novoStatus);
    setConcluido(true);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 flex flex-col font-sans selection:bg-[#C48229] selection:text-white">
      {/* Header */}
      <header className="bg-[#0c0c0c] border-b border-[#262626] sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <JmtLogo variant="compact" theme="dark" iconSize={32} />
          <div className="hidden sm:block pl-3 border-l border-[#262626]">
            <span className="bg-[#C48229]/15 text-[#C48229] border border-[#C48229]/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Preenchimento de Instrução de Trabalho
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Sem necessidade de login no sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
            <ShieldCheck className="w-4 h-4 text-[#C48229]" />
            <span>Gestão por Processos JMT</span>
          </div>
          {onAdminBack && (
            <button
              type="button"
              onClick={onAdminBack}
              className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-slate-200 border border-[#2a2a2a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C48229]" />
              <span>Painel Admin</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!instrucao ? (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-3">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Instrução não encontrada</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Este link não corresponde a nenhuma Instrução de Trabalho válida. Peça um novo link a quem solicitou o
              preenchimento.
            </p>
          </div>
        ) : concluido ? (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white">Preenchimento enviado!</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              A instrução <strong className="text-slate-200">{instrucao.codigo} — {instrucao.titulo || 'sem título'}</strong>{' '}
              foi atualizada com sucesso
              {statusEnviado === 'Em Revisão' ? (
                <>
                  {' '}e marcada como <strong className="text-amber-300">Em Revisão</strong> para o dono do processo/gestor
                  validar.
                </>
              ) : (
                <>
                  . O status atual continua <strong className="text-amber-300">{statusEnviado || instrucao.status}</strong>.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setConcluido(false)}
              className="px-5 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors mx-auto"
            >
              <PenLine className="w-4 h-4" />
              <span>Continuar Editando</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 p-4 sm:p-5 rounded-2xl border border-amber-500/30 flex items-start gap-3.5 shadow-lg">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-200">Preencha o passo a passo desta Instrução de Trabalho</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Navegue pelas etapas abaixo, use as dicas "Como preencher?" em cada uma e clique em{' '}
                  <strong>Concluir Preenchimento</strong> ao final. Suas alterações já ficam salvas a cada etapa — pode
                  fechar e voltar depois pelo mesmo link.
                </p>
              </div>
            </div>

            <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-8">
              <InstrucaoEditor instrucao={instrucao} onSave={handleSave} modoPublico />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleConcluir}
                className="px-6 py-3 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir Preenchimento</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
