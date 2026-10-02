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
  Download,
  RotateCcw,
} from 'lucide-react';
import { gerarPdfAssinado } from './pdfAssinadoUtils';
import { EnvioWhatsAppEmMassaModal } from '../Common/EnvioWhatsAppEmMassaModal';
import { Colaborador, UsuarioLogin } from '../../types';
import {
  CategoriaDocumentoAssinatura,
  DocumentoAssinatura,
  getDocumentosAssinatura,
  getDocumentoAssinatura,
  excluirDocumentoAssinatura,
  renovarLinkDocumento,
  montarLinkDocumento,
  solicitarNovaAssinatura,
} from '../../utils/documentosAssinaturaApi';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';
import { ImageViewerModal } from '../Common/ImageViewerModal';
import { ImportarContrachequesModal } from './ImportarContrachequesModal';
import { ImportarDocumentosFeriasModal } from './ImportarDocumentosFeriasModal';
import { EnviarRegulamentoModal } from '../Regulamento/EnviarRegulamentoModal';
import { formatarCompetencia, formatarDataBr } from './contrachequePdfUtils';

interface DocumentosAssinaturaViewProps {
  categoria: CategoriaDocumentoAssinatura;
  colaboradores: Colaborador[];
  currentUser?: UsuarioLogin;
  /** Sem o cabeçalho grande — quando a lista aparece dentro de outra tela (ex.: Férias). */
  compacto?: boolean;
  /** Avisa a tela de fora quando a lista muda (importou, excluiu, renovou) — Férias usa pra
   *  atualizar os selos de Aviso/Recibo na lista de programações sem recarregar. */
  onDocumentosChange?: (documentos: DocumentoAssinatura[]) => void;
}

const TEXTOS: Record<CategoriaDocumentoAssinatura, { titulo: string; descricao: string; importar: string; vazio: string }> = {
  contracheque: {
    titulo: 'Contracheques',
    descricao: 'Importe o PDF da folha, envie o link para cada colaborador e acompanhe quem já assinou.',
    importar: 'Importar Contracheques',
    vazio: 'Nenhum contracheque importado ainda. Clique em Importar Contracheques e escolha o PDF da folha.',
  },
  ferias: {
    titulo: 'Documentos de Férias para Assinatura',
    descricao: 'Importe o Aviso e o Recibo de férias que a contabilidade manda, envie o link e acompanhe as assinaturas.',
    importar: 'Importar Aviso / Recibo',
    vazio: 'Nenhum documento de férias importado ainda. Clique em Importar Aviso / Recibo e escolha os PDFs da contabilidade.',
  },
  // Documentos disciplinares são gerados e acompanhados no Módulo Disciplinar (não usam esta
  // tela) — entrada só pra completar o mapa por categoria.
  disciplinar: {
    titulo: 'Medidas Disciplinares',
    descricao: 'Documentos de advertência/suspensão enviados para ciência do colaborador.',
    importar: 'Importar',
    vazio: 'Nenhum documento disciplinar.',
  },
  // Espelhos gerados em Controle de Frequência (Espelho do colaborador / Resumo do mês).
  ponto: {
    titulo: 'Espelhos de Frequência para Assinatura',
    descricao: 'Espelhos mensais enviados para o colaborador conferir e assinar.',
    importar: '',
    vazio: 'Nenhum espelho enviado ainda. Gere pelo Espelho do colaborador ou pelo Resumo do mês.',
  },
  regulamento: {
    titulo: 'Regulamento Interno — Ciência e Assinatura',
    descricao: 'Todos os colaboradores precisam ler e assinar a versão vigente. Novos admitidos aparecem em "Enviar para assinatura".',
    importar: 'Enviar para assinatura',
    vazio: 'Nenhum colaborador recebeu o regulamento ainda. Clique em Enviar para assinatura.',
  },
};

const STATUS_ESTILO: Record<DocumentoAssinatura['status'], { classe: string; icone: React.ReactNode }> = {
  Pendente: { classe: 'bg-slate-100 text-slate-600 border-slate-200', icone: <EyeOff className="w-3 h-3" /> },
  Visualizado: { classe: 'bg-amber-50 text-[#92611F] border-amber-200', icone: <Clock className="w-3 h-3" /> },
  Assinado: { classe: 'bg-emerald-50 text-emerald-700 border-emerald-200', icone: <CheckCircle2 className="w-3 h-3" /> },
};

function formatarDataHora(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Documentos pro colaborador assinar por link — DP → Contracheques (PDF da folha) e Férias
 *  (Aviso/Recibo da contabilidade). Importa, envia o link por WhatsApp e acompanha quem já
 *  visualizou/assinou. O colaborador assina pela tela pública (ContrachequePublicView), sem login. */
export const DocumentosAssinaturaView: React.FC<DocumentosAssinaturaViewProps> = ({
  categoria,
  colaboradores,
  currentUser,
  compacto = false,
  onDocumentosChange,
}) => {
  const textos = TEXTOS[categoria];
  const ehContracheque = categoria === 'contracheque';
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
  const [zipProgresso, setZipProgresso] = useState<{ feito: number; total: number } | null>(null);
  const [isEnvioEmMassaAberto, setIsEnvioEmMassaAberto] = useState(false);

  useEffect(() => {
    getDocumentosAssinatura(categoria)
      .then((lista) => {
        setDocumentos(lista);
        // Contracheque abre já na competência mais recente; Férias mostra tudo (cada documento
        // tem a própria data de gozo, não há "mês da folha").
        if (ehContracheque && lista.length > 0) setCompetencia(lista[0].referencia);
      })
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar os documentos. Verifique sua conexão.');
      })
      .finally(() => setCarregando(false));
  }, [categoria, ehContracheque]);

  useEffect(() => {
    if (!carregando) onDocumentosChange?.(documentos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentos, carregando]);

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
  // Envio em massa: só quem ainda não assinou e tem link válido (vencido precisa renovar antes).
  const pendentesParaEnviar = visiveis.filter((d) => d.status !== 'Assinado' && !linkExpirado(d));

  const mensagemWhatsApp = (d: DocumentoAssinatura) => {
    const primeiroNome = d.colaboradorNome.split(' ')[0];
    return (
      `Olá, ${primeiroNome}! Seu ${d.titulo} já está disponível.\n\n` +
      `Acesse o link abaixo, confira e assine (para abrir, informe seu CPF):\n${montarLinkDocumento(d.token, d.categoria)}\n\n` +
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
      await navigator.clipboard.writeText(montarLinkDocumento(d.token, d.categoria));
      setLinkCopiadoId(d.id);
      setTimeout(() => setLinkCopiadoId((atual) => (atual === d.id ? null : atual)), 2000);
    } catch {
      window.prompt('Copie o link:', montarLinkDocumento(d.token, d.categoria));
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
        ? `"${d.titulo}" JÁ FOI ASSINADO por ${d.colaboradorNome}. Excluir apaga também o comprovante de assinatura. Tem certeza?`
        : `Excluir "${d.titulo}" de ${d.colaboradorNome}? O link enviado deixa de funcionar.`;
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

  // Todos os assinados que estão na tela (competência/busca aplicadas) num .zip — um PDF assinado
  // por colaborador, pra arquivar o mês inteiro de uma vez. Gera um por um (cada um baixa o PDF
  // original do Storage), mostrando o progresso.
  const handleBaixarTodosAssinados = async () => {
    const assinados = visiveis.filter((d) => d.status === 'Assinado');
    if (assinados.length === 0) return;
    setZipProgresso({ feito: 0, total: assinados.length });
    const arquivos: Record<string, Uint8Array> = {};
    const falhas: string[] = [];
    for (const d of assinados) {
      try {
        const completo = (await getDocumentoAssinatura(d.id)) || d;
        const pdf = await gerarPdfAssinado(completo, colaboradorPorId.get(d.colaboradorId)?.cpf);
        let nome = pdf.name;
        for (let n = 2; arquivos[nome]; n++) nome = pdf.name.replace(/\.pdf$/i, `_${n}.pdf`);
        arquivos[nome] = new Uint8Array(await pdf.arrayBuffer());
      } catch (err) {
        console.error(err);
        falhas.push(d.colaboradorNome);
      }
      setZipProgresso((p) => (p ? { ...p, feito: p.feito + 1 } : p));
    }
    try {
      if (Object.keys(arquivos).length > 0) {
        const { zipSync } = await import('fflate');
        // PDF já é comprimido — level 0 só empacota, bem mais rápido e do mesmo tamanho.
        const zip = zipSync(arquivos, { level: 0 });
        const sufixo = ehContracheque && competencia ? competencia : new Date().toISOString().slice(0, 10);
        const href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
        const a = document.createElement('a');
        a.href = href;
        a.download = `${ehContracheque ? 'Contracheques' : 'Ferias'}_assinados_${sufixo}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(href), 60_000);
      }
      if (falhas.length > 0) {
        alert(`Não foi possível incluir no arquivo: ${falhas.join(', ')}. Tente baixar esses individualmente.`);
      }
    } finally {
      setZipProgresso(null);
    }
  };

  // Documento assinado que precisa ser assinado de novo, sem excluir/reimportar o arquivo: a
  // assinatura atual vai pro histórico e um link novo é gerado (ver solicitarNovaAssinatura).
  const handleSolicitarNovaAssinatura = async (d: DocumentoAssinatura) => {
    const motivo = window.prompt(
      `Solicitar nova assinatura de "${d.titulo}" para ${d.colaboradorNome}?\n\n` +
        'A assinatura atual fica guardada no histórico (não é apagada), o link antigo para de funcionar e um link novo é gerado para enviar.\n\n' +
        'Motivo (ex.: assinatura ilegível, documento corrigido):'
    );
    if (motivo === null) return;
    setAcaoEmAndamento(d.id);
    try {
      const atualizado = await solicitarNovaAssinatura(d, motivo.trim());
      setDocumentos((prev) => prev.map((x) => (x.id === d.id ? atualizado : x)));
      setComprovante(null);
      if (window.confirm('Novo link gerado. Enviar agora pelo WhatsApp?')) handleWhatsApp(atualizado);
    } catch (err) {
      console.error(err);
      alert(`Não foi possível solicitar a nova assinatura. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  // PDF original + página de comprovante da assinatura eletrônica (ver pdfAssinadoUtils.ts).
  const handleBaixarAssinado = async (d: DocumentoAssinatura) => {
    setAcaoEmAndamento(d.id);
    try {
      const completo = d.assinaturaImagem ? d : (await getDocumentoAssinatura(d.id)) || d;
      const arquivo = await gerarPdfAssinado(completo, colaboradorPorId.get(d.colaboradorId)?.cpf);
      const href = URL.createObjectURL(arquivo);
      const a = document.createElement('a');
      a.href = href;
      a.download = arquivo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch (err) {
      console.error(err);
      alert(`Não foi possível gerar o PDF assinado. ${err instanceof Error ? err.message : ''}`);
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
    <div className={compacto ? 'space-y-4' : 'space-y-6'}>
      <div
        className={`bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          compacto ? 'p-4' : 'p-5'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0 ${
              compacto ? 'w-10 h-10' : 'w-12 h-12'
            }`}
          >
            <FileSignature className={compacto ? 'w-5 h-5' : 'w-6 h-6'} />
          </div>
          <div>
            <h1 className={`${compacto ? 'text-sm' : 'text-xl'} font-black text-slate-900 tracking-tight`}>{textos.titulo}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{textos.descricao}</p>
          </div>
        </div>
        {textos.importar && (<button
          type="button"
          onClick={() => setShowImportar(true)}
          className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0"
        >
          <Upload className="w-4 h-4" />
          {textos.importar}
        </button>)}
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : documentos.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
          {textos.vazio}
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            {ehContracheque && (
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
            )}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar colaborador"
                className="w-full pl-8 p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsEnvioEmMassaAberto(true)}
              disabled={pendentesParaEnviar.length === 0}
              title={
                pendentesParaEnviar.length === 0
                  ? 'Nenhum documento pendente de assinatura (com link válido) nesta seleção'
                  : `Enviar pelo WhatsApp o link de todos os ${pendentesParaEnviar.length} ainda não assinados mostrados abaixo`
              }
              className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Enviar pendentes ({pendentesParaEnviar.length})
            </button>
            <button
              type="button"
              onClick={handleBaixarTodosAssinados}
              disabled={!!zipProgresso || totais.assinados === 0}
              title={
                totais.assinados === 0
                  ? 'Nenhum documento assinado nesta seleção'
                  : `Baixa um .zip com os ${totais.assinados} documento(s) assinado(s) mostrados abaixo`
              }
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {zipProgresso ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {zipProgresso
                ? `Gerando ${zipProgresso.feito} de ${zipProgresso.total}...`
                : `Baixar todos assinados (${totais.assinados})`}
            </button>
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
                  <th className="px-3 py-2.5">{ehContracheque ? 'Competência / Tipo' : 'Documento / Início do gozo'}</th>
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
                        {ehContracheque ? (
                          <>
                            {formatarCompetencia(d.referencia)} <span className="text-slate-400">• {d.tipo}</span>
                          </>
                        ) : (
                          <>
                            {d.tipo} <span className="text-slate-400">• {formatarDataBr(d.referencia)}</span>
                          </>
                        )}
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
                            <>
                              <button
                                type="button"
                                onClick={() => handleBaixarAssinado(d)}
                                disabled={ocupado}
                                title="Baixar o documento com a página de comprovante da assinatura"
                                className="px-2 py-1 rounded-md text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Baixar assinado
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerComprovante(d)}
                                disabled={ocupado}
                                className="px-2 py-1 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                              >
                                Comprovante
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSolicitarNovaAssinatura(d)}
                                disabled={ocupado}
                                title="Solicitar nova assinatura (a atual fica no histórico; gera um link novo)"
                                className="p-1.5 rounded-md text-slate-500 hover:text-[#92611F] hover:bg-amber-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
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

      {isEnvioEmMassaAberto && (
        <EnvioWhatsAppEmMassaModal
          titulo={`Enviar ${ehContracheque ? 'contracheques' : categoria === 'regulamento' ? 'regulamento interno' : categoria === 'ponto' ? 'espelhos de frequência' : 'documentos de férias'} pendentes`}
          itens={pendentesParaEnviar.map((d) => ({
            id: d.id,
            nome: `${d.colaboradorNome} — ${d.titulo}`,
            telefone: colaboradorPorId.get(d.colaboradorId)?.telefoneWhatsapp,
            mensagem: mensagemWhatsApp(d),
          }))}
          onClose={() => setIsEnvioEmMassaAberto(false)}
        />
      )}

      {showImportar && ehContracheque && (
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
      {showImportar && categoria === 'regulamento' && (
        <EnviarRegulamentoModal
          colaboradores={colaboradores}
          existentes={documentos}
          criadoPor={currentUser?.nome}
          onClose={() => setShowImportar(false)}
          onCriados={(novos) => setDocumentos((prev) => [...novos, ...prev])}
        />
      )}
      {showImportar && categoria === 'ferias' && (
        <ImportarDocumentosFeriasModal
          colaboradores={colaboradores.filter((c) => c.status !== 'Inativo')}
          existentes={documentos}
          criadoPor={currentUser?.nome}
          onClose={() => setShowImportar(false)}
          onImportado={(novos) => {
            if (novos.length === 0) return;
            setDocumentos((prev) =>
              [...novos, ...prev].sort((a, b) => b.referencia.localeCompare(a.referencia))
            );
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
              {(comprovante.historicoAssinaturas?.length ?? 0) > 0 && (
                <details className="border border-slate-200 rounded-lg">
                  <summary className="px-2.5 py-2 cursor-pointer font-semibold text-slate-600">
                    Assinaturas anteriores ({comprovante.historicoAssinaturas!.length})
                  </summary>
                  <div className="divide-y divide-slate-100">
                    {comprovante.historicoAssinaturas!.map((h, i) => (
                      <div key={i} className="p-2.5 space-y-1">
                        <p>
                          Assinada em <strong>{formatarDataHora(h.assinadoEm)}</strong> — substituída em{' '}
                          {formatarDataHora(h.substituidaEm)}
                        </p>
                        {h.motivo && <p className="text-slate-500">Motivo: {h.motivo}</p>}
                        {h.assinaturaImagem && (
                          <img src={h.assinaturaImagem} alt="Assinatura anterior" className="w-full h-16 object-contain bg-white" />
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <button
                type="button"
                onClick={() => handleSolicitarNovaAssinatura(comprovante)}
                disabled={acaoEmAndamento === comprovante.id}
                className="w-full py-2 bg-white hover:bg-amber-50 text-[#92611F] border border-amber-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Solicitar nova assinatura
              </button>
              <button
                type="button"
                onClick={() => handleBaixarAssinado(comprovante)}
                disabled={acaoEmAndamento === comprovante.id}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {acaoEmAndamento === comprovante.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Baixar documento assinado (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
