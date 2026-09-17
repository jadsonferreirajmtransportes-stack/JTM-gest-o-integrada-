import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  Building2,
  Plane,
  Truck,
  Users,
  FolderKanban,
  AlertTriangle,
  Link2,
  ChevronRight,
  Unlink,
  Calendar,
} from 'lucide-react';
import {
  Cliente,
  Colaborador,
  ProjetoGerencial,
  EmbarqueAereo,
  ViagemRodoviaria,
  Ocorrencia,
  AtividadeGestao,
  TipoEntidadeVinculo,
  VinculoNotaModulo,
  GlobalModuleId,
} from '../../types';
import { formatDate } from '../../utils/formatters';

interface VincularModuloModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVincular: (vinculo: VinculoNotaModulo) => void;
  onRemoverVinculo: () => void;
  vinculoAtual?: VinculoNotaModulo;
  clientes: Cliente[];
  colaboradores: Colaborador[];
  projetos: ProjetoGerencial[];
  embarquesAereos: EmbarqueAereo[];
  viagensRodoviarias: ViagemRodoviaria[];
  ocorrencias: Ocorrencia[];
  atividadesGestao: AtividadeGestao[];
}

const TIPOS: Array<{ tipo: TipoEntidadeVinculo; label: string; icon: React.ElementType; modulo: GlobalModuleId; color: string }> = [
  { tipo: 'cliente', label: 'Cliente', icon: Building2, modulo: 'clientes', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { tipo: 'embarque_aereo', label: 'Embarque Aéreo', icon: Plane, modulo: 'farma_aereo', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { tipo: 'viagem_rodoviaria', label: 'Viagem Rodoviária', icon: Truck, modulo: 'farma_rodoviario', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { tipo: 'colaborador', label: 'Colaborador', icon: Users, modulo: 'dp', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { tipo: 'projeto', label: 'Projeto Gerencial', icon: FolderKanban, modulo: 'projetos', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { tipo: 'ocorrencia', label: 'Ocorrência', icon: AlertTriangle, modulo: 'dp', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { tipo: 'atividade_agenda', label: 'Compromisso da Agenda', icon: Calendar, modulo: 'agenda', color: 'text-[#8A6A39] bg-amber-50 border-amber-200' },
];

export const VincularModuloModal: React.FC<VincularModuloModalProps> = ({
  isOpen,
  onClose,
  onVincular,
  onRemoverVinculo,
  vinculoAtual,
  clientes,
  colaboradores,
  projetos,
  embarquesAereos,
  viagensRodoviarias,
  ocorrencias,
  atividadesGestao,
}) => {
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoEntidadeVinculo | null>(null);
  const [busca, setBusca] = useState('');

  const itens = useMemo(() => {
    switch (tipoSelecionado) {
      case 'cliente':
        return clientes.map((c) => ({ id: c.id, label: c.razaoSocial, sub: c.nomeFantasia || c.cidadeUF }));
      case 'colaborador':
        return colaboradores.map((c) => ({ id: c.id, label: c.nomeCompleto, sub: c.funcaoCargo }));
      case 'projeto':
        return projetos.map((p) => ({ id: p.id, label: p.titulo, sub: p.codigo }));
      case 'embarque_aereo':
        return embarquesAereos.map((e) => ({
          id: e.id,
          label: `${e.codigoAWB} — ${e.clienteNome}`,
          sub: `${e.destinatarioNome} • ${formatDate(e.dataEmbarque)}`,
        }));
      case 'viagem_rodoviaria':
        return viagensRodoviarias.map((v) => ({
          id: v.id,
          label: v.codigoViagem || v.tituloRota || v.veiculoPlaca,
          sub: `${v.destinoFinal || v.rotaDestino || ''} • ${v.motoristaNome}`,
        }));
      case 'ocorrencia':
        return ocorrencias.map((o) => ({
          id: o.id,
          label: `${o.tipo} — ${o.colaboradorNome || ''}`,
          sub: o.dataOcorrencia ? formatDate(o.dataOcorrencia) : '',
        }));
      case 'atividade_agenda':
        return atividadesGestao.map((a) => ({
          id: a.id,
          label: a.titulo,
          sub: `${formatDate(a.data)}${a.diaInteiro ? '' : ` às ${a.horaInicio}`} • ${a.responsavel}`,
        }));
      default:
        return [];
    }
  }, [tipoSelecionado, clientes, colaboradores, projetos, embarquesAereos, viagensRodoviarias, ocorrencias, atividadesGestao]);

  const itensFiltrados = itens.filter((i) => i.label.toLowerCase().includes(busca.toLowerCase()));

  const handleSelecionar = (id: string, label: string) => {
    if (!tipoSelecionado) return;
    const modInfo = TIPOS.find((t) => t.tipo === tipoSelecionado)!;
    onVincular({ modulo: modInfo.modulo, tipoEntidade: tipoSelecionado, entidadeId: id, entidadeLabel: label });
    onClose();
    setTipoSelecionado(null);
    setBusca('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#B38F4F]" />
            <h3 className="text-sm font-bold text-slate-800">
              {tipoSelecionado ? `Selecionar ${TIPOS.find((t) => t.tipo === tipoSelecionado)?.label}` : 'Vincular a um Módulo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setTipoSelecionado(null);
              setBusca('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {vinculoAtual && !tipoSelecionado && (
            <div className="p-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="min-w-0">
                  <span className="text-[10px] text-[#8A6A39] font-bold uppercase tracking-wider block">Vínculo Atual</span>
                  <span className="text-xs text-[#5c4526] font-semibold truncate block">{vinculoAtual.entidadeLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRemoverVinculo();
                    onClose();
                  }}
                  className="p-1.5 text-[#8A6A39] hover:text-rose-600 hover:bg-white rounded-lg transition-colors shrink-0"
                  title="Remover vínculo"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {!tipoSelecionado ? (
            <div className="p-3 space-y-1.5">
              {TIPOS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.tipo}
                    type="button"
                    onClick={() => setTipoSelecionado(t.tipo)}
                    className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${t.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{t.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]/30"
                />
              </div>
              <button
                type="button"
                onClick={() => setTipoSelecionado(null)}
                className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
              >
                ← Escolher outro tipo de registro
              </button>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {itensFiltrados.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelecionar(item.id, item.label)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-800 block truncate">{item.label}</span>
                    {item.sub && <span className="text-[10px] text-slate-400 block truncate">{item.sub}</span>}
                  </button>
                ))}
                {itensFiltrados.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-6">Nenhum registro encontrado.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
