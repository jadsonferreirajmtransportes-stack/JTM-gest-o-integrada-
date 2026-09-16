import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckSquare,
  Plus,
  Trash2,
  Tag,
  AlertCircle,
  FileText,
  Briefcase,
  Video,
  Paperclip,
  Upload,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  AtividadeGestao,
  CategoriaAtividadeGestao,
  StatusAtividadeGestao,
  PrioridadeAtividadeGestao,
  RecorrenciaAtividade,
  GlobalModuleId,
  Supervisor,
  Colaborador,
  ItemDeliberacaoAta,
  AnexoAtividadeGestao,
  UsuarioLogin,
} from '../../types';
import { CATEGORIA_CONFIG, getTipoLocalEfetivo } from './agendaUtils';
import { ImageViewerModal } from '../Common/ImageViewerModal';

interface AgendaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: AtividadeGestao) => void;
  initialData?: AtividadeGestao | null;
  selectedDate?: string;
  supervisores: Supervisor[];
  colaboradores: Colaborador[];
  usuarios: UsuarioLogin[];
}

const CATEGORIAS: CategoriaAtividadeGestao[] = [
  'Reunião & Governança',
  'Auditoria & RDC 430',
  'Operação & Frota',
  'Gente & DP',
  'Projetos & OKRs',
  'Comercial & Clientes',
  'Treinamento & Capacitação',
];

const STATUS_LIST: StatusAtividadeGestao[] = [
  'Agendada',
  'Em Andamento',
  'Concluída',
  'Cancelada',
  'Adiada',
];

const PRIORIDADES: PrioridadeAtividadeGestao[] = ['Baixa', 'Média', 'Alta', 'Urgente'];

const RECORRENCIAS: RecorrenciaAtividade[] = ['Nenhuma', 'Diária', 'Semanal', 'Quinzenal', 'Mensal'];

export const AgendaFormModal: React.FC<AgendaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  selectedDate,
  supervisores,
  colaboradores,
  usuarios,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDate = selectedDate || todayStr;

  const [anexoVisualizando, setAnexoVisualizando] = useState<{ url: string; nome: string } | null>(null);
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [descricao, setDescricao] = useState(initialData?.descricao || '');
  const [categoria, setCategoria] = useState<CategoriaAtividadeGestao>(
    initialData?.categoria || 'Reunião & Governança'
  );
  const [status, setStatus] = useState<StatusAtividadeGestao>(initialData?.status || 'Agendada');
  const [prioridade, setPrioridade] = useState<PrioridadeAtividadeGestao>(
    initialData?.prioridade || 'Média'
  );
  const [data, setData] = useState(initialData?.data || defaultDate);
  const [dataFim, setDataFim] = useState(initialData?.dataFim || '');
  const [horaInicio, setHoraInicio] = useState(initialData?.horaInicio || '09:00');
  const [horaFim, setHoraFim] = useState(initialData?.horaFim || '10:00');
  const [diaInteiro, setDiaInteiro] = useState(initialData?.diaInteiro || false);
  const [responsavel, setResponsavel] = useState(initialData?.responsavel || 'Jadson de Moraes');
  const [responsavelCargo, setResponsavelCargo] = useState(initialData?.responsavelCargo || 'Diretoria');
  const [participantesInput, setParticipantesInput] = useState(
    initialData?.participantes?.join(', ') || ''
  );
  // Marcação por login do sistema (diferente de "participantes", que é texto livre com nome de
  // colaborador/supervisor) — quem for marcado aqui ganha visão desta atividade mesmo que o
  // módulo Agenda esteja liberado só "sob demanda" (ver podeVerAtividade em agendaUtils.ts).
  const [usuariosMarcadosIds, setUsuariosMarcadosIds] = useState<string[]>(
    initialData?.usuariosMarcadosIds || []
  );
  const [tipoLocal, setTipoLocal] = useState<'presencial' | 'videoconferencia'>(
    initialData ? getTipoLocalEfetivo(initialData) : 'presencial'
  );
  const [localOuLink, setLocalOuLink] = useState(
    initialData?.localOuLink || 'Sala de Reuniões Matriz JMT'
  );
  const [linkLocalizacao, setLinkLocalizacao] = useState(initialData?.linkLocalizacao || '');
  const [moduloRelacionado, setModuloRelacionado] = useState<GlobalModuleId | 'geral'>(
    initialData?.moduloRelacionado || 'geral'
  );
  const [recorrencia, setRecorrencia] = useState<RecorrenciaAtividade>(
    initialData?.recorrencia || 'Nenhuma'
  );
  const [pautaAta, setPautaAta] = useState(initialData?.pautaAta || '');
  const [deliberacoes, setDeliberacoes] = useState<ItemDeliberacaoAta[]>(
    initialData?.deliberacoes || []
  );

  const [novoItemDeliberacao, setNovoItemDeliberacao] = useState('');
  const [novoItemResponsavel, setNovoItemResponsavel] = useState('');

  const [anexos, setAnexos] = useState<AnexoAtividadeGestao[]>(initialData?.anexos || []);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mesmo limite por arquivo já usado no anexo do Chat Interno — anexo vira base64 direto na
  // linha (sem bucket de Storage separado), e um arquivo grande demais arrisca estourar o tempo
  // limite da gravação no banco (já visto antes com anexos de colaborador).
  const TAMANHO_MAXIMO_ANEXO_MB = 5;

  // Reajusta todos os campos sempre que o modal é reaberto — como o componente nunca é
  // desmontado (apenas o prop `isOpen` alterna), sem isso o formulário mantinha os dados
  // digitados na última vez que foi usado (edição ou criação anterior).
  useEffect(() => {
    if (!isOpen) return;

    setTitulo(initialData?.titulo || '');
    setDescricao(initialData?.descricao || '');
    setCategoria(initialData?.categoria || 'Reunião & Governança');
    setStatus(initialData?.status || 'Agendada');
    setPrioridade(initialData?.prioridade || 'Média');
    setData(initialData?.data || selectedDate || new Date().toISOString().split('T')[0]);
    setDataFim(initialData?.dataFim || '');
    setHoraInicio(initialData?.horaInicio || '09:00');
    setHoraFim(initialData?.horaFim || '10:00');
    setDiaInteiro(initialData?.diaInteiro || false);
    setResponsavel(initialData?.responsavel || 'Jadson de Moraes');
    setResponsavelCargo(initialData?.responsavelCargo || 'Diretoria');
    setParticipantesInput(initialData?.participantes?.join(', ') || '');
    setUsuariosMarcadosIds(initialData?.usuariosMarcadosIds || []);
    setTipoLocal(initialData ? getTipoLocalEfetivo(initialData) : 'presencial');
    setLocalOuLink(initialData?.localOuLink || 'Sala de Reuniões Matriz JMT');
    setLinkLocalizacao(initialData?.linkLocalizacao || '');
    setModuloRelacionado(initialData?.moduloRelacionado || 'geral');
    setRecorrencia(initialData?.recorrencia || 'Nenhuma');
    setPautaAta(initialData?.pautaAta || '');
    setDeliberacoes(initialData?.deliberacoes || []);
    setNovoItemDeliberacao('');
    setNovoItemResponsavel('');
    setAnexos(initialData?.anexos || []);
    setErroAnexo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, selectedDate]);

  const handleToggleUsuarioMarcado = (userId: string) => {
    setUsuariosMarcadosIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddDeliberacao = () => {
    if (!novoItemDeliberacao.trim()) return;
    const newItem: ItemDeliberacaoAta = {
      id: `del-${Date.now()}`,
      texto: novoItemDeliberacao.trim(),
      concluido: false,
      responsavel: novoItemResponsavel.trim() || undefined,
    };
    setDeliberacoes([...deliberacoes, newItem]);
    setNovoItemDeliberacao('');
    setNovoItemResponsavel('');
  };

  const handleRemoveDeliberacao = (id: string) => {
    setDeliberacoes(deliberacoes.filter((d) => d.id !== id));
  };

  const handleToggleDeliberacao = (id: string) => {
    setDeliberacoes(
      deliberacoes.map((d) => (d.id === id ? { ...d, concluido: !d.concluido } : d))
    );
  };

  const handleSelecionarAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB > TAMANHO_MAXIMO_ANEXO_MB) {
      setErroAnexo(`"${file.name}" tem ${tamanhoMB.toFixed(1)}MB — o limite por arquivo é ${TAMANHO_MAXIMO_ANEXO_MB}MB.`);
      return;
    }

    setErroAnexo(null);
    const reader = new FileReader();
    reader.onload = () => {
      const novoAnexo: AnexoAtividadeGestao = {
        id: `anexo-atv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nome: file.name,
        tipo: file.type || 'application/octet-stream',
        tamanho: tamanhoMB >= 1 ? `${tamanhoMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
        dataUpload: new Date().toISOString(),
        arquivoUrl: reader.result as string,
      };
      setAnexos((prev) => [...prev, novoAnexo]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverAnexo = (id: string) => {
    setAnexos((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    if (dataFim && dataFim < data) {
      alert('A Data Final não pode ser anterior à Data de Início. Ajuste o intervalo da atividade.');
      return;
    }

    const participantesList = participantesInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const activity: AtividadeGestao = {
      id: initialData?.id || `act-${Date.now()}`,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoria,
      status,
      prioridade,
      data,
      dataFim: dataFim && dataFim > data ? dataFim : undefined,
      horaInicio: diaInteiro ? '08:00' : horaInicio,
      horaFim: diaInteiro ? '18:00' : horaFim,
      diaInteiro,
      responsavel,
      responsavelCargo: responsavelCargo || undefined,
      participantes: participantesList,
      criadoPorUserId: initialData?.criadoPorUserId,
      usuariosMarcadosIds,
      tipoLocal,
      localOuLink: localOuLink.trim() || 'A definir',
      linkLocalizacao: tipoLocal === 'presencial' ? linkLocalizacao.trim() || undefined : undefined,
      pautaAta: pautaAta.trim() || undefined,
      deliberacoes,
      anexos,
      moduloRelacionado,
      recorrencia,
      criadoEm: initialData?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      concluidaEm: status === 'Concluída' ? initialData?.concluidaEm || new Date().toISOString() : undefined,
    };

    onSave(activity);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B38F4F] text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {initialData ? 'Editar Atividade da Gestão' : 'Nova Atividade da Gestão'}
              </h2>
              <p className="text-xs text-slate-500">
                Alinhamentos, comitês, auditorias RDC 430 e entregas estratégicas JMT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Título */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Título da Atividade / Reunião <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Comitê Semanal de Operações Farma Aéreo e Rodoviário"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
            />
          </div>

          {/* Categoria, Status, Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaAtividadeGestao)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusAtividadeGestao)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
              >
                {STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PrioridadeAtividadeGestao)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
              >
                {PRIORIDADES.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data e Horários */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#B38F4F]" />
                Data e Horário
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={diaInteiro}
                  onChange={(e) => setDiaInteiro(e.target.checked)}
                  className="rounded border-slate-300 text-[#B38F4F] focus:ring-[#B38F4F]"
                />
                <span>Dia Inteiro</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Data de Início</label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value);
                    // Evita Data Final anterior à nova Data de Início
                    if (dataFim && dataFim < e.target.value) setDataFim('');
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Data Final <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="date"
                  min={data}
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                />
              </div>
            </div>

            {dataFim && dataFim > data && (
              <p className="text-[11px] text-[#8A6A39] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>
                  Atividade de vários dias: de{' '}
                  {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')} a{' '}
                  {new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')} — irá aparecer em todos
                  os dias desse intervalo na agenda.
                </span>
              </p>
            )}

            {!diaInteiro && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {dataFim && dataFim > data ? 'Hora de Início (1º dia)' : 'Hora de Início'}
                  </label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {dataFim && dataFim > data ? 'Hora de Término (último dia)' : 'Hora de Término'}
                  </label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                  />
                </div>
              </div>
            )}

            {/* Recorrência */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Recorrência da Atividade</label>
                <select
                  value={recorrencia}
                  onChange={(e) => setRecorrencia(e.target.value as RecorrenciaAtividade)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                >
                  {RECORRENCIAS.map((rec) => (
                    <option key={rec} value={rec}>
                      {rec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Módulo Operacional Vinculado</label>
                <select
                  value={moduloRelacionado}
                  onChange={(e) => setModuloRelacionado(e.target.value as GlobalModuleId | 'geral')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                >
                  <option value="geral">Geral / Corporativo JMT</option>
                  <option value="farma_aereo">Farma Aéreo</option>
                  <option value="farma_rodoviario">Farma Rodoviário</option>
                  <option value="clientes">Carteira de Clientes</option>
                  <option value="dp">Departamento Pessoal</option>
                  <option value="projetos">Projetos & OKRs</option>
                </select>
              </div>
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Responsável Principal <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="supervisores-list"
              required
              value={responsavel}
              onChange={(e) => {
                setResponsavel(e.target.value);
                const foundSup = supervisores.find((s) => s.nome === e.target.value);
                if (foundSup) setResponsavelCargo(foundSup.cargo);
              }}
              placeholder="Ex: Carlos Eduardo Lima"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
            />
            <datalist id="supervisores-list">
              <option value="Jadson de Moraes" />
              <option value="Carlos Eduardo Lima" />
              <option value="Dra. Mariana Alencar" />
              <option value="Roberto Santos" />
              <option value="Aline Cristina Rocha" />
              <option value="Marcos Aurélio Souza" />
              {supervisores.map((s) => (
                <option key={s.id} value={s.nome} />
              ))}
            </datalist>
          </div>

          {/* Local ou Videoconferência */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#B38F4F]" />
              Onde será a atividade?
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoLocal('presencial')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  tipoLocal === 'presencial'
                    ? 'bg-[#B38F4F] border-[#B38F4F] text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:border-amber-300'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Local (Presencial)</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoLocal('videoconferencia')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  tipoLocal === 'videoconferencia'
                    ? 'bg-[#B38F4F] border-[#B38F4F] text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:border-amber-300'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Videoconferência</span>
              </button>
            </div>

            {tipoLocal === 'presencial' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Endereço / Local</label>
                  <input
                    type="text"
                    value={localOuLink}
                    onChange={(e) => setLocalOuLink(e.target.value)}
                    placeholder="Ex: Sala de Reuniões Matriz JMT"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Link de Localização (Google Maps) <span className="text-slate-400 font-normal">— opcional</span>
                  </label>
                  <input
                    type="text"
                    data-no-uppercase="true"
                    value={linkLocalizacao}
                    onChange={(e) => setLinkLocalizacao(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Link da Videoconferência</label>
                <input
                  type="text"
                  data-no-uppercase="true"
                  value={localOuLink}
                  onChange={(e) => setLocalOuLink(e.target.value)}
                  placeholder="Ex: https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                />
              </div>
            )}
          </div>

          {/* Participantes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Participantes (separados por vírgula)
            </label>
            <input
              type="text"
              value={participantesInput}
              onChange={(e) => setParticipantesInput(e.target.value)}
              placeholder="Ex: Carlos Lima, Mariana Alencar, Equipe Farma Aéreo"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
            />
          </div>

          {/* Marcar Usuários do Sistema — compartilha a visão desta atividade */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Compartilhar com Usuários do Sistema (opcional)
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">
              Só você (quem criou) e quem for marcado aqui enxergam esta atividade na Agenda — os
              demais logins com acesso ao módulo não veem, a não ser que sejam administradores.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {usuarios
                .filter((u) => u.status === 'Ativo')
                .map((u) => {
                  const marcado = usuariosMarcadosIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleToggleUsuarioMarcado(u.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        marcado
                          ? 'bg-[#B38F4F] border-[#B38F4F] text-white'
                          : 'bg-white border-slate-300 text-slate-600 hover:border-amber-300'
                      }`}
                    >
                      {u.nome}
                    </button>
                  );
                })}
              {usuarios.filter((u) => u.status === 'Ativo').length === 0 && (
                <span className="text-[11px] text-slate-400">Nenhum outro login cadastrado ainda.</span>
              )}
            </div>
          </div>

          {/* Descrição e Pauta */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Objetivo / Descrição Sumária
            </label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Breve resumo da finalidade deste compromisso..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pauta da Reunião / Itens a Discutir
            </label>
            <textarea
              rows={3}
              value={pautaAta}
              onChange={(e) => setPautaAta(e.target.value)}
              placeholder="1. Ponto principal a ser alinhado;&#10;2. Decisões operacionais;&#10;3. Próximos passos."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F] font-mono"
            />
          </div>

          {/* Checklist de Deliberações e Tarefas */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-[#B38F4F]" />
                Deliberações & Ações Derivadas ({deliberacoes.length})
              </span>
            </div>

            {/* List */}
            {deliberacoes.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {deliberacoes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={item.concluido}
                        onChange={() => handleToggleDeliberacao(item.id)}
                        className="rounded border-slate-300 text-[#B38F4F] focus:ring-[#B38F4F]"
                      />
                      <span className={`truncate ${item.concluido ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {item.texto}
                      </span>
                      {item.responsavel && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium shrink-0">
                          {item.responsavel}
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliberacao(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input to add */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={novoItemDeliberacao}
                onChange={(e) => setNovoItemDeliberacao(e.target.value)}
                placeholder="Nova deliberação ou tarefa acordada..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliberacao();
                  }
                }}
              />
              <input
                type="text"
                value={novoItemResponsavel}
                onChange={(e) => setNovoItemResponsavel(e.target.value)}
                placeholder="Responsável (opcional)"
                className="w-36 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
              />
              <button
                type="button"
                onClick={handleAddDeliberacao}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8A6A39] rounded-lg font-medium transition-colors shrink-0"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Documentos / Anexos */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#B38F4F]" />
                Documentos / Anexos ({anexos.length})
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8A6A39] rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Anexar</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleSelecionarAnexo}
                className="hidden"
              />
            </div>

            {erroAnexo && (
              <p className="text-[11px] text-rose-600 font-medium">{erroAnexo}</p>
            )}

            {anexos.length > 0 && (
              <div className="space-y-1.5">
                {anexos.map((anexo) => (
                  <div
                    key={anexo.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-[#B38F4F] shrink-0" />
                      <span className="truncate font-medium">{anexo.nome}</span>
                      {anexo.tamanho && (
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{anexo.tamanho}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAnexoVisualizando({ url: anexo.arquivoUrl, nome: anexo.nome })}
                        className="p-1 text-slate-400 hover:text-[#8A6A39] transition-colors"
                        title="Visualizar anexo"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={anexo.arquivoUrl}
                        download={anexo.nome}
                        className="p-1 text-slate-400 hover:text-[#8A6A39] transition-colors"
                        title="Baixar anexo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoverAnexo(anexo.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remover anexo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {anexos.length === 0 && !erroAnexo && (
              <p className="text-[11px] text-slate-400 italic">
                Nenhum documento anexado — ata assinada, pauta em PDF, planilha etc.
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#B38F4F] hover:bg-[#8A6A39] rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>{initialData ? 'Salvar Alterações' : 'Criar Atividade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    <ImageViewerModal
      isOpen={!!anexoVisualizando}
      onClose={() => setAnexoVisualizando(null)}
      imageUrl={anexoVisualizando?.url}
      fileName={anexoVisualizando?.nome}
      title="Visualização de Anexo"
    />
    </>
  );
};
