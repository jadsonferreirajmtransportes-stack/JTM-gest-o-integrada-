import React, { useEffect, useState } from 'react';
import {
  X,
  Gavel,
  CheckCircle2,
  XCircle,
  FileText,
  MessageCircle,
  Link2,
  Download,
  UserX,
  Loader2,
  AlertTriangle,
  Ban,
  Info,
} from 'lucide-react';
import { Colaborador, Empregador, Ocorrencia, UsuarioLogin } from '../../types';
import { MedidaDisciplinar, TestemunhaRecusa, getMedidaDisciplinar, saveMedidaDisciplinar } from '../../utils/disciplinarApi';
import {
  DocumentoAssinatura,
  criarDocumentoAssinatura,
  getDocumentoAssinatura,
  montarLinkDocumento,
} from '../../utils/documentosAssinaturaApi';
import { obterUrlArquivo } from '../../utils/arquivosStorage';
import { baixarArquivo } from '../../utils/downloadUtils';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';
import { AssinaturaDigitalPad } from '../Epi/AssinaturaDigitalPad';
import { gerarPdfAssinado } from '../Contracheques/pdfAssinadoUtils';
import { ESCADA_DISCIPLINAR, avaliarMedida, contaParaReincidencia, descreverEnquadramento, situacaoDisciplinar } from './disciplinarRegras';
import { gerarPdfComRecusa, gerarPdfMedidaDisciplinar, tituloMedida } from './disciplinarPdf';

interface MedidaDetalheModalProps {
  medida: MedidaDisciplinar;
  medidas: MedidaDisciplinar[];
  colaboradores: Colaborador[];
  empregadores: Empregador[];
  ocorrencias: Ocorrencia[];
  currentUser?: UsuarioLogin;
  ehAdmin: boolean;
  onClose: () => void;
  onAtualizada: (m: MedidaDisciplinar) => void;
  onDocumentoAtualizado: (d: DocumentoAssinatura) => void;
  /** Cria/remove a ocorrência no prontuário (suspensão entra no desconto do VA). */
  onSalvarOcorrencia: (o: Ocorrencia) => Promise<void>;
  onExcluirOcorrencia: (id: string) => Promise<void>;
}

function dataBr(iso?: string): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
function dataHora(iso?: string): string {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}
const hojeIso = () => new Date().toISOString().slice(0, 10);

function baixarBlobComo(arquivo: File) {
  const href = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = href;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

export const MedidaDetalheModal: React.FC<MedidaDetalheModalProps> = ({
  medida,
  medidas,
  colaboradores,
  empregadores,
  ocorrencias,
  currentUser,
  ehAdmin,
  onClose,
  onAtualizada,
  onDocumentoAtualizado,
  onSalvarOcorrencia,
  onExcluirOcorrencia,
}) => {
  const [m, setM] = useState<MedidaDisciplinar>(medida);
  const [documento, setDocumento] = useState<DocumentoAssinatura | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [inicioSuspensao, setInicioSuspensao] = useState(medida.suspensaoInicio || '');
  const [mostrarRecusa, setMostrarRecusa] = useState(false);
  const [testemunhas, setTestemunhas] = useState<TestemunhaRecusa[]>([{ nome: '' }, { nome: '' }]);

  const colaborador = colaboradores.find((c) => c.id === m.colaboradorId);
  const empregador = empregadores.find((e) => e.id === colaborador?.empregadorId);
  const interno = m.tipo === 'Recomendação de justa causa';
  const situacao = situacaoDisciplinar(m.colaboradorId, medidas.filter((x) => x.id !== m.id));
  const alertas = avaliarMedida({
    colaboradorId: m.colaboradorId,
    etapaEscolhida: m.etapa,
    etapaSugerida: situacao.proxima.etapa,
    dataFato: m.dataFato,
    dataCienciaFato: m.dataCienciaFato,
    dataAplicacao: m.aprovadoEm?.slice(0, 10) || hojeIso(),
    enquadramento: m.enquadramento,
    enquadramentoOutro: m.enquadramentoOutro,
    diasSuspensao: m.diasSuspensao,
    justificativaEtapa: m.justificativaEtapa,
    medidaId: m.id,
    medidas,
  }).filter((a) => a.nivel !== 'erro' || m.status === 'Proposta');

  useEffect(() => {
    // Registro completo (com as assinaturas das testemunhas, se houver) + documento de ciência.
    getMedidaDisciplinar(medida.id).then((completo) => completo && setM(completo)).catch(console.error);
    if (medida.documentoId) getDocumentoAssinatura(medida.documentoId).then(setDocumento).catch(console.error);
  }, [medida.id, medida.documentoId]);

  const executar = async (acao: string, fn: () => Promise<void>) => {
    setErro(null);
    setOcupado(acao);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(null);
    }
  };

  const salvar = async (atualizada: MedidaDisciplinar) => {
    const salva = await saveMedidaDisciplinar(atualizada);
    setM(salva);
    onAtualizada(salva);
    return salva;
  };

  const historicoValido = medidas.filter(
    (x) => x.id !== m.id && x.colaboradorId === m.colaboradorId && contaParaReincidencia(x)
  );

  const handleAprovar = () =>
    executar('aprovar', async () => {
      if (m.tipo === 'Suspensão' && !inicioSuspensao) throw new Error('Informe a data de início da suspensão.');
      const agora = new Date().toISOString();
      let aprovada: MedidaDisciplinar = {
        ...m,
        status: 'Aprovada',
        aprovadoPor: currentUser?.nome,
        aprovadoEm: agora,
        suspensaoInicio: m.tipo === 'Suspensão' ? inicioSuspensao : m.suspensaoInicio,
      };
      // Registro no prontuário (Ocorrências) — a suspensão entra no desconto do VA.
      if (!interno) {
        const ocorrenciaId = `oco-disc-${m.id}`;
        await onSalvarOcorrencia({
          id: ocorrenciaId,
          colaboradorId: m.colaboradorId,
          colaboradorNome: m.colaboradorNome,
          setor: colaborador?.setor,
          dataOcorrencia: m.tipo === 'Suspensão' ? inicioSuspensao : agora.slice(0, 10),
          tipo: m.tipo === 'Suspensão' ? 'Suspensão disciplinar' : m.tipo === 'Advertência escrita' ? 'Advertência escrita' : 'Advertência',
          diasAfastamento: m.tipo === 'Suspensão' ? m.diasSuspensao : undefined,
          descricao: `${tituloMedida(m)} — ${m.descricaoFato}`,
          status: 'Resolvida',
          acaoTomada: `Medida disciplinar aprovada por ${currentUser?.nome || 'administrador'} (Módulo Disciplinar).`,
          registradoPor: currentUser?.nome,
          origem: 'Módulo Disciplinar',
          criadoEm: agora,
        });
        aprovada = { ...aprovada, ocorrenciaId };
      }
      await salvar(aprovada);
    });

  const handleRejeitar = () => {
    const motivo = window.prompt('Motivo da rejeição (fica registrado para quem propôs):');
    if (motivo === null) return;
    executar('rejeitar', async () => {
      await salvar({ ...m, status: 'Rejeitada', motivoRejeicao: motivo.trim(), aprovadoPor: currentUser?.nome, aprovadoEm: new Date().toISOString() });
    });
  };

  const handleCancelar = () => {
    const motivo = window.prompt(
      'Cancelar esta medida? Ela deixa de contar para a progressão e a ocorrência do prontuário é removida.\n\nMotivo:'
    );
    if (motivo === null) return;
    executar('cancelar', async () => {
      if (m.ocorrenciaId) await onExcluirOcorrencia(m.ocorrenciaId);
      await salvar({
        ...m,
        status: 'Cancelada',
        ocorrenciaId: undefined,
        observacoes: [m.observacoes, `Cancelada por ${currentUser?.nome || 'admin'} em ${new Date().toLocaleDateString('pt-BR')}: ${motivo.trim()}`]
          .filter(Boolean)
          .join('\n'),
      });
    });
  };

  const gerarPdf = () =>
    gerarPdfMedidaDisciplinar({
      medida: m,
      colaborador: colaborador || { nomeCompleto: m.colaboradorNome },
      empregador,
      historico: historicoValido,
    });

  const handleGerarDocumento = () =>
    executar('gerar', async () => {
      const { arquivo, camposAssinatura } = gerarPdf();
      const doc = await criarDocumentoAssinatura({
        categoria: 'disciplinar',
        colaboradorId: m.colaboradorId,
        colaboradorNome: m.colaboradorNome,
        referencia: m.dataFato,
        tipo: m.tipo,
        titulo: tituloMedida(m),
        arquivo,
        camposAssinatura,
        criadoPor: currentUser?.nome,
      });
      setDocumento(doc);
      onDocumentoAtualizado(doc);
      await salvar({ ...m, documentoId: doc.id });
    });

  const mensagemWhatsApp = (d: DocumentoAssinatura) =>
    `Olá, ${m.colaboradorNome.split(' ')[0]}. O Departamento Pessoal da JM Transportes enviou para sua ciência o documento "${d.titulo}".\n\n` +
    `Acesse o link abaixo, leia e assine (para abrir, informe seu CPF):\n${montarLinkDocumento(d.token, d.categoria)}`;

  const handleWhatsApp = () => {
    if (!documento) return;
    const link = buildWhatsAppLink(colaborador?.telefoneWhatsapp || '', mensagemWhatsApp(documento));
    if (!link) {
      alert('Colaborador sem WhatsApp cadastrado. Use "Copiar link" ou entregue impresso.');
      return;
    }
    window.open(link, 'jmt-whatsapp');
  };

  const handleCopiarLink = async () => {
    if (!documento) return;
    const link = montarLinkDocumento(documento.token, documento.categoria);
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copiado.');
    } catch {
      window.prompt('Copie o link:', link);
    }
  };

  const handleBaixar = () =>
    executar('baixar', async () => {
      if (interno || !documento) {
        baixarBlobComo(gerarPdf().arquivo);
        return;
      }
      if (documento.status === 'Assinado') {
        const completo = (await getDocumentoAssinatura(documento.id)) || documento;
        baixarBlobComo(await gerarPdfAssinado(completo, colaborador?.cpf));
        return;
      }
      if (m.status === 'Recusou-se a assinar' && m.recusaTestemunhas?.length) {
        const resposta = await fetch(await obterUrlArquivo(documento.arquivoRef));
        baixarBlobComo(await gerarPdfComRecusa(await resposta.arrayBuffer(), m, m.recusaTestemunhas));
        return;
      }
      await baixarArquivo(documento.arquivoRef, documento.arquivoNome || 'medida.pdf');
    });

  const recusaValida = testemunhas.every((t) => t.nome.trim() && t.assinatura);
  const handleRegistrarRecusa = () =>
    executar('recusa', async () => {
      if (!recusaValida) throw new Error('Informe o nome e colete a assinatura das duas testemunhas.');
      await salvar({
        ...m,
        status: 'Recusou-se a assinar',
        recusaTestemunhas: testemunhas.map((t) => ({ ...t, nome: t.nome.trim(), cpf: t.cpf?.trim() || undefined })),
        recusaRegistradaEm: new Date().toISOString(),
        recusaRegistradaPor: currentUser?.nome,
      });
      setMostrarRecusa(false);
    });

  const statusCiencia =
    m.status === 'Recusou-se a assinar'
      ? 'Recusou-se a assinar (ciência por testemunhas)'
      : documento
        ? documento.status === 'Assinado'
          ? `Ciente — assinado em ${dataHora(documento.assinadoEm)}`
          : documento.status === 'Visualizado'
            ? 'Visualizado pelo colaborador, ainda sem assinatura'
            : 'Enviado, ainda não aberto'
        : interno
          ? 'Uso interno (sem ciência do colaborador)'
          : 'Documento ainda não gerado';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-[#C48229]" />
              {tituloMedida(m)}
            </h2>
            <p className="text-[11px] text-slate-500">
              {m.colaboradorNome} • etapa {m.etapa} de {ESCADA_DISCIPLINAR.length} • {m.status}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <p><span className="text-slate-500">Data do fato:</span> <strong>{dataBr(m.dataFato)}</strong></p>
            <p><span className="text-slate-500">Empresa soube em:</span> <strong>{dataBr(m.dataCienciaFato)}</strong></p>
            <p><span className="text-slate-500">Proposta por:</span> {m.propostoPor || '—'} em {dataHora(m.propostoEm)}</p>
            <p>
              <span className="text-slate-500">{m.status === 'Rejeitada' ? 'Rejeitada' : 'Aprovada'} por:</span>{' '}
              {m.aprovadoPor ? `${m.aprovadoPor} em ${dataHora(m.aprovadoEm)}` : '—'}
            </p>
            {m.tipo === 'Suspensão' && (
              <p className="col-span-2">
                <span className="text-slate-500">Suspensão:</span> <strong>{m.diasSuspensao} dia(s)</strong>
                {m.suspensaoInicio && ` a partir de ${dataBr(m.suspensaoInicio)}`}
              </p>
            )}
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <p className="text-slate-500 font-semibold">Fato</p>
            <p className="whitespace-pre-wrap text-slate-800">{m.descricaoFato}</p>
            <p className="text-slate-500 pt-1">
              <strong>Enquadramento:</strong> {descreverEnquadramento(m.enquadramento, m.enquadramentoOutro) || '—'}
            </p>
            {m.testemunhasFato && <p className="text-slate-500"><strong>Testemunhas do fato:</strong> {m.testemunhasFato}</p>}
            {m.justificativaEtapa && <p className="text-slate-500"><strong>Justificativa da etapa:</strong> {m.justificativaEtapa}</p>}
            {m.ocorrenciasRelacionadas.length > 0 && (
              <p className="text-slate-500">
                <strong>Ocorrências relacionadas:</strong>{' '}
                {m.ocorrenciasRelacionadas
                  .map((id) => ocorrencias.find((o) => o.id === id))
                  .filter(Boolean)
                  .map((o) => `${dataBr(o!.dataOcorrencia || o!.data)} ${o!.tipo}`)
                  .join('; ')}
              </p>
            )}
            {m.motivoRejeicao && <p className="text-rose-700"><strong>Motivo da rejeição:</strong> {m.motivoRejeicao}</p>}
            {m.observacoes && <p className="text-slate-500 whitespace-pre-wrap"><strong>Observações:</strong> {m.observacoes}</p>}
          </div>

          {alertas.length > 0 && (
            <div className="space-y-1.5">
              {alertas.map((a, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    a.nivel === 'erro' ? 'bg-rose-50 border-rose-200 text-rose-700' : a.nivel === 'atencao' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-sky-50 border-sky-200 text-sky-800'
                  }`}
                >
                  {a.nivel === 'info' ? <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <span>{a.texto}</span>
                </div>
              ))}
            </div>
          )}

          {/* ---- Aprovação ---- */}
          {m.status === 'Proposta' && (
            <div className="p-3 border border-amber-300 bg-amber-50/60 rounded-xl space-y-2">
              <p className="font-bold text-amber-900">Aguardando aprovação de um administrador</p>
              {ehAdmin ? (
                <>
                  {m.tipo === 'Suspensão' && (
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Início da suspensão</label>
                      <input
                        type="date"
                        value={inicioSuspensao}
                        min={hojeIso()}
                        onChange={(e) => setInicioSuspensao(e.target.value)}
                        className="p-2 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAprovar}
                      disabled={!!ocupado || alertas.some((a) => a.nivel === 'erro')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {ocupado === 'aprovar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={handleRejeitar}
                      disabled={!!ocupado}
                      className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-amber-800">Você propôs esta medida; um administrador vai analisar.</p>
              )}
            </div>
          )}

          {/* ---- Ciência ---- */}
          {(m.status === 'Aprovada' || m.status === 'Recusou-se a assinar') && (
            <div className="p-3 border border-slate-200 rounded-xl space-y-2">
              <p className="font-bold text-slate-800">Ciência do colaborador: <span className="font-semibold text-slate-600">{statusCiencia}</span></p>
              <div className="flex flex-wrap gap-2">
                {!interno && !documento && (
                  <button
                    type="button"
                    onClick={handleGerarDocumento}
                    disabled={!!ocupado}
                    className="px-3 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {ocupado === 'gerar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    Gerar documento para ciência
                  </button>
                )}
                {documento && documento.status !== 'Assinado' && m.status !== 'Recusou-se a assinar' && (
                  <>
                    <button type="button" onClick={handleWhatsApp} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" /> Enviar por WhatsApp
                    </button>
                    <button type="button" onClick={handleCopiarLink} className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Copiar link
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarRecusa((v) => !v)}
                      className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-semibold flex items-center gap-1.5"
                    >
                      <UserX className="w-3.5 h-3.5" /> Recusou-se a assinar
                    </button>
                  </>
                )}
                {(documento || interno) && (
                  <button
                    type="button"
                    onClick={handleBaixar}
                    disabled={!!ocupado}
                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    {ocupado === 'baixar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {documento?.status === 'Assinado'
                      ? 'Baixar assinado'
                      : m.status === 'Recusou-se a assinar'
                        ? 'Baixar com termo de recusa'
                        : 'Baixar PDF (imprimir)'}
                  </button>
                )}
              </div>

              {mostrarRecusa && (
                <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg space-y-3">
                  <p className="text-rose-800">
                    O colaborador tomou conhecimento do documento mas se recusou a assinar. Duas testemunhas (que não sejam o
                    responsável pela medida) devem presenciar a apresentação e assinar abaixo.
                  </p>
                  {testemunhas.map((t, i) => (
                    <div key={i} className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                      <p className="font-bold text-slate-700">Testemunha {i + 1}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={t.nome}
                          onChange={(e) => setTestemunhas((prev) => prev.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))}
                          placeholder="Nome completo"
                          className="p-2 border border-slate-200 rounded-lg"
                        />
                        <input
                          value={t.cpf || ''}
                          onChange={(e) => setTestemunhas((prev) => prev.map((x, k) => (k === i ? { ...x, cpf: e.target.value } : x)))}
                          placeholder="CPF (opcional)"
                          className="p-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <AssinaturaDigitalPad
                        onChange={(assinatura) =>
                          setTestemunhas((prev) => prev.map((x, k) => (k === i ? { ...x, assinatura: assinatura || undefined } : x)))
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleRegistrarRecusa}
                    disabled={!recusaValida || !!ocupado}
                    className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {ocupado === 'recusa' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                    Registrar recusa
                  </button>
                </div>
              )}
            </div>
          )}

          {erro && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</div>}
        </div>

        {ehAdmin && m.status !== 'Cancelada' && m.status !== 'Rejeitada' && m.status !== 'Proposta' && (
          <div className="p-3 border-t border-slate-100 flex justify-end shrink-0">
            <button
              type="button"
              onClick={handleCancelar}
              disabled={!!ocupado}
              className="px-3 py-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" /> Cancelar medida
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
