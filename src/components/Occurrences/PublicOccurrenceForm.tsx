import React, { useState } from 'react';
import {
  X,
  Send,
  Upload,
  CheckCircle2,
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  Colaborador,
  Supervisor,
  TipoOcorrencia,
  Ocorrencia,
} from '../../types';
import { useBotGuard } from '../../utils/botProtection';

interface PublicOccurrenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  colaboradores: Colaborador[];
  supervisores: Supervisor[];
  onSuccessSubmit: (ocorrencia: Ocorrencia) => void;
}

// Tipos que podem durar mais de um dia — mesmo conjunto usado em PublicOccurrencePortal.tsx e
// em calcFaltasEmPeriodo (src/utils/formatters.ts), que reduz diárias de VA por esses tipos.
const TIPOS_COM_DURACAO = new Set<TipoOcorrencia>([
  'Atestado médico',
  'Falta justificada',
  'Falta injustificada',
  'Suspensão disciplinar',
  'Acidente de trabalho (CAT)',
]);

export const PublicOccurrenceForm: React.FC<PublicOccurrenceFormProps> = ({
  isOpen,
  onClose,
  colaboradores,
  supervisores,
  onSuccessSubmit,
}) => {
  const [colaboradorId, setColaboradorId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [tipo, setTipo] = useState<TipoOcorrencia>('Atestado médico');
  const [dataOcorrencia, setDataOcorrencia] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dataTermino, setDataTermino] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [descricao, setDescricao] = useState('');
  const [arquivoNome, setArquivoNome] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const botGuard = useBotGuard();

  if (!isOpen) return null;

  const activeColaboradores = colaboradores.filter((c) => c.status !== 'Inativo');

  const calcularDiasAfastamento = (): number => {
    if (!dataOcorrencia || !dataTermino) return 1;
    const inicio = new Date(dataOcorrencia + 'T00:00:00');
    const termino = new Date(dataTermino + 'T00:00:00');
    if (isNaN(inicio.getTime()) || isNaN(termino.getTime()) || termino < inicio) return 1;
    const diffDias = Math.round((termino.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias + 1;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botGuard.isLikelyBot()) {
      // Automated submission detected (honeypot filled or submitted too fast) — drop silently.
      console.warn('Envio bloqueado: comportamento automatizado detectado.');
      return;
    }
    if (!colaboradorId || !supervisorId || !descricao) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const sup = supervisores.find((s) => s.id === supervisorId);

    const payload: Ocorrencia = {
      id: `ocorr-pub-${Date.now()}`,
      colaboradorId,
      tipo,
      dataOcorrencia,
      diasAfastamento: TIPOS_COM_DURACAO.has(tipo) ? calcularDiasAfastamento() : undefined,
      descricao,
      comprovanteAnexo: arquivoNome || undefined,
      registradoPor: sup ? `${sup.nome} (${sup.cargo})` : 'Supervisor de Campo',
      criadoEm: new Date().toISOString(),
    };

    onSuccessSubmit(payload);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setArquivoNome(f.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-800/60 border border-amber-400/30 flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Formulário do Supervisor</h2>
              <p className="text-xs text-amber-100">Jobson de Moraes Transportes — DP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white rounded-lg hover:bg-amber-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Ocorrência Enviada com Sucesso!</h3>
            <p className="text-xs text-slate-500">
              O Departamento Pessoal da JMT foi notificado e a ocorrência já foi vinculada à ficha do colaborador.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              <strong>Canal Direto de Campo:</strong> Utilize este formulário para registrar faltas, atrasos e atestados médicos dos colaboradores da sua equipe com foto ou anexo do documento.
            </div>

            {/* Honeypot — invisible to real users, catches generic auto-fill bots */}
            <div {...botGuard.honeypotWrapperProps}>
              <label htmlFor={botGuard.honeypotFieldId}>Não preencha este campo</label>
              <input type="text" {...botGuard.honeypotFieldProps} />
            </div>

            {/* Supervisor */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Identificação do Supervisor Solicitante *
              </label>
              <select
                required
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Selecione seu nome</option>
                {supervisores.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.nome} — {sup.cargo} ({sup.setor})
                  </option>
                ))}
              </select>
            </div>

            {/* Colaborador */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Colaborador Envolvido *
              </label>
              <select
                required
                value={colaboradorId}
                onChange={(e) => setColaboradorId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Selecione o colaborador</option>
                {activeColaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeCompleto} ({c.funcaoCargo} — {c.setor})
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo & Data */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipo de Evento *</label>
                <select
                  value={tipo}
                  onChange={(e) => {
                    const novoTipo = e.target.value as TipoOcorrencia;
                    setTipo(novoTipo);
                    // Reseta o término pro mesmo dia do início ao trocar de tipo — evita herdar
                    // um término de vários dias escolhido antes num outro tipo.
                    setDataTermino(dataOcorrencia);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="Atestado médico">Atestado médico</option>
                  <option value="Falta justificada">Falta justificada</option>
                  <option value="Falta injustificada">Falta injustificada</option>
                  <option value="Atraso">Atraso</option>
                  <option value="Saída antecipada">Saída antecipada</option>
                  <option value="Comparecimento">Comparecimento</option>
                  <option value="Advertência escrita">Advertência escrita</option>
                  <option value="Suspensão disciplinar">Suspensão disciplinar</option>
                  <option value="Elogio">Elogio</option>
                  <option value="Acidente de trabalho (CAT)">Acidente de trabalho (CAT)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {TIPOS_COM_DURACAO.has(tipo) ? 'Data de Início *' : 'Data da Ocorrência *'}
                </label>
                <input
                  type="date"
                  required
                  value={dataOcorrencia}
                  onChange={(e) => {
                    const novaData = e.target.value;
                    setDataOcorrencia(novaData);
                    if (dataTermino && novaData > dataTermino) setDataTermino(novaData);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-bold"
                />
              </div>
            </div>

            {/* Data de Término se o tipo puder durar mais de um dia */}
            {TIPOS_COM_DURACAO.has(tipo) && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Data de Término *</label>
                <input
                  type="date"
                  required
                  min={dataOcorrencia}
                  value={dataTermino}
                  onChange={(e) => setDataTermino(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {calcularDiasAfastamento()} dia(s) de afastamento
                </p>
              </div>
            )}

            {/* Descricao */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Relato / Justificativa do Supervisor *
              </label>
              <textarea
                required
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o que ocorreu no turno ou informações do atestado recebido..."
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            {/* Foto ou Documento */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Foto do Atestado ou Documento (Opcional)
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1 text-xs">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Anexar Foto / Arquivo</span>
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
                {arquivoNome && (
                  <span className="font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded text-[11px] truncate flex-1">
                    {arquivoNome}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar para o DP</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
