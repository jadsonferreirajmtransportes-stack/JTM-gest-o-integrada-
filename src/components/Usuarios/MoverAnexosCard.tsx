import React, { useState } from 'react';
import { CheckCircle2, HardDriveUpload, Loader2, TriangleAlert } from 'lucide-react';
import { ProgressoMudanca, moverAnexosAntigos } from '../../utils/moverAnexosStorage';

const mb = (b: number) => `${(b / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

/** Manutenção (só administrador): move os anexos antigos em base64 para o Storage. */
export const MoverAnexosCard: React.FC = () => {
  const [rodando, setRodando] = useState(false);
  const [etapas, setEtapas] = useState<ProgressoMudanca[]>([]);
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const iniciar = async () => {
    if (
      !window.confirm(
        'Mover os anexos antigos (colaboradores, chat e projetos) para o Storage?\n\nLeva alguns minutos. Deixe esta tela aberta até terminar. Os anexos continuam abrindo normalmente durante e depois.'
      )
    )
      return;
    setRodando(true);
    setFim(false);
    setErro(null);
    try {
      await moverAnexosAntigos(setEtapas);
      setFim(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setRodando(false);
    }
  };

  const totalArquivos = etapas.reduce((s, e) => s + e.arquivos, 0);
  const totalBytes = etapas.reduce((s, e) => s + e.bytes, 0);
  const erros = etapas.flatMap((e) => e.erros);

  return (
    <div className="rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
          <HardDriveUpload className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-extrabold text-sm text-slate-900">Manutenção: mover anexos antigos para o Storage</h3>
          <p className="text-slate-500">
            Anexos antigos (ASO e dossiê dos colaboradores, anexos do chat e documentos de projetos) ainda estão guardados dentro das tabelas. Movê-los para o Storage deixa o
            banco mais leve e as telas mais rápidas. Pode rodar mais de uma vez — só mexe no que ainda falta.
          </p>
        </div>
        <button type="button" onClick={iniciar} disabled={rodando} className="px-3 py-2 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0">
          {rodando ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDriveUpload className="w-4 h-4" />} {rodando ? 'Movendo...' : 'Mover agora'}
        </button>
      </div>

      {etapas.length > 0 && (
        <div className="space-y-2">
          {etapas.map((e) => (
            <div key={e.tabela}>
              <div className="flex justify-between font-semibold text-slate-700">
                <span>{e.tabela}</span>
                <span>
                  {e.feitos}/{e.total} · {e.arquivos} arquivo(s) · {mb(e.bytes)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                <div className="h-full bg-[#C48229]" style={{ width: `${e.total ? (e.feitos / e.total) * 100 : 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {fim && (
        <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Pronto: {totalArquivos} arquivo(s), {mb(totalBytes)} movidos para o Storage.{' '}
            {totalArquivos > 0 && 'Para o banco devolver o espaço, rode no SQL Editor: vacuum full colaboradores; vacuum full chat_mensagens; vacuum full projetos_gerenciais;'}
          </span>
        </p>
      )}
      {erros.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 space-y-1">
          <p className="font-bold flex items-center gap-1">
            <TriangleAlert className="w-4 h-4" /> {erros.length} item(ns) ficaram como estavam (continuam abrindo normalmente):
          </p>
          {erros.slice(0, 10).map((x) => (
            <p key={x} className="text-[11px]">
              {x}
            </p>
          ))}
        </div>
      )}
      {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
    </div>
  );
};
