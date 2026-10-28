import React, { useState } from 'react';
import { X, Users, FileSignature, AlertTriangle } from 'lucide-react';
import { Colaborador } from '../../types';
import type { BlocoDocumento, DocumentoPadronizado } from '../../utils/documentosPadronizadosApi';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import { DocumentosAssinaturaView } from '../Contracheques/DocumentosAssinaturaView';
import { EnviarCienciaModal } from '../Contracheques/EnviarCienciaModal';
import { gerarPdfDocumento } from './gerarDocumento';

/** Referência das vias individuais (uma por colaborador) — separada das assinaturas do bloco
 *  (Elaborado/Revisado/Aprovado), que usam '<id>@v<versão>'. */
export const referenciaViasDocumento = (d: DocumentoPadronizado) => `${d.id}@v${d.versao}#vias`;

const ID_BLOCO_VIA = 'via-colaborador';

/** Cópia do documento personalizada para um colaborador: "Eu, ____" e "CPF ____" preenchidos e a
 *  1ª pessoa do bloco Assinaturas vira ele (sem bloco, acrescenta um no fim). Devolve também onde
 *  fica a linha de assinatura, para o comprovante desenhar a assinatura no lugar certo. */
export async function viaDoColaborador(d: DocumentoPadronizado, c: Colaborador) {
  const preencher = (t: string) =>
    t
      .replace(/\b(Eu,?\s*)_{4,}/i, `$1${c.nomeCompleto}`)
      .replace(/\b(CPF(?:\s*n[ºo°.]*)?\s*:?\s*)_{4,}/i, `$1${c.cpf || '___________'}`);
  let posicao = '';
  const blocos: BlocoDocumento[] = d.blocos.map((b) => {
    if (b.tipo === 'paragrafo' || b.tipo === 'destaque') return { ...b, texto: preencher(b.texto) };
    if (b.tipo === 'lista') return { ...b, itens: b.itens.map(preencher) };
    // Só usa o bloco quando o 1º espaço está sem nome (ex.: "Colaborador(a)" do termo); um bloco
    // Elaborado/Aprovado já preenchido continua igual e a via ganha um espaço próprio no fim.
    if (b.tipo === 'assinaturas' && !posicao && b.pessoas.length && !b.pessoas[0].nome?.trim()) {
      posicao = `${b.id}:0`;
      return { ...b, pessoas: b.pessoas.map((p, i) => (i === 0 ? { ...p, nome: c.nomeCompleto, cargo: c.funcaoCargo || p.cargo } : p)) };
    }
    return b;
  });
  if (!posicao) {
    blocos.push({ id: ID_BLOCO_VIA, tipo: 'assinaturas', comData: true, pessoas: [{ papel: 'Colaborador(a)', nome: c.nomeCompleto, cargo: c.funcaoCargo }] });
    posicao = `${ID_BLOCO_VIA}:0`;
  }
  const campos: Record<string, CampoAssinaturaPdf> = {};
  const arquivo = await gerarPdfDocumento({ ...d, blocos }, { campos });
  const nome = arquivo.name.replace(/\.pdf$/i, `_${c.nomeCompleto}.pdf`.replace(/[^\p{L}\p{N}.-]+/gu, '_'));
  return { arquivo: new File([arquivo], nome, { type: 'application/pdf' }), camposAssinatura: campos[posicao] ? [campos[posicao]] : [] };
}

/** Enviar o documento padronizado para VÁRIOS colaboradores — cada um recebe a própria via
 *  (com o nome dele) no link pessoal, em Documentos, e assina. Ex.: termo de adesão. */
export const CienciaDocumentoModal: React.FC<{
  documento: DocumentoPadronizado;
  colaboradores: Colaborador[];
  criadoPor?: string;
  onClose: () => void;
}> = ({ documento: d, colaboradores, criadoPor, onClose }) => {
  const [escolhendo, setEscolhendo] = useState(false);
  const [versaoLista, setVersaoLista] = useState(0);
  const referencia = referenciaViasDocumento(d);
  const titulo = `${d.codigo || 'Documento'} — ${d.titulo} (versão ${d.versao})`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C48229]" /> Enviar para colaboradores assinarem
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {titulo}. Cada colaborador recebe a própria via (com o nome e o CPF dele) em Documentos, no link pessoal, e assina.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {d.status !== 'Vigente' && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Este documento ainda está como <b className="mx-1">{d.status}</b> — o ideal é publicar como Vigente antes de colher as assinaturas.
            </p>
          )}
          <button
            type="button"
            onClick={() => setEscolhendo(true)}
            className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
          >
            <FileSignature className="w-4 h-4" /> Escolher colaboradores
          </button>
          <DocumentosAssinaturaView key={versaoLista} categoria="padronizado" colaboradores={colaboradores} compacto referenciaFixa={referencia} />
        </div>
      </div>

      {escolhendo && (
        <EnviarCienciaModal
          documento={{
            categoria: 'padronizado',
            referencia,
            tipo: 'Colaborador(a)',
            titulo,
            descricao: `${titulo}.`,
            prefixoLote: 'vias-documento',
            gerarPdf: (c) => viaDoColaborador(d, c),
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
