import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Link2,
  Unlink,
  ShieldCheck,
  Phone,
  Mail,
  Award,
  Truck,
  Plane,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { Colaborador, UserRole } from '../../types';
import {
  isColaboradorFarmaAereo,
  isColaboradorFarmaRodoviario,
  vincularColaboradorAoSetor,
  SetorModuloId,
} from '../../utils/sectorUtils';

interface SectorEmployeesTabProps {
  setor: SetorModuloId;
  allColaboradores: Colaborador[];
  onSaveColaborador: (colaborador: Colaborador) => void;
  onOpenNovoColaborador?: () => void;
  onOpenLinkModal?: () => void;
  onSelectColaboradorDetail?: (colaborador: Colaborador) => void;
  userRole?: UserRole;
}

export const SectorEmployeesTab: React.FC<SectorEmployeesTabProps> = ({
  setor,
  allColaboradores,
  onSaveColaborador,
  onOpenNovoColaborador,
  onOpenLinkModal,
  onSelectColaboradorDetail,
  userRole = 'admin',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [funcaoFilter, setFuncaoFilter] = useState<string>('todos');

  const isAereo = setor === 'farma_aereo';
  const setorNome = isAereo ? 'Farma Aéreo' : 'Farma Rodoviário';
  const SetorIcon = isAereo ? Plane : Truck;

  // Filter employees allocated to this sector
  const linkedColaboradores = useMemo(() => {
    return allColaboradores
      .filter((c) => c.status !== 'Inativo')
      .filter((c) =>
        isAereo ? isColaboradorFarmaAereo(c) : isColaboradorFarmaRodoviario(c)
      );
  }, [allColaboradores, isAereo]);

  // Unique functions in this sector
  const uniqueFuncoes = useMemo(() => {
    const set = new Set<string>();
    linkedColaboradores.forEach((c) => {
      if (c.funcaoCargo) set.add(c.funcaoCargo);
    });
    return Array.from(set);
  }, [linkedColaboradores]);

  // Display list
  const displayedColaboradores = useMemo(() => {
    return linkedColaboradores.filter((c) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        c.nomeCompleto.toLowerCase().includes(q) ||
        (c.codigoMatricula && c.codigoMatricula.toLowerCase().includes(q)) ||
        (c.cpf && c.cpf.includes(q)) ||
        (c.funcaoCargo && c.funcaoCargo.toLowerCase().includes(q)) ||
        (c.setor && c.setor.toLowerCase().includes(q));

      const matchFuncao =
        funcaoFilter === 'todos' || c.funcaoCargo === funcaoFilter;

      return matchSearch && matchFuncao;
    });
  }, [linkedColaboradores, searchTerm, funcaoFilter]);

  const handleDeallocate = (colab: Colaborador, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Deseja desalocar o colaborador "${colab.nomeCompleto}" do setor ${setorNome}?`
      )
    ) {
      const updated = vincularColaboradorAoSetor(colab, setor, false);
      onSaveColaborador(updated);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isAereo ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Equipe Alocada ao {setorNome}
              </h2>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isAereo
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {linkedColaboradores.length} colaboradores
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Farmacêuticos RT, motoristas especializados, despachantes aeroportuários e analistas operacionais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenLinkModal && (
            <button
              onClick={onOpenLinkModal}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isAereo
                  ? 'bg-sky-600 hover:bg-sky-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Alocar / Remanejar ({allColaboradores.length})</span>
            </button>
          )}

          {onOpenNovoColaborador && (
            <button
              onClick={onOpenNovoColaborador}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#B38F4F] hover:bg-[#8A6A39] text-white transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Colaborador</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nome, Matrícula, Cargo..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
          />
        </div>

        <div className="w-full md:w-auto flex items-center gap-2">
          <label className="text-xs text-slate-500 font-semibold whitespace-nowrap">
            Função / Cargo:
          </label>
          <select
            value={funcaoFilter}
            onChange={(e) => setFuncaoFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
          >
            <option value="todos">Todas as Funções ({uniqueFuncoes.length})</option>
            {uniqueFuncoes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      {displayedColaboradores.length === 0 ? (
        <div className="bg-white rounded-xl p-10 border border-slate-200 text-center space-y-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto ${
              isAereo ? 'bg-sky-50 text-sky-500' : 'bg-emerald-50 text-emerald-500'
            }`}
          >
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Nenhum colaborador alocado neste setor
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {linkedColaboradores.length === 0
              ? `Não há colaboradores vinculados ao setor ${setorNome} atualmente. Clique no botão de alocação para adicionar farmacêuticos, motoristas e operadores.`
              : 'Nenhum resultado corresponde à sua pesquisa.'}
          </p>
          {onOpenLinkModal && (
            <button
              onClick={onOpenLinkModal}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all ${
                isAereo ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Alocar Colaboradores ao {setorNome}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {displayedColaboradores.map((colab) => {
            const isFarmaceutico =
              colab.funcaoCargo.toLowerCase().includes('farmacêutic') ||
              colab.funcaoCargo.toLowerCase().includes('rt');
            const isMotorista =
              colab.funcaoCargo.toLowerCase().includes('motorista') ||
              colab.cnhNumero;

            return (
              <div
                key={colab.id}
                onClick={() =>
                  onSelectColaboradorDetail && onSelectColaboradorDetail(colab)
                }
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Header card */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isFarmaceutico
                            ? 'bg-purple-100 text-purple-800'
                            : isAereo
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {colab.nomeCompleto
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                          {colab.nomeCompleto}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          {colab.funcaoCargo}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        colab.status === 'Ativo'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {colab.status}
                    </span>
                  </div>

                  {/* Badges Info */}
                  <div className="flex flex-wrap items-center gap-1.5 my-2.5">
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      Matr. {colab.codigoMatricula}
                    </span>
                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {colab.setor || 'Operacional'}
                    </span>
                    {isFarmaceutico && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        CRF RT Habilitado
                      </span>
                    )}
                    {isMotorista && colab.cnhCategoria && (
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        CNH Cat. {colab.cnhCategoria} (EAR)
                      </span>
                    )}
                  </div>

                  {/* Health & Regulation info */}
                  <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Exame Ocupacional ASO:</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Apto RDC 430/2020
                      </span>
                    </div>
                    {colab.telefoneWhatsapp && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">WhatsApp / Fone:</span>
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {colab.telefoneWhatsapp}
                        </span>
                      </div>
                    )}
                    {colab.email && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">E-mail:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[150px]">
                          {colab.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <SetorIcon className="w-3.5 h-3.5 text-slate-400" />
                    Alocado no {isAereo ? 'Aéreo' : 'Rodoviário'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleDeallocate(colab, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={`Desalocar do setor ${setorNome}`}
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectColaboradorDetail &&
                        onSelectColaboradorDetail(colab)
                      }
                      className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Ficha DP</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
