import React, { useMemo, useState } from 'react';
import { X, Loader2, FileText, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Colaborador } from '../../types';
import { criarDocumentoAssinatura, DocumentoAssinatura } from '../../utils/documentosAssinaturaApi';
import { ROTULO_VERSAO_REGULAMENTO, VERSAO_REGULAMENTO } from '../../data/regulamentoInterno';
import { gerarPdfRegulamento } from './regulamentoPdf';
import { baixarBlob } from '../../utils/downloadUtils';

interface EnviarRegulamentoModalProps {
  colaboradores: Colaborador[];
  existentes: DocumentoAssinatura[];
  criadoPor?: string;
  onClose: () => void;
  onCriados: (novos: DocumentoAssinatura[]) => void;
}

export const TITULO_DOCUMENTO_REGULAMENTO = `Regulamento Interno (${ROTULO_VERSAO_REGULAMENTO})`;

/** Gera uma cópia do Regulamento Interno (versão vigente) pra cada colaborador escolhido, com
 *  nome/CPF no termo de ciência, e cria o documento de assinatura (link + CPF). Quem já tem o
 *  documento desta versão fica de fora — novos admitidos aparecem aqui como "falta enviar". */
export const EnviarRegulamentoModal: React.FC<EnviarRegulamentoModalProps> = ({ colaboradores, existentes, criadoPor, onClose, onCriados }) => {
  const jaTem = useMemo(
    () => new Set(existentes.filter((d) => d.referencia === VERSAO_REGULAMENTO).map((d) => d.colaboradorId)),
    [existentes]
  );
  const ativos: Colaborador[] = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
    [colaboradores]
  );
  const faltam: Colaborador[] = useMemo(() => ativos.filter((c) => !jaTem.has(c.id)), [ativos, jaTem]);
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(faltam.map((c) => c.id)));
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(null);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [concluido, setConcluido] = useState<number | null>(null);

  const alternar = (id: string) =>
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const handleVerModelo = () => {
    const { arquivo } = gerarPdfRegulamento();
    baixarBlob(arquivo, arquivo.name);
  };

  const handleGerar = async () => {
    const escolhidos = faltam.filter((c) => selecionados.has(c.id));
    if (escolhidos.length === 0) return;
    const loteId = `lote-reg-${Date.now()}`;
    const criados: DocumentoAssinatura[] = [];
    const erros: string[] = [];
    setFalhas([]);
    setProgresso({ feito: 0, total: escolhidos.length });
    for (const [i, c] of escolhidos.entries()) {
      try {
        const { arquivo, camposAssinatura } = gerarPdfRegulamento({ nomeCompleto: c.nomeCompleto, cpf: c.cpf, funcaoCargo: c.funcaoCargo });
        criados.push(
          await criarDocumentoAssinatura({
            categoria: 'regulamento',
            colaboradorId: c.id,
            colaboradorNome: c.nomeCompleto,
            referencia: VERSAO_REGULAMENTO,
            tipo: 'Regulamento Interno',
            titulo: TITULO_DOCUMENTO_REGULAMENTO,
            arquivo,
            camposAssinatura,
            loteId,
            criadoPor,
          })
        );
      } catch (err) {
        console.error(err);
        erros.push(c.nomeCompleto);
      }
      setProgresso({ feito: i + 1, total: escolhidos.length });
    }
    setProgresso(null);
    setFalhas(erros);
    setConcluido(criados.length);
    if (criados.length > 0) onCriados(criados);
  };

  const gerando = !!progresso;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Enviar Regulamento Interno para assinatura</h2>
            <p className="text-xs text-slate-500 mt-0.5">{ROTULO_VERSAO_REGULAMENTO} — uma cópia por colaborador, com nome e CPF no termo de ciência.</p>
          </div>
          <button type="button" onClick={onClose} disabled={gerando} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto text-xs">
          <button
            type="button"
            onClick={handleVerModelo}
            className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-[#92611F]" /> Baixar o regulamento (modelo em branco) para conferir
          </button>

          {concluido !== null ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {concluido} documento(s) criado(s).
              </p>
              <p>Agora use <strong>Enviar pendentes</strong> na lista para mandar o link de cada um pelo WhatsApp.</p>
            </div>
          ) : faltam.length === 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold">
              Todos os colaboradores ativos já receberam esta versão do regulamento.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Faltam receber: {faltam.length} {jaTem.size > 0 && <span className="text-slate-400 font-normal">({jaTem.size} já receberam)</span>}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelecionados(selecionados.size === faltam.length ? new Set() : new Set(faltam.map((c) => c.id)))
                  }
                  className="text-[#92611F] font-bold hover:underline"
                >
                  {selecionados.size === faltam.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {faltam.map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => alternar(c.id)} className="w-4 h-4 accent-[#C48229]" />
                    <span className="flex-1 font-medium text-slate-800">{c.nomeCompleto}</span>
                    <span className="text-slate-400">{c.funcaoCargo}</span>
                    {!c.cpf && <span className="text-rose-600 font-semibold">sem CPF</span>}
                  </label>
                ))}
              </div>
            </>
          )}

          {falhas.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Não foi possível criar para: {falhas.join(', ')}. Tente de novo — quem já foi criado não se repete.</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={gerando} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
            {concluido !== null ? 'Fechar' : 'Cancelar'}
          </button>
          {concluido === null && faltam.length > 0 && (
            <button
              type="button"
              onClick={handleGerar}
              disabled={gerando || selecionados.size === 0}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {gerando ? `Gerando ${progresso!.feito} de ${progresso!.total}...` : `Gerar para ${selecionados.size} colaborador(es)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
