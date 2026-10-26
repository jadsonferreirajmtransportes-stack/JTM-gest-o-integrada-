import React from 'react';
import { Colaborador } from '../../types';
import type { DocumentoAssinatura } from '../../utils/documentosAssinaturaApi';
import type { Pop } from '../../utils/popsApi';
import { EnviarCienciaModal } from '../Contracheques/EnviarCienciaModal';
import { gerarPopPdf } from './popPdf';

export const tituloCienciaPop = (p: Pop) => `Procedimento ${p.codigo} — ${p.titulo} (versão ${String(p.versao).padStart(2, '0')})`;

/** Envia o POP vigente para ciência (cópia com o termo de cada colaborador, assinada no link pessoal). */
export const EnviarPopCienciaModal: React.FC<{
  pop: Pop;
  historico: Pop[];
  colaboradores: Colaborador[];
  criadoPor?: string;
  onClose: () => void;
  onEnviados: (novos: DocumentoAssinatura[]) => void;
}> = ({ pop, historico, colaboradores, criadoPor, onClose, onEnviados }) => (
  <EnviarCienciaModal
    documento={{
      categoria: 'pop',
      referencia: pop.id,
      tipo: `${pop.codigo} v${String(pop.versao).padStart(2, '0')}`,
      titulo: tituloCienciaPop(pop),
      descricao: `${pop.codigo} — ${pop.titulo} (v${String(pop.versao).padStart(2, '0')}).`,
      prefixoLote: 'pop',
      gerarPdf: (c) => gerarPopPdf(pop, { historico, ciencia: { nomeCompleto: c.nomeCompleto, cpf: c.cpf, funcaoCargo: c.funcaoCargo } }),
    }}
    colaboradores={colaboradores}
    criadoPor={criadoPor}
    onClose={onClose}
    onEnviados={onEnviados}
  />
);
