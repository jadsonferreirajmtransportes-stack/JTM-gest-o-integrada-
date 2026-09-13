import React, { useEffect, useState } from 'react';
import {
  Trash2,
  Link2,
  Star,
  Building2,
  Plane,
  Truck,
  Users,
  FolderKanban,
  AlertTriangle,
  ExternalLink,
  Printer,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
  Share2,
} from 'lucide-react';
import {
  InstrucaoTrabalho,
  VinculoNotaModulo,
  GlobalModuleId,
  StatusInstrucaoTrabalho,
  ResponsabilidadeProcesso,
  LinhaSipoc,
  EtapaFluxoProcesso,
  IndicadorProcesso,
  RiscoControleProcesso,
  AcaoPlano5W2H,
  RevisaoHistorico,
  UsuarioLogin,
} from '../../types';
import {
  STATUS_INSTRUCAO_CONFIG,
  getCategoriaConfig,
  ETAPAS_FORMULARIO,
  EtapaFormularioId,
  novaResponsabilidade,
  novaLinhaSipoc,
  novaEtapaFluxo,
  novoIndicador,
  novoRiscoControle,
  novaAcao5W2H,
  novaRevisao,
} from './instrucoesTrabalhoUtils';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';
import { formatDateBR } from '../../utils/formatters';

// Formulário estruturado em etapas fixas (não blocos livres estilo Notion) — cada etapa da
// metodologia interna "Passo a passo — estabelecer e revisar processos" vira uma página do
// wizard, com campos e tabelas dedicados em vez de um editor de texto genérico.

interface InstrucaoEditorProps {
  instrucao: InstrucaoTrabalho;
  onSave: (instrucao: InstrucaoTrabalho) => void;
  onDelete?: () => void;
  onOpenVincular?: () => void;
  onNavigateToVinculo?: (modulo: GlobalModuleId) => void;
  /** Abre o modal de compartilhamento do link público de preenchimento. Omitido no próprio
   *  formulário público (não faz sentido gerar link de dentro do link). */
  onShare?: () => void;
  /** Modo de preenchimento por link público (colaborador sem login): esconde exclusão,
   *  favoritar e o vínculo com outros módulos — o preenchedor só cuida do conteúdo do processo. */
  modoPublico?: boolean;
  usuarios?: UsuarioLogin[];
}

const VINCULO_ICON: Record<VinculoNotaModulo['tipoEntidade'], React.ElementType> = {
  cliente: Building2,
  embarque_aereo: Plane,
  viagem_rodoviaria: Truck,
  colaborador: Users,
  projeto: FolderKanban,
  ocorrencia: AlertTriangle,
};

const STATUS_OPCOES: StatusInstrucaoTrabalho[] = ['Rascunho', 'Em Revisão', 'Vigente', 'Obsoleta'];

const inputCls =
  'w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#B38F4F] placeholder-slate-300';
const labelCls = 'text-[11px] font-bold text-slate-500 block mb-1';

export const InstrucaoEditor: React.FC<InstrucaoEditorProps> = ({
  instrucao,
  onSave,
  onDelete,
  onOpenVincular,
  onNavigateToVinculo,
  onShare,
  modoPublico = false,
  usuarios = [],
}) => {
  const [form, setForm] = useState<InstrucaoTrabalho>(instrucao);
  const [etapaAtual, setEtapaAtual] = useState<EtapaFormularioId>('identificacao');
  const [mostrarGuia, setMostrarGuia] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompartilhar, setShowCompartilhar] = useState(false);

  useEffect(() => {
    setForm(instrucao);
    setEtapaAtual('identificacao');
  }, [instrucao.id]);

  const atualizar = (patch: Partial<InstrucaoTrabalho>) => {
    const next = { ...form, ...patch };
    setForm(next);
    onSave(next);
  };

  const handleToggleUsuarioMarcado = (userId: string) => {
    const atual = form.usuariosMarcadosIds || [];
    const novo = atual.includes(userId) ? atual.filter((id) => id !== userId) : [...atual, userId];
    atualizar({ usuariosMarcadosIds: novo });
  };

  const categoriaCfg = getCategoriaConfig(form.categoria);
  const CategoriaIcon = categoriaCfg.icon;
  const statusCfg = STATUS_INSTRUCAO_CONFIG[form.status];
  const vinculo = form.vinculo;
  const VinculoIcon = vinculo ? VINCULO_ICON[vinculo.tipoEntidade] : null;

  const indiceEtapa = ETAPAS_FORMULARIO.findIndex((e) => e.id === etapaAtual);
  const mudarEtapa = (id: EtapaFormularioId) => {
    setEtapaAtual(id);
    setMostrarGuia(true);
  };
  const irParaEtapa = (idx: number) => {
    const alvo = ETAPAS_FORMULARIO[Math.max(0, Math.min(ETAPAS_FORMULARIO.length - 1, idx))];
    mudarEtapa(alvo.id);
  };

  // ---------- Helpers genéricos para tabelas editáveis ----------
  function TabelaEtapa<T extends { id: string }>({
    linhas,
    colunas,
    onChange,
    criarLinha,
    labelAdicionar = 'Adicionar linha',
  }: {
    linhas: T[];
    colunas: { key: keyof T; label: string; tipo?: 'text' | 'date' }[];
    onChange: (linhas: T[]) => void;
    criarLinha: () => T;
    labelAdicionar?: string;
  }) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                {colunas.map((c) => (
                  <th key={String(c.key)} className="text-left px-2 py-2 font-bold text-slate-600 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((linha, idx) => (
                <tr key={linha.id}>
                  {colunas.map((c) => (
                    <td key={String(c.key)} className="px-1.5 py-1 min-w-[120px]">
                      <input
                        type={c.tipo === 'date' ? 'date' : 'text'}
                        value={(linha[c.key] as any) ?? ''}
                        onChange={(e) => {
                          const updated = [...linhas];
                          updated[idx] = { ...updated[idx], [c.key]: e.target.value };
                          onChange(updated);
                        }}
                        className="w-full bg-transparent border-none outline-hidden text-xs text-slate-700 placeholder-slate-300"
                      />
                    </td>
                  ))}
                  <td className="px-1 text-center">
                    <button
                      type="button"
                      onClick={() => onChange(linhas.filter((l) => l.id !== linha.id))}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Remover linha"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={colunas.length + 1} className="px-2 py-3 text-center text-slate-400 italic">
                    Nenhuma linha ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => onChange([...linhas, criarLinha()])}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-semibold text-slate-500 hover:text-[#8A6A39] hover:bg-amber-50/50 border-t border-slate-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {labelAdicionar}
        </button>
      </div>
    );
  }

  const renderEtapa = () => {
    switch (etapaAtual) {
      case 'identificacao':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Dono do processo</label>
                <input
                  type="text"
                  value={form.responsavel || ''}
                  onChange={(e) => atualizar({ responsavel: e.target.value })}
                  placeholder="Quem responde por este processo"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Aprovado por</label>
                <input
                  type="text"
                  value={form.aprovadoPor || ''}
                  onChange={(e) => atualizar({ aprovadoPor: e.target.value })}
                  placeholder="Quem aprovou esta versão"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => atualizar({ status: e.target.value as StatusInstrucaoTrabalho })}
                  className={inputCls}
                >
                  {STATUS_OPCOES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Versão</label>
                  <input
                    type="number"
                    min={1}
                    value={form.versao}
                    onChange={(e) => atualizar({ versao: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Vigência a partir de</label>
                  <input
                    type="date"
                    value={form.dataVigencia || ''}
                    onChange={(e) => atualizar({ dataVigencia: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'objetivo':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Objetivo</label>
              <textarea
                value={form.objetivo || ''}
                onChange={(e) => atualizar({ objetivo: e.target.value })}
                placeholder="Este procedimento tem como objetivo padronizar o processo de [...], garantindo [...], com foco em [...]."
                rows={3}
                className={`${inputCls} resize-y`}
              />
            </div>
            <div>
              <label className={labelCls}>Aplicação / Abrangência</label>
              <textarea
                value={form.aplicacaoAbrangencia || ''}
                onChange={(e) => atualizar({ aplicacaoAbrangencia: e.target.value })}
                placeholder="A quais setores, pessoas e situações este processo se aplica. Onde ele começa e onde termina."
                rows={3}
                className={`${inputCls} resize-y`}
              />
            </div>
            <div>
              <label className={labelCls}>Definições</label>
              <textarea
                value={form.definicoes || ''}
                onChange={(e) => atualizar({ definicoes: e.target.value })}
                placeholder="Termos e siglas usados neste documento que precisam de esclarecimento."
                rows={2}
                className={`${inputCls} resize-y`}
              />
            </div>
          </div>
        );

      case 'responsabilidades':
        return (
          <TabelaEtapa<ResponsabilidadeProcesso>
            linhas={form.responsabilidades}
            onChange={(linhas) => atualizar({ responsabilidades: linhas })}
            criarLinha={novaResponsabilidade}
            labelAdicionar="Adicionar responsável"
            colunas={[
              { key: 'responsavel', label: 'Responsável' },
              { key: 'responsabilidade', label: 'O que responde por fazer' },
            ]}
          />
        );

      case 'sipoc':
        return (
          <TabelaEtapa<LinhaSipoc>
            linhas={form.sipoc}
            onChange={(linhas) => atualizar({ sipoc: linhas })}
            criarLinha={novaLinhaSipoc}
            labelAdicionar="Adicionar linha SIPOC"
            colunas={[
              { key: 'fornecedores', label: 'Fornecedores' },
              { key: 'entradas', label: 'Entradas' },
              { key: 'processo', label: 'Processo' },
              { key: 'saidas', label: 'Saídas' },
              { key: 'clientes', label: 'Clientes' },
            ]}
          />
        );

      case 'fluxo':
        return (
          <TabelaEtapa<EtapaFluxoProcesso>
            linhas={form.fluxoProcesso}
            onChange={(linhas) => atualizar({ fluxoProcesso: linhas.map((l, i) => ({ ...l, ordem: i + 1 })) })}
            criarLinha={() => novaEtapaFluxo(form.fluxoProcesso.length + 1)}
            labelAdicionar="Adicionar etapa"
            colunas={[
              { key: 'ordem', label: '#' },
              { key: 'etapa', label: 'Etapa' },
              { key: 'responsavel', label: 'Responsável' },
              { key: 'entrada', label: 'Entrada' },
              { key: 'saida', label: 'Saída' },
              { key: 'sistemaDocumento', label: 'Sistema/Documento' },
              { key: 'observacao', label: 'Observação' },
            ]}
          />
        );

      case 'decisao':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Critérios de Decisão</label>
              <textarea
                value={form.criteriosDecisao || ''}
                onChange={(e) => atualizar({ criteriosDecisao: e.target.value })}
                placeholder="Regras que definem o caminho a seguir nos pontos de decisão do fluxo."
                rows={4}
                className={`${inputCls} resize-y`}
              />
            </div>
            <div>
              <label className={labelCls}>Registros e Evidências</label>
              <textarea
                value={form.registrosEvidencias || ''}
                onChange={(e) => atualizar({ registrosEvidencias: e.target.value })}
                placeholder="Quais documentos, prints ou sistemas comprovam que cada etapa foi executada."
                rows={4}
                className={`${inputCls} resize-y`}
              />
            </div>
          </div>
        );

      case 'indicadores':
        return (
          <TabelaEtapa<IndicadorProcesso>
            linhas={form.indicadores}
            onChange={(linhas) => atualizar({ indicadores: linhas })}
            criarLinha={novoIndicador}
            labelAdicionar="Adicionar indicador"
            colunas={[
              { key: 'indicador', label: 'Indicador' },
              { key: 'formula', label: 'Fórmula' },
              { key: 'meta', label: 'Meta' },
              { key: 'frequencia', label: 'Frequência' },
              { key: 'responsavel', label: 'Responsável' },
            ]}
          />
        );

      case 'riscos':
        return (
          <TabelaEtapa<RiscoControleProcesso>
            linhas={form.riscosControles}
            onChange={(linhas) => atualizar({ riscosControles: linhas })}
            criarLinha={() => novoRiscoControle()}
            labelAdicionar="Adicionar risco"
            colunas={[
              { key: 'risco', label: 'Risco' },
              { key: 'controle', label: 'Controle adotado' },
            ]}
          />
        );

      case 'plano5w2h':
        return (
          <TabelaEtapa<AcaoPlano5W2H>
            linhas={form.planoAcao5W2H}
            onChange={(linhas) => atualizar({ planoAcao5W2H: linhas })}
            criarLinha={novaAcao5W2H}
            labelAdicionar="Adicionar ação"
            colunas={[
              { key: 'oQue', label: 'O quê' },
              { key: 'porQue', label: 'Por quê' },
              { key: 'onde', label: 'Onde' },
              { key: 'quando', label: 'Quando' },
              { key: 'quem', label: 'Quem' },
              { key: 'como', label: 'Como' },
              { key: 'custoRecurso', label: 'Custo/recurso' },
            ]}
          />
        );

      case 'historico':
        return (
          <div className="space-y-4">
            <TabelaEtapa<RevisaoHistorico>
              linhas={form.historicoRevisoes}
              onChange={(linhas) => atualizar({ historicoRevisoes: linhas })}
              criarLinha={() => novaRevisao(String(form.historicoRevisoes.length + 1))}
              labelAdicionar="Adicionar revisão"
              colunas={[
                { key: 'revisao', label: 'Revisão' },
                { key: 'data', label: 'Data', tipo: 'date' },
                { key: 'alteradoPor', label: 'Alterado por' },
                { key: 'descricao', label: 'Descrição da alteração' },
              ]}
            />

            {!modoPublico && onOpenVincular && (
            <div>
              <label className={labelCls}>Registro operacional vinculado</label>
              {vinculo ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateToVinculo?.(vinculo.modulo)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-800 transition-colors"
                    title="Ir para o registro vinculado"
                  >
                    {VinculoIcon && <VinculoIcon className="w-3.5 h-3.5" />}
                    <span className="truncate max-w-[240px]">{vinculo.entidadeLabel}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </button>
                  <button type="button" onClick={onOpenVincular} className="text-[10px] text-slate-400 hover:text-slate-600 underline">
                    alterar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenVincular}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Vincular a um registro da operação</span>
                </button>
              )}
            </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Cabeçalho: código, categoria, status, ações */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-mono font-bold text-slate-700">
          {form.codigo}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${categoriaCfg.color}`}>
          <CategoriaIcon className="w-3.5 h-3.5" />
          {categoriaCfg.label}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-bold ${statusCfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
        <span className="text-[11px] text-slate-400">Versão {form.versao}</span>

        <div className="ml-auto flex items-center gap-1">
          {!modoPublico && onShare && (
            <button
              type="button"
              onClick={onShare}
              className="p-1.5 text-slate-400 hover:text-[#8A6A39] hover:bg-amber-50 rounded-lg transition-colors"
              title="Compartilhar link de preenchimento"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Imprimir / Gerar PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
          {!modoPublico && (
            <button
              type="button"
              onClick={() => atualizar({ favorito: !form.favorito })}
              className={`p-1.5 rounded-lg transition-colors ${
                form.favorito ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
              }`}
              title={form.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
            >
              <Star className="w-4 h-4" fill={form.favorito ? 'currentColor' : 'none'} />
            </button>
          )}
          {!modoPublico && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Excluir instrução"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Título */}
      <input
        type="text"
        value={form.titulo}
        onChange={(e) => atualizar({ titulo: e.target.value })}
        placeholder="Título da Instrução de Trabalho"
        className="w-full bg-transparent border-none outline-hidden text-2xl font-extrabold text-slate-900 placeholder-slate-300 mb-1"
      />

      {/* Compartilhar com Usuários do Sistema — mesma regra de visibilidade da Agenda da
          Gestão, Projetos Gerenciais e Notas & Ideias (ver visibilidadeUtils.ts). */}
      {!modoPublico && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowCompartilhar((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[11px] font-medium transition-colors ${
              (form.usuariosMarcadosIds || []).length > 0
                ? 'bg-teal-50 border-teal-200 text-teal-800'
                : 'bg-white border-dashed border-slate-300 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {(form.usuariosMarcadosIds || []).length > 0
                ? `Compartilhada com ${(form.usuariosMarcadosIds || []).length}`
                : 'Compartilhar com Usuários do Sistema'}
            </span>
          </button>

          {showCompartilhar && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[11px] text-slate-500 mb-1.5">
                Só quem criou esta instrução e quem for marcado aqui enxerga ela em Instruções de Trabalho.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {usuarios
                  .filter((u) => u.status === 'Ativo')
                  .map((u) => {
                    const marcado = (form.usuariosMarcadosIds || []).includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleToggleUsuarioMarcado(u.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-colors ${
                          marcado
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-teal-300'
                        }`}
                      >
                        {marcado && <Check className="w-3 h-3" />}
                        {u.nome}
                      </button>
                    );
                  })}
                {usuarios.filter((u) => u.status === 'Ativo').length === 0 && (
                  <span className="text-[11px] text-slate-400">Nenhum outro login cadastrado ainda.</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stepper — etapas do processo */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
        {ETAPAS_FORMULARIO.map((etapa, idx) => {
          const ativa = etapa.id === etapaAtual;
          const concluidaAntes = idx < indiceEtapa;
          return (
            <button
              key={etapa.id}
              type="button"
              onClick={() => mudarEtapa(etapa.id)}
              title={etapa.descricao}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold transition-colors ${
                ativa
                  ? 'bg-[#B38F4F] border-[#B38F4F] text-white'
                  : concluidaAntes
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0 ${
                  ativa ? 'bg-white/25 text-white' : concluidaAntes ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {concluidaAntes ? <Check className="w-2.5 h-2.5" /> : etapa.numero}
              </span>
              {etapa.titulo}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da etapa atual */}
      <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 mb-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Etapa {ETAPAS_FORMULARIO[indiceEtapa].numero} — {ETAPAS_FORMULARIO[indiceEtapa].titulo}
            </h3>
            <p className="text-[11px] text-slate-500">{ETAPAS_FORMULARIO[indiceEtapa].descricao}</p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarGuia((v) => !v)}
            className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-[#8A6A39] hover:text-[#B38F4F] transition-colors"
          >
            <Lightbulb className="w-3 h-3" />
            {mostrarGuia ? 'Ocultar dica' : 'Como preencher?'}
          </button>
        </div>

        {mostrarGuia && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">{ETAPAS_FORMULARIO[indiceEtapa].guia}</p>
          </div>
        )}

        {renderEtapa()}
      </div>

      {/* Navegação entre etapas */}
      <div className="flex items-center justify-between pb-16">
        <button
          type="button"
          onClick={() => irParaEtapa(indiceEtapa - 1)}
          disabled={indiceEtapa === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Etapa anterior
        </button>
        <span className="text-[11px] text-slate-400">
          Etapa {ETAPAS_FORMULARIO[indiceEtapa].numero} de {ETAPAS_FORMULARIO.length}
        </span>
        <button
          type="button"
          onClick={() => irParaEtapa(indiceEtapa + 1)}
          disabled={indiceEtapa === ETAPAS_FORMULARIO.length - 1}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#B38F4F] hover:bg-[#8A6A39] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          Próxima etapa
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir instrução?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tem certeza que deseja excluir "<strong>{form.titulo || 'Instrução sem título'}</strong>" ({form.codigo})? Essa ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete?.();
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                Excluir Instrução
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documento imprimível — segue a Diretriz de Elaboração de Documentos em PDF. */}
      <div className="hidden print:block jmt-print-doc">
        <PrintDocumentHeader
          titulo={form.titulo || 'Instrução de Trabalho sem título'}
          subtitulo={`${form.codigo} — ${categoriaCfg.label}`}
          metadados={[
            `Status: ${form.status}`,
            `Versão ${form.versao}`,
            form.responsavel ? `Dono do processo: ${form.responsavel}` : '',
            form.aprovadoPor ? `Aprovado por: ${form.aprovadoPor}` : '',
            form.dataVigencia ? `Vigente a partir de ${formatDateBR(form.dataVigencia)}` : '',
          ]
            .filter(Boolean)
            .join(' • ')}
        />
        <div className="space-y-3 mt-3 text-[11px]">
          {form.objetivo && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Objetivo</h4>
              <p>{form.objetivo}</p>
            </div>
          )}
          {form.aplicacaoAbrangencia && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Aplicação / Abrangência</h4>
              <p>{form.aplicacaoAbrangencia}</p>
            </div>
          )}
          {form.definicoes && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Definições</h4>
              <p>{form.definicoes}</p>
            </div>
          )}
          {form.responsabilidades.length > 0 && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Responsabilidades</h4>
              <ul className="list-disc pl-4">
                {form.responsabilidades.map((r) => (
                  <li key={r.id}>
                    <strong>{r.responsavel}:</strong> {r.responsabilidade}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {form.sipoc.length > 0 && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">SIPOC</h4>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-400">
                    <th className="text-left py-0.5 pr-2">Fornecedores</th>
                    <th className="text-left py-0.5 pr-2">Entradas</th>
                    <th className="text-left py-0.5 pr-2">Processo</th>
                    <th className="text-left py-0.5 pr-2">Saídas</th>
                    <th className="text-left py-0.5">Clientes</th>
                  </tr>
                </thead>
                <tbody>
                  {form.sipoc.map((l) => (
                    <tr key={l.id} className="border-b border-slate-200">
                      <td className="py-0.5 pr-2">{l.fornecedores}</td>
                      <td className="py-0.5 pr-2">{l.entradas}</td>
                      <td className="py-0.5 pr-2">{l.processo}</td>
                      <td className="py-0.5 pr-2">{l.saidas}</td>
                      <td className="py-0.5">{l.clientes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {form.fluxoProcesso.length > 0 && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Fluxo do Processo</h4>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-400">
                    <th className="text-left py-0.5 pr-2">#</th>
                    <th className="text-left py-0.5 pr-2">Etapa</th>
                    <th className="text-left py-0.5 pr-2">Responsável</th>
                    <th className="text-left py-0.5 pr-2">Sistema/Documento</th>
                    <th className="text-left py-0.5">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {form.fluxoProcesso.map((e) => (
                    <tr key={e.id} className="border-b border-slate-200">
                      <td className="py-0.5 pr-2">{e.ordem}</td>
                      <td className="py-0.5 pr-2">{e.etapa}</td>
                      <td className="py-0.5 pr-2">{e.responsavel}</td>
                      <td className="py-0.5 pr-2">{e.sistemaDocumento}</td>
                      <td className="py-0.5">{e.observacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {form.criteriosDecisao && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Critérios de Decisão</h4>
              <p>{form.criteriosDecisao}</p>
            </div>
          )}
          {form.registrosEvidencias && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Registros e Evidências</h4>
              <p>{form.registrosEvidencias}</p>
            </div>
          )}
          {form.indicadores.length > 0 && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Indicadores</h4>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-400">
                    <th className="text-left py-0.5 pr-2">Indicador</th>
                    <th className="text-left py-0.5 pr-2">Fórmula</th>
                    <th className="text-left py-0.5 pr-2">Meta</th>
                    <th className="text-left py-0.5 pr-2">Frequência</th>
                    <th className="text-left py-0.5">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {form.indicadores.map((i) => (
                    <tr key={i.id} className="border-b border-slate-200">
                      <td className="py-0.5 pr-2">{i.indicador}</td>
                      <td className="py-0.5 pr-2">{i.formula}</td>
                      <td className="py-0.5 pr-2">{i.meta}</td>
                      <td className="py-0.5 pr-2">{i.frequencia}</td>
                      <td className="py-0.5">{i.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {form.riscosControles.length > 0 && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Riscos e Controles</h4>
              <ul className="list-disc pl-4">
                {form.riscosControles.map((r) => (
                  <li key={r.id}>
                    <strong>{r.risco}:</strong> {r.controle}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {form.planoAcao5W2H.length > 0 && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Plano de Ação (5W2H)</h4>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-400">
                    <th className="text-left py-0.5 pr-2">O quê</th>
                    <th className="text-left py-0.5 pr-2">Por quê</th>
                    <th className="text-left py-0.5 pr-2">Quando</th>
                    <th className="text-left py-0.5 pr-2">Quem</th>
                    <th className="text-left py-0.5">Como</th>
                  </tr>
                </thead>
                <tbody>
                  {form.planoAcao5W2H.map((a) => (
                    <tr key={a.id} className="border-b border-slate-200">
                      <td className="py-0.5 pr-2">{a.oQue}</td>
                      <td className="py-0.5 pr-2">{a.porQue}</td>
                      <td className="py-0.5 pr-2">{a.quando}</td>
                      <td className="py-0.5 pr-2">{a.quem}</td>
                      <td className="py-0.5">{a.como}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {form.historicoRevisoes.length > 0 && (
            <div>
              <h4 className="font-bold text-[12px] mb-0.5">Histórico de Revisões</h4>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-400">
                    <th className="text-left py-0.5 pr-2">Revisão</th>
                    <th className="text-left py-0.5 pr-2">Data</th>
                    <th className="text-left py-0.5 pr-2">Alterado por</th>
                    <th className="text-left py-0.5">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {form.historicoRevisoes.map((r) => (
                    <tr key={r.id} className="border-b border-slate-200">
                      <td className="py-0.5 pr-2">{r.revisao}</td>
                      <td className="py-0.5 pr-2">{r.data ? formatDateBR(r.data) : ''}</td>
                      <td className="py-0.5 pr-2">{r.alteradoPor}</td>
                      <td className="py-0.5">{r.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <PrintDocumentFooter />
      </div>
    </div>
  );
};
