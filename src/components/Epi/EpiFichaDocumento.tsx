import React from 'react';
import { JmtLogo } from '../Brand/JmtLogo';
import { formatDate } from '../../utils/formatters';

export interface LinhaFichaEpi {
  descricao: string;
  ca: string;
  entrega: string; // YYYY-MM-DD
  devolucao?: string; // YYYY-MM-DD
}

interface EpiFichaDocumentoProps {
  /** id do elemento na página — usado tanto pelo `window.print()` (via .jmt-print-doc) quanto
   *  pelo "Baixar PDF" (html2canvas captura por este id, ver pdfExportUtils.ts). */
  elementId: string;
  colaboradorNome: string;
  funcaoCargo?: string;
  linhas: LinhaFichaEpi[];
}

/**
 * Réplica fiel da "FICHA DE CONTROLE DE ENTREGA DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL E.P.I."
 * de papel já usada pela JMT ("Registro de EPIs_JM_Transportes_Atualizados.pdf") — uma ficha
 * corrida por colaborador, acumulando TODAS as entregas já feitas a ele (uma linha por item),
 * não um recibo por evento isolado. Usa `.jmt-print-styled` (ver index.css) pra manter as cores
 * da diretriz do papel (barras amarelas) idênticas na tela e na impressão/PDF, em vez do reset
 * institucional bronze/grafite usado no resto do sistema — este documento replica um formulário
 * legal já existente da empresa, não é um documento novo com a identidade visual genérica.
 */
export const EpiFichaDocumento: React.FC<EpiFichaDocumentoProps> = ({
  elementId,
  colaboradorNome,
  funcaoCargo,
  linhas,
}) => {
  return (
    <div id={elementId} className="jmt-print-doc jmt-print-styled bg-white text-black p-6 text-xs">
      <div className="border border-black flex items-stretch mb-4">
        <div className="border-r border-black px-4 py-3 flex items-center shrink-0">
          <JmtLogo variant="full" theme="light" iconSize={30} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-xl font-bold tracking-wide">FORNECIMENTO DE EPI</h1>
        </div>
      </div>

      <table className="w-full border-collapse mb-4">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 font-semibold w-32">Funcionário (a):</td>
            <td className="border border-black px-2 py-1">{colaboradorNome}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-semibold">Função:</td>
            <td className="border border-black px-2 py-1">{funcaoCargo || '—'}</td>
          </tr>
        </tbody>
      </table>

      <div className="bg-[#FFC000] border border-black text-center font-bold py-1.5 mb-3">
        FICHA DE CONTROLE DE ENTREGA DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL E.P.I.
      </div>

      <div className="border border-black mb-4">
        <div className="bg-[#FFC000] border-b border-black text-center font-bold py-1.5">TERMO DE RESPONSABILIDADE</div>
        <div className="p-3 space-y-2">
          <p>
            Quanto ao fornecimento do E.P.I pelo empregador e utilização por parte do empregado, deve-se observar o
            seguinte:
          </p>
          <p className="font-bold">CABE AO EMPREGADOR</p>
          <ul className="list-disc pl-6 space-y-0.5">
            <li>Cabe ao empregador a quanto ao E.P.I;</li>
            <li>Adquirir o adequado ao risco de cada atividade;</li>
            <li>Exigir seu uso;</li>
            <li>
              Fornecer ao trabalhador somente o aprovado pelo órgão nacional competente em matéria de segurança e
              saúde no trabalho;
            </li>
            <li>Orientar e treinar o trabalhador sobre o uso adequado;</li>
            <li>Substituir imediatamente, quando danificado ou extraviado;</li>
            <li>
              Registrar o seu fornecimento ao trabalhador, podendo ser adotados livros, fichas ou sistemas
              eletrônicos.
            </li>
          </ul>
          <p className="font-bold">CABE AO EMPREGADO</p>
          <ul className="list-disc pl-6 space-y-0.5">
            <li>Cabe ao empregado quanto ao E.P.I.</li>
            <li>Usar, utilizando-o apenas para finalidade a que se destina;</li>
            <li>Responsabilizar-se pela guarda e conservação;</li>
            <li>Comunicar ao empregador qualquer alteração que o tome improprio para uso;</li>
            <li>Cumprir as determinações do empregador sobre o uso adequado.</li>
          </ul>
        </div>
      </div>

      <table className="w-full border-collapse mb-10">
        <thead>
          <tr className="bg-[#FFC000]">
            <th className="border border-black px-2 py-1.5 text-left">Descrição do E.P.I.</th>
            <th className="border border-black px-2 py-1.5">CA</th>
            <th className="border border-black px-2 py-1.5">Entrega</th>
            <th className="border border-black px-2 py-1.5">Devolução</th>
            <th className="border border-black px-2 py-1.5 text-left">Assinatura do funcionário</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, idx) => (
            <tr key={idx}>
              <td className="border border-black px-2 py-1.5">{linha.descricao}</td>
              <td className="border border-black px-2 py-1.5 text-center">{linha.ca || '—'}</td>
              <td className="border border-black px-2 py-1.5 text-center">{formatDate(linha.entrega)}</td>
              <td className="border border-black px-2 py-1.5 text-center">
                {linha.devolucao ? formatDate(linha.devolucao) : '—'}
              </td>
              <td className="border border-black px-2 py-1.5" />
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr>
              <td colSpan={5} className="border border-black px-2 py-4 text-center text-slate-500">
                Nenhuma entrega registrada ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="text-center">
        <div className="border-t border-black w-72 mx-auto pt-1">
          <span className="font-semibold">ASSINATURA DO FUNCIONÁRIO (A)</span>
        </div>
      </div>
    </div>
  );
};
