import React, { useState } from 'react';
import { AlertTriangle, Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Cliente, DocumentoCliente } from '../../types';
import { enviarArquivo, obterUrlArquivo, removerArquivo } from '../../utils/arquivosStorage';

// Aba "Documentos" da ficha do cliente: contrato, aditivos, licenças, cartão CNPJ... Os
// arquivos vão para o Storage privado ("anexos", pasta clientes/<id>) — o cadastro guarda só
// a lista com a referência (migração 080). Documento com validade mostra quando vence.

export const TIPOS_DOCUMENTO_CLIENTE = [
  'Contrato',
  'Aditivo contratual',
  'Proposta comercial assinada',
  'Tabela de frete assinada',
  'Licença sanitária (LS)',
  'AFE / AE (ANVISA)',
  'Alvará de funcionamento',
  'Cartão CNPJ',
  'Certificado / Auditoria',
  'Procuração',
  'Outro',
];

const LIMITE_MB = 8;
const hoje = () => new Date().toISOString().slice(0, 10);
const dataBr = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—');
const tamanhoLegivel = (b?: number) => (!b ? '' : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

function situacaoValidade(validade?: string): { texto: string; cor: string } | null {
  if (!validade) return null;
  const dias = Math.round((Date.parse(`${validade}T12:00:00`) - Date.parse(`${hoje()}T12:00:00`)) / 86400000);
  if (dias < 0) return { texto: `vencido há ${-dias} dia(s)`, cor: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (dias <= 30) return { texto: `vence em ${dias} dia(s)`, cor: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { texto: `válido até ${dataBr(validade)}`, cor: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export const DocumentosCliente: React.FC<{
  cliente: Cliente;
  podeEditar: boolean;
  usuarioNome?: string;
  onSalvar: (documentos: DocumentoCliente[]) => void;
}> = ({ cliente, podeEditar, usuarioNome, onSalvar }) => {
  const documentos = [...(cliente.documentos || [])].sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
  const [tipo, setTipo] = useState(TIPOS_DOCUMENTO_CLIENTE[0]);
  const [descricao, setDescricao] = useState('');
  const [validade, setValidade] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const vencendo = documentos.filter((d) => d.validade && d.validade <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).length;

  const enviar = async () => {
    if (!arquivo) return;
    if (arquivo.size > LIMITE_MB * 1024 * 1024) return setErro(`O arquivo passa de ${LIMITE_MB} MB. Reduza (ou divida) e tente de novo.`);
    setEnviando(true);
    setErro(null);
    try {
      const ref = await enviarArquivo(arquivo, `clientes/${cliente.id}`);
      const novo: DocumentoCliente = {
        id: `doccli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tipo,
        descricao: descricao.trim() || undefined,
        validade: validade || undefined,
        arquivoRef: ref,
        arquivoNome: arquivo.name,
        tamanho: arquivo.size,
        enviadoEm: new Date().toISOString(),
        enviadoPor: usuarioNome,
      };
      onSalvar([novo, ...(cliente.documentos || [])]);
      setDescricao('');
      setValidade('');
      setArquivo(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o documento.');
    } finally {
      setEnviando(false);
    }
  };

  const abrir = async (d: DocumentoCliente) => {
    setAbrindo(d.id);
    try {
      const url = await obterUrlArquivo(d.arquivoRef);
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('Não foi possível abrir o documento agora.');
    } finally {
      setAbrindo(null);
    }
  };

  const apagar = async (d: DocumentoCliente) => {
    if (!window.confirm(`Apagar "${d.tipo}${d.descricao ? ` — ${d.descricao}` : ''}"? O arquivo é removido de vez.`)) return;
    try {
      await removerArquivo(d.arquivoRef);
    } catch (e) {
      console.error(e);
    }
    onSalvar((cliente.documentos || []).filter((x) => x.id !== d.id));
  };

  return (
    <div className="space-y-4">
      {vencendo > 0 && (
        <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" /> {vencendo} documento(s) vencido(s) ou vencendo nos próximos 30 dias.
        </p>
      )}

      {podeEditar && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Adicionar documento</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="block text-[11px] text-slate-500">
              Tipo
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-0.5 w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900">
                {TIPOS_DOCUMENTO_CLIENTE.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-slate-500">
              Descrição (opcional)
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: contrato 2026–2027"
                className="mt-0.5 w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900"
              />
            </label>
            <label className="block text-[11px] text-slate-500">
              Validade (opcional)
              <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="mt-0.5 w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> {arquivo ? 'Trocar arquivo' : 'Escolher arquivo'}
              <input type="file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
            </label>
            {arquivo && (
              <span className="text-[11px] text-slate-600 truncate max-w-[220px]">
                {arquivo.name} · {tamanhoLegivel(arquivo.size)}
              </span>
            )}
            <button
              type="button"
              onClick={enviar}
              disabled={!arquivo || enviando}
              className="ml-auto px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Enviar documento
            </button>
          </div>
          <p className="text-[10px] text-slate-400">PDF, imagem, Word ou Excel, até {LIMITE_MB} MB por arquivo.</p>
          {erro && <p className="text-[11px] text-rose-600 font-semibold">{erro}</p>}
        </div>
      )}

      {documentos.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-6">Nenhum documento anexado a este cliente.</p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {documentos.map((d) => {
            const sit = situacaoValidade(d.validade);
            return (
              <div key={d.id} className="px-3 py-2.5 flex items-center gap-3 bg-white">
                <span className="w-9 h-9 rounded-lg bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {d.tipo}
                    {d.descricao ? <span className="font-normal text-slate-600"> — {d.descricao}</span> : null}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {d.arquivoNome} {d.tamanho ? `· ${tamanhoLegivel(d.tamanho)}` : ''} · enviado em {dataBr(d.enviadoEm.slice(0, 10))}
                    {d.enviadoPor ? ` por ${d.enviadoPor}` : ''}
                  </p>
                </div>
                {sit && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${sit.cor}`}>{sit.texto}</span>}
                <button
                  type="button"
                  onClick={() => abrir(d)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#92611F] hover:bg-amber-50 shrink-0"
                  title="Abrir / baixar"
                >
                  {abrindo === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
                {podeEditar && (
                  <button type="button" onClick={() => apagar(d)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0" title="Apagar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
