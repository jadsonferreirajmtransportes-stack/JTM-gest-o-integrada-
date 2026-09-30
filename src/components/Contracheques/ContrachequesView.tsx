import React, { useEffect, useMemo, useState } from 'react';
import {
  FileSignature,
  Upload,
  MessageCircle,
  Link2,
  Eye,
  CheckCircle2,
  Clock,
  EyeOff,
  Trash2,
  RefreshCw,
  Loader2,
  X,
  Search,
} from 'lucide-react';
import { Colaborador, UsuarioLogin } from '../../types';
import {
  DocumentoAssinatura,
  getDocumentosAssinatura,
  getDocumentoAssinatura,
  excluirDocumentoAssinatura,
  renovarLinkDocumento,
  montarLinkDocumento,
} from '../../utils/documentosAssinaturaApi';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';
import { ImageViewerModal } from '../Common/ImageViewerModal';
import { ImportarContrachequesModal } from './ImportarContrachequesModal';
import { formatarCompetencia } from './contrachequePdfUtils';

interface ContrachequesViewProps {
  colaboradores: Colaborador[];
  currentUser?: UsuarioLogin;
}

const STATUS_ESTILO: Record<DocumentoAssinatura['status'], { classe: string; icone: React.ReactNode }> = {
  Pendente: { classe: 'bg-slate-100 text-slate-600 border-slate-200', icone: <EyeOff className="w-3 h-3" /> },
  Visualizado: { classe: 'bg-amber-50 text-[#92611F] border-amber-200', icone: <Clock className="w-3 h-3" /> },
  Assinado: { classe: 'bg-emerald-50 text-emerald-700 border-emerald-200', icone: <CheckCircle2 className="w-3 h-3" /> },
};

function formatarDataHora(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** DP → Contracheques: importa o PDF da folha, envia o link de cada colaborador por WhatsApp e
 *  acompanha quem já visualizou/assinou. O colaborador assina pela tela pública
 *  (ContrachequePublicView), sem login. */
export const ContrachequesView: React.FC<ContrachequesViewProps> = ({ colaboradores, currentUser }) => {
  const [documentos, setDocumentos] = useState<DocumentoAssinatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [showImportar, setShowImportar] = useState(false);
  const [visualizando, setVisualizando] = useState<DocumentoAssinatura | null>(null);
  const [comprovante, setComprovante] = useState<DocumentoAssinatura | null>(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const [linkCopiadoId, setLinkCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    getDocumentosAssinatura('contracheque')
      .then((lista) => {
        setDocumentos(lista);
        if (lista.length > 0) setCompetencia(lista[0].referencia);
      })
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar os contracheques. Verifique sua conexão.');
      })
      .finally(() => setCarregando(false));
  }, []);

  const colaboradorPorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);
  const competencias = useMemo(
    () => Array.from(new Set(documentos.map((d) => d.referencia))).sort().reverse(),
    [documentos]
  );
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return documentos.filter(
      (d) => (!competencia || d.referencia === competencia) && (!termo || d.colaboradorNome.toLowerCase().includes(termo))
    );
  }, [documentos, competencia, busca]);
  const totais = useMemo(
    () => ({
      total: visiveis.length,
      assinados: visiveis.filter((d) => d.status === 'Assinado').length,
      visualizados: visiveis.filter((d) => d.status === 'Visualizado').length,
      pendentes: visiveis.filter((d) => d.status === 'Pendente').length,
    }),
    [visiveis]
  );

  const linkExpirado = (d: DocumentoAssinatura) => new Date(d.linkExpiraEm).getTime() < Date.now();

  const mensagemWhatsApp = (d: DocumentoAssinatura) => {
    const primeiroNome = d.colaboradorNome.split(' ')[0];
    return (
      `Olá, ${primeiroNome}! Seu ${d.titulo} já está disponível.\n\n` +
      `Acesse o link abaixo, confira e assine (para abrir, informe seu CPF):\n${montarLinkDocumento(d.token)}\n\n` +
      `JM Transportes — Departamento Pessoal`
    );
  };

  const handleWhatsApp = (d: DocumentoAssinatura) => {
    const telefone = colaboradorPorId.get(d.colaboradorId)?.telefoneWhatsapp || '';
    const link = buildWhatsAppLink(telefone, mensagemWhatsApp(d));
    if (!link) {
      alert(`${d.colaboradorNome} não tem WhatsApp cadastrado. Use "Copiar link" e envie por outro meio.`);
      return;
    }
    window.open(link, '_blank', 'noopener');
  };

  const handleCopiarLink = async (d: DocumentoAssinatura) => {
    try {
      await navigator.clipboard.writeText(montarLinkDocumento(d.token));
      setLinkCopiadoId(d.id);
      setTimeout(() => setLinkCopiadoId((atual) => (atual === d.id ? null : atual)), 2000);
    } catch {
      window.prompt('Copie o link:', montarLinkDocumento(d.token));
    }
  };

  const handleRenovar = async (d: DocumentoAssinatura) => {
    setAcaoEmAndamento(d.id);
    try {
      const atualizado = await renovarLinkDocumento(d);
      setDocumentos((prev) => prev.map((x) => (x.id === d.id ? atualizado : x)));
    } catch (err) {
      console.error(err);
      alert('Não foi possível renovar o link. Tente novamente.');
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const handleExcluir = async (d: DocumentoAssinatura) => {
    const aviso =
      d.status === 'Assinado'
        ? `Este contracheque JÁ FOI ASSINADO por ${d.colaboradorNome}. Excluir apaga também o comprovante de assinatura. Tem certeza?`
        : `Excluir o contracheque de ${d.colaboradorNome}? O link enviado deixa de funcionar.`;
    if (!window.confirm(aviso)) return;
    setAcaoEmAndamento(d.id);
    try {
      await excluirDocumentoAssinatura(d);
      setDocumentos((prev) => prev.filter((x) => x.id !== d.id));
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir. Tente novamente.');
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const handleVerComprovante = async (d: DocumentoAssinatura) => {
    setAcaoEmAndamento(d.id);
    try {
      setComprovante((await getDocumentoAssinatura(d.id)) || d);
    } catch (err) {
      console.error(err);
      alert('Não foi possível carregar o comprovante. Tente novamente.');
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Contracheques</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Importe o PDF da folha, envie o link para cada colaborador e acompanhe quem já assinou.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowImportar(true)}
          className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Importar Contracheques
        </button>
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : documentos.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
          Nenhum contracheque importado ainda. Clique em <strong>Importar Contracheques</strong> e escolha o PDF da folha.
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold"
            >
              <option value="">Todas as competências</option>
              {competencias.map((c) => (
                <option key={c} value={c}>
                  {formatarCompetencia(c)}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar colaborador"
                className="w-full pl-8 p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { rotulo: 'Total', valor: totais.total, classe: 'text-slate-900' },
              { rotulo: 'Assinados', valor: totais.assinados, classe: 'text-emerald-700' },
              { rotulo: 'Só visualizados', valor: totais.visualizados, classe: 'text-[#92611F]' },
              { rotulo: 'Não abertos', valor: totais.pendentes, classe: 'text-slate-500' },
            ].map((t) => (
              <div key={t.rotulo} className="bg-white p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold">{t.rotulo}</p>
                <p className={`text-2xl font-black ${t.classe}`}>{t.valor}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[760px]">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Colaborador</th>
                  <th className="px-3 py-2.5">Competência / Tipo</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Visualizado</th>
                  <th className="px-3 py-2.5">Assinado</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiveis.map((d) => {
                  const estilo = STATUS_ESTILO[d.status];
                  const expirado = linkExpirado(d) && d.status !== 'Assinado';
                  const ocupado = acaoEmAndamento === d.id;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{d.colaboradorNome}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {formatarCompetencia(d.referencia)} <span className="text-slate-400">• {d.tipo}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${estilo.classe}`}>
                          {estilo.icone}
                          {d.status}
                        </span>
                        {expirado && <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">Link vencido</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{formatarDataHora(d.visualizadoEm)}</td>
                      <td className="px-3 py-2.5 text-slate-500">{formatarDataHora(d.assinadoEm)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C48229]" />}
                          {d.status !== 'Assinado' &&
                            (expirado ? (
                              <button
                                type="button"
                                onClick={() => handleRenovar(d)}
                                disabled={ocupado}
                                title="Renovar o prazo do link (o link enviado continua o mesmo)"
                                className="px-2 py-1 rounded-md text-[11px] font-bold text-[#92611F] bg-amber-50 border border-amber-200 hover:bg-amber-100 flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" /> Renovar
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleWhatsApp(d)}
                                  title="Enviar por WhatsApp"
                                  className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-50"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopiarLink(d)}
                                  title="Copiar link"
                                  className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                  {linkCopiadoId === d.id && <span className="text-[10px] font-bold text-emerald-700">Copiado</span>}
                                </button>
                              </>
                            ))}
                          <button
                            type="button"
                            onClick={() => setVisualizando(d)}
                            title="Ver contracheque"
                            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {d.status === 'Assinado' && (
                            <button
                              type="button"
                              onClick={() => handleVerComprovante(d)}
                              disabled={ocupado}
                              className="px-2 py-1 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                            >
                              Comprovante
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleExcluir(d)}
                            disabled={ocupado}
                            title="Excluir"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showImportar && (
        <ImportarContrachequesModal
          colaboradores={colaboradores.filter((c) => c.status !== 'Inativo')}
          existentes={documentos}
          criadoPor={currentUser?.nome}
          onClose={() => setShowImportar(false)}
          onImportado={(novos) => {
            if (novos.length === 0) return;
            setDocumentos((prev) => [...novos, ...prev]);
            setCompetencia(novos[0].referencia);
          }}
        />
      )}

      {visualizando && (
        <ImageViewerModal
          isOpen
          onClose={() => setVisualizando(null)}
          imageUrl={visualizando.arquivoRef}
          title={visualizando.titulo}
          subtitle={visualizando.colaboradorNome}
          fileName={visualizando.arquivoNome || 'contracheque.pdf'}
        />
      )}

      {comprovante && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Comprovante de assinatura
              </h3>
              <button type="button" onClick={() => setComprovante(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p><span className="text-slate-500">Colaborador:</span> <strong>{comprovante.colaboradorNome}</strong></p>
              <p><span className="text-slate-500">Documento:</span> {comprovante.titulo}</p>
              <p><span className="text-slate-500">Visualizado em:</span> {formatarDataHora(comprovante.visualizadoEm)}</p>
              <p><span className="text-slate-500">Assinado em:</span> <strong>{formatarDataHora(comprovante.assinadoEm)}</strong></p>
              <p className="text-slate-500">Identidade confirmada pelo CPF do cadastro antes de abrir o documento.</p>
              {comprovante.declaracao && (
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">“{comprovante.declaracao}”</p>
              )}
              {comprovante.assinaturaImagem && (
                <div className="border border-slate-200 rounded-lg p-2 bg-white">
                  <img src={comprovante.assinaturaImagem} alt="Assinatura do colaborador" className="w-full h-28 object-contain" />
                </div>
              )}
              {comprovante.navegador && <p className="text-[10px] text-slate-400 break-all">Dispositivo: {comprovante.navegador}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
