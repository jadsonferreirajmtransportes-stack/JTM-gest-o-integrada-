import React, { useState } from 'react';
import { X, CreditCard, FileSignature } from 'lucide-react';
import { Colaborador, UsuarioLogin } from '../../types';
import { DocumentosAssinaturaView } from '../Contracheques/DocumentosAssinaturaView';
import { EnviarCienciaModal } from '../Contracheques/EnviarCienciaModal';
import { DadosTermoCartaoVa, gerarTermoCartaoVaPdf, tituloTermoCartaoVa } from './termoCartaoVaPdf';

const hoje = () => new Date().toISOString().slice(0, 10);

/** Termo de entrega do cartão de vale-alimentação: o DP informa operadora e data, escolhe os
 *  colaboradores e cada um recebe o termo em "Documentos" no link pessoal para assinar. Embaixo,
 *  a lista de todos os termos enviados (status, WhatsApp, baixar assinados). */
export const TermoCartaoVaModal: React.FC<{ colaboradores: Colaborador[]; currentUser?: UsuarioLogin; onClose: () => void }> = ({ colaboradores, currentUser, onClose }) => {
  const [dados, setDados] = useState<DadosTermoCartaoVa>({ operadora: '', dataEntrega: hoje(), motivo: 'entrega' });
  const [escolhendo, setEscolhendo] = useState(false);
  const [versaoLista, setVersaoLista] = useState(0);
  const campo = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#C48229]" /> Termo de entrega do cartão de vale-alimentação
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">O colaborador recebe o termo no link pessoal, em Documentos, e assina pelo celular.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-3 grid sm:grid-cols-[1fr_160px_180px_auto] gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Operadora do cartão</label>
              <input value={dados.operadora} onChange={(e) => setDados({ ...dados, operadora: e.target.value })} placeholder="Ex.: VR, Alelo, Ticket" className={campo} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data da entrega</label>
              <input type="date" value={dados.dataEntrega} onChange={(e) => setDados({ ...dados, dataEntrega: e.target.value || hoje() })} className={campo} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo</label>
              <select value={dados.motivo} onChange={(e) => setDados({ ...dados, motivo: e.target.value as DadosTermoCartaoVa['motivo'] })} className={campo}>
                <option value="entrega">Entrega do cartão</option>
                <option value="segunda_via">2ª via (reposição)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setEscolhendo(true)}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-lg flex items-center gap-2 justify-center"
            >
              <FileSignature className="w-4 h-4" /> Escolher colaboradores
            </button>
          </div>

          <DocumentosAssinaturaView key={versaoLista} categoria="termo_cartao_va" colaboradores={colaboradores} currentUser={currentUser} compacto />
        </div>
      </div>

      {escolhendo && (
        <EnviarCienciaModal
          documento={{
            categoria: 'termo_cartao_va',
            // Mesma data + tipo = mesmo termo: quem já recebeu fica de fora; 2ª via ou outra data gera um novo.
            referencia: `cartao-va-${dados.motivo}-${dados.dataEntrega}`,
            tipo: dados.motivo === 'segunda_via' ? '2ª via do cartão' : 'Entrega do cartão',
            titulo: tituloTermoCartaoVa(dados),
            descricao: `${tituloTermoCartaoVa(dados)}.`,
            prefixoLote: 'termo-va',
            gerarPdf: (c) => gerarTermoCartaoVaPdf(dados, c),
          }}
          colaboradores={colaboradores}
          criadoPor={currentUser?.nome}
          onClose={() => setEscolhendo(false)}
          onEnviados={() => setVersaoLista((v) => v + 1)}
        />
      )}
    </div>
  );
};
