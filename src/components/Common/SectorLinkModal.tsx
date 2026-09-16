import React, { useState } from 'react';
import {
  X,
  Search,
  Building2,
  Users,
  Check,
  Plus,
  ShieldCheck,
  Truck,
  Plane,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { Cliente, Colaborador } from '../../types';
import {
  isClienteFarmaAereo,
  isClienteFarmaRodoviario,
  isColaboradorFarmaAereo,
  isColaboradorFarmaRodoviario,
  SetorModuloId,
} from '../../utils/sectorUtils';

interface SectorLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  setor: SetorModuloId;
  mode: 'clientes' | 'colaboradores';
  allClientes: Cliente[];
  allColaboradores: Colaborador[];
  onToggleClienteLink: (cliente: Cliente, vincular: boolean) => void;
  onToggleColaboradorLink: (colaborador: Colaborador, vincular: boolean) => void;
  onOpenNovoCliente?: () => void;
  onOpenNovoColaborador?: () => void;
}

export const SectorLinkModal: React.FC<SectorLinkModalProps> = ({
  isOpen,
  onClose,
  setor,
  mode,
  allClientes,
  allColaboradores,
  onToggleClienteLink,
  onToggleColaboradorLink,
  onOpenNovoCliente,
  onOpenNovoColaborador,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const isAereo = setor === 'farma_aereo';
  const setorNome = isAereo ? 'Farma Aéreo (AWB / RDC 430)' : 'Farma Rodoviário (Frota / MDF-e)';
  const SetorIcon = isAereo ? Plane : Truck;
  const themeBg = 'from-[#B38F4F] to-[#5c4526]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`p-5 bg-linear-to-r ${themeBg} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-xs rounded-xl border border-white/20">
              <SetorIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {mode === 'clientes' ? 'Vincular Empresas ao Setor' : 'Alocar Colaboradores ao Setor'}
              </h2>
              <p className="text-xs text-white/80 font-medium">
                {setorNome} — Gerencie quem tem acesso e operações neste setor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                mode === 'clientes'
                  ? 'Buscar por Razão Social, Nome Fantasia ou CNPJ...'
                  : 'Buscar por Nome, Matrícula, Cargo ou CPF...'
              }
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F] focus:border-[#B38F4F]"
            />
          </div>
          {mode === 'clientes' && onOpenNovoCliente && (
            <button
              onClick={() => {
                onClose();
                onOpenNovoCliente();
              }}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Empresa</span>
            </button>
          )}
          {mode === 'colaboradores' && onOpenNovoColaborador && (
            <button
              onClick={() => {
                onClose();
                onOpenNovoColaborador();
              }}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Colaborador</span>
            </button>
          )}
        </div>

        {/* Items List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 divide-y divide-slate-100">
          {mode === 'clientes' ? (
            <>
              {allClientes
                .filter((c) => {
                  const q = searchTerm.toLowerCase();
                  return (
                    !q ||
                    c.nomeFantasia.toLowerCase().includes(q) ||
                    c.razaoSocial.toLowerCase().includes(q) ||
                    (c.cnpj && c.cnpj.includes(q)) ||
                    (c.codigoCliente && c.codigoCliente.toLowerCase().includes(q))
                  );
                })
                .map((cliente) => {
                  const isLinked = isAereo
                    ? isClienteFarmaAereo(cliente)
                    : isClienteFarmaRodoviario(cliente);

                  return (
                    <div
                      key={cliente.id}
                      className={`pt-2.5 first:pt-0 flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isLinked
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isLinked
                              ? 'bg-[#B38F4F] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {cliente.nomeFantasia}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {cliente.codigoCliente}
                            </span>
                            {isLinked && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-[#8A6A39]">
                                Vinculada ao {isAereo ? 'Aéreo' : 'Rodoviário'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {cliente.razaoSocial} • {cliente.cidadeUF || 'Natal/RN'} • {cliente.segmento}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleClienteLink(cliente, !isLinked)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                          isLinked
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-[#B38F4F] hover:bg-[#8A6A39] text-white shadow-xs'
                        }`}
                      >
                        {isLinked ? (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>Desvincular</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Vincular ao Setor</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </>
          ) : (
            <>
              {allColaboradores
                .filter((c) => c.status !== 'Inativo')
                .filter((c) => {
                  const q = searchTerm.toLowerCase();
                  return (
                    !q ||
                    c.nomeCompleto.toLowerCase().includes(q) ||
                    (c.codigoMatricula && c.codigoMatricula.toLowerCase().includes(q)) ||
                    (c.funcaoCargo && c.funcaoCargo.toLowerCase().includes(q)) ||
                    (c.setor && c.setor.toLowerCase().includes(q))
                  );
                })
                .map((colab) => {
                  const isLinked = isAereo
                    ? isColaboradorFarmaAereo(colab)
                    : isColaboradorFarmaRodoviario(colab);

                  return (
                    <div
                      key={colab.id}
                      className={`pt-2.5 first:pt-0 flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isLinked
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isLinked
                              ? 'bg-[#B38F4F] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {colab.nomeCompleto}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {colab.codigoMatricula}
                            </span>
                            {isLinked && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-[#8A6A39]">
                                Alocado ao {isAereo ? 'Aéreo' : 'Rodoviário'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {colab.funcaoCargo} • Setor Atual: {colab.setor || 'Operacional'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleColaboradorLink(colab, !isLinked)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                          isLinked
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-[#B38F4F] hover:bg-[#8A6A39] text-white shadow-xs'
                        }`}
                      >
                        {isLinked ? (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>Desalocar</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Alocar ao Setor</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
