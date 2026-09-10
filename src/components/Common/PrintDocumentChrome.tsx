import React from 'react';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';
import { JmtLogo } from '../Brand/JmtLogo';

/**
 * Componentes de cabeçalho e rodapé institucional para documentos impressos/PDF,
 * conforme "Diretriz de Elaboração de Documentos em PDF" (Cód. DOC-PDF-001 v1.0).
 *
 * Uso: envolva o conteúdo imprimível de um modal com a classe `jmt-print-doc`
 * (ver src/index.css) e insira <PrintDocumentHeader/> no topo e
 * <PrintDocumentFooter/> ao final. Ambos só são renderizados na impressão
 * (`hidden print:block`) — não afetam a visualização em tela.
 */

interface PrintDocumentHeaderProps {
  /** Título do documento (H1). Ex.: "FICHA CADASTRAL DE CLIENTE" */
  titulo: string;
  /** Identificação do tipo/assunto do documento, exibida em bronze. */
  subtitulo?: string;
  /** Metadados adicionais (ex.: nome do registro, responsável). Data é sempre anexada automaticamente. */
  metadados?: string;
}

export const PrintDocumentHeader: React.FC<PrintDocumentHeaderProps> = ({
  titulo,
  subtitulo,
  metadados,
}) => {
  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  const linhaMetadados = [
    STRATEGIC_GUIDELINES.empresa,
    metadados,
    `Emitido em ${dataEmissao}`,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div className="hidden print:block jmt-print-header">
      <div className="jmt-print-header-row">
        <JmtLogo variant="full" theme="light" iconSize={32} />
        <div className="jmt-print-title-block">
          <h1 className="jmt-print-h1">{titulo}</h1>
          {subtitulo && <div className="jmt-print-subtitle">{subtitulo}</div>}
        </div>
      </div>
      <div className="jmt-print-meta">{linhaMetadados}</div>
      <div className="jmt-print-divider" />
    </div>
  );
};

export const PrintDocumentFooter: React.FC = () => (
  <div className="hidden print:block jmt-print-footer">
    {STRATEGIC_GUIDELINES.assinatura}
  </div>
);

/**
 * Bloco de Norteadores Institucionais (Missão/Visão/Valores) — obrigatório em
 * documentos de caráter institucional ou comercial (propostas, apresentações,
 * portfólios, onboarding). Dispensável em documentos operacionais recorrentes.
 */
export const PrintNorteadoresBlock: React.FC = () => {
  const { missao, visao } = STRATEGIC_GUIDELINES;
  return (
    <div className="hidden print:block jmt-print-norteadores">
      <div className="jmt-print-norteadores-titulo">Missão &amp; Visão — JMT</div>
      <p className="jmt-print-norteadores-texto">
        <strong>Missão:</strong> {missao.frase}
      </p>
      <p className="jmt-print-norteadores-texto">
        <strong>Visão:</strong> {visao.frase}
      </p>
    </div>
  );
};
