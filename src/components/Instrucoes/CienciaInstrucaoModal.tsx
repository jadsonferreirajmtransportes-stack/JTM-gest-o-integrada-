import React, { useState } from 'react';
import { X, Users, FileSignature, AlertTriangle } from 'lucide-react';
import { Colaborador, InstrucaoTrabalho } from '../../types';
import { DocumentosAssinaturaView } from '../Contracheques/DocumentosAssinaturaView';
import { EnviarCienciaModal } from '../Contracheques/EnviarCienciaModal';
import { gerarInstrucaoPdf, tituloCienciaInstrucao } from './instrucaoPdf';

/** Referência da ciência = instrução + versão: uma versão nova pode ser enviada de novo a todos. */
export const referenciaCienciaInstrucao = (i: InstrucaoTrabalho) => `${i.id}@v${i.versao}`;

/** Compartilhar a Instrução de Trabalho com os colaboradores: escolher quem recebe (vai para
 *  Documentos no link pessoal, com termo de ciência para assinar) e acompanhar quem já assinou,
 *  com o aviso pelo WhatsApp — mesmo fluxo dos POPs. */
export const CienciaInstrucaoModal: React.FC<{
  instrucao: InstrucaoTrabalho;
  colaboradores: Colaborador[];
  criadoPor?: string;
  onClose: () => void;
}> = ({ instrucao, colaboradores, criadoPor, onClose }) => {
  const [escolhendo, setEscolhendo] = useState(false);
  const [versaoLista, setVersaoLista] = useState(0);
  const vigente = instrucao.status === 'Vigente';
  const referencia = referenciaCienciaInstrucao(instrucao);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C48229]" /> Compartilhar com os colaboradores
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {instrucao.codigo} — {instrucao.titulo} (versão {instrucao.versao}). O colaborador recebe no link pessoal, em <b>Documentos</b>, lê e assina a ciência.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {vigente ? (
            <button
              type="button"
              onClick={() => setEscolhendo(true)}
              className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <FileSignature className="w-4 h-4" /> Escolher colaboradores
            </button>
          ) : (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Só dá para enviar uma instrução <b className="mx-1">Vigente</b> — mude o status para Vigente e salve antes de enviar.
            </p>
          )}
          <DocumentosAssinaturaView key={versaoLista} categoria="instrucao" colaboradores={colaboradores} compacto referenciaFixa={referencia} />
        </div>
      </div>

      {escolhendo && (
        <EnviarCienciaModal
          documento={{
            categoria: 'instrucao',
            referencia,
            tipo: `${instrucao.codigo} v${instrucao.versao}`,
            titulo: tituloCienciaInstrucao(instrucao),
            descricao: `${instrucao.codigo} — ${instrucao.titulo} (versão ${instrucao.versao}).`,
            prefixoLote: 'instrucao',
            gerarPdf: (c) => gerarInstrucaoPdf(instrucao, { ciencia: { nomeCompleto: c.nomeCompleto, cpf: c.cpf, funcaoCargo: c.funcaoCargo } }),
          }}
          colaboradores={colaboradores}
          criadoPor={criadoPor}
          onClose={() => setEscolhendo(false)}
          onEnviados={() => setVersaoLista((v) => v + 1)}
        />
      )}
    </div>
  );
};
