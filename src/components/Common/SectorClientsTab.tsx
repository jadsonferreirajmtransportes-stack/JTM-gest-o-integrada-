import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Link2,
  Unlink,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  FileText,
  Thermometer,
  Plane,
  Truck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Cliente, UserRole } from '../../types';
import {
  isClienteFarmaAereo,
  isClienteFarmaRodoviario,
  vincularClienteAoSetor,
  SetorModuloId,
} from '../../utils/sectorUtils';

interface SectorClientsTabProps {
  setor: SetorModuloId;
  allClientes: Cliente[];
  onSaveCliente: (cliente: Cliente) => void;
  onOpenNovoCliente?: () => void;
  onOpenLinkModal?: () => void;
  onSelectClienteDetail?: (cliente: Cliente) => void;
  userRole?: UserRole;
}

export const SectorClientsTab: React.FC<SectorClientsTabProps> = ({
  setor,
  allClientes,
  onSaveCliente,
  onOpenNovoCliente,
  onOpenLinkModal,
  onSelectClienteDetail,
  userRole = 'admin',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentoFilter, setSegmentoFilter] = useState<string>('todos');

  const isAereo = setor === 'farma_aereo';
  const setorNome = isAereo ? 'Farma Aéreo' : 'Farma Rodoviário';
  const SetorIcon = isAereo ? Plane : Truck;

  // Filter clients that belong to this sector
  const linkedClientes = useMemo(() => {
    return allClientes.filter((c) =>
      isAereo ? isClienteFarmaAereo(c) : isClienteFarmaRodoviario(c)
    );
  }, [allClientes, isAereo]);

  // Filtered by search & segment
  const displayedClientes = useMemo(() => {
    return linkedClientes.filter((c) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        c.nomeFantasia.toLowerCase().includes(q) ||
        c.razaoSocial.toLowerCase().includes(q) ||
        (c.cnpj && c.cnpj.includes(q)) ||
        (c.codigoCliente && c.codigoCliente.toLowerCase().includes(q)) ||
        (c.cidadeUF && c.cidadeUF.toLowerCase().includes(q));

      const matchSegmento =
        segmentoFilter === 'todos' || c.segmento === segmentoFilter;

      return matchSearch && matchSegmento;
    });
  }, [linkedClientes, searchTerm, segmentoFilter]);

  const handleUnlink = (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Deseja desvincular a empresa "${cliente.nomeFantasia}" do setor ${setorNome}?`
      )
    ) {
      const updated = vincularClienteAoSetor(cliente, setor, false);
      onSaveCliente(updated);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-[#C48229]"
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Empresas Atendidas no {setorNome}
              </h2>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-[#92611F]"
              >
                {linkedClientes.length} empresas vinculadas
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Laboratórios, hospitais, distribuidoras e clínicas com operações contratadas de {setorNome}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenLinkModal && (
            <button
              onClick={onOpenLinkModal}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-[#C48229] hover:bg-[#92611F] text-white"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Gerenciar Vínculos ({allClientes.length})</span>
            </button>
          )}

          {onOpenNovoCliente && (
            <button
              onClick={onOpenNovoCliente}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#C48229] hover:bg-[#92611F] text-white transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Empresa</span>
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
            placeholder="Buscar por Razão Social, Fantasia, CNPJ..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#C48229] focus:bg-white"
          />
        </div>

        <div className="w-full md:w-auto flex items-center gap-2">
          <label className="text-xs text-slate-500 font-semibold whitespace-nowrap">
            Segmento:
          </label>
          <select
            value={segmentoFilter}
            onChange={(e) => setSegmentoFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#C48229] focus:bg-white"
          >
            <option value="todos">Todos os Segmentos</option>
            <option value="Indústria Farmacêutica">Indústria Farmacêutica</option>
            <option value="Distribuidora de Medicamentos">Distribuidora de Medicamentos</option>
            <option value="Rede de Farmácias / Drogarias">Rede de Farmácias / Drogarias</option>
            <option value="Hospital / Clínica / Laboratório">Hospital / Clínica / Laboratório</option>
            <option value="Cosméticos & Nutracêuticos">Cosméticos & Nutracêuticos</option>
            <option value="Veterinário / Saúde Animal">Veterinário / Saúde Animal</option>
          </select>
        </div>
      </div>

      {/* Clients Grid */}
      {displayedClientes.length === 0 ? (
        <div className="bg-white rounded-xl p-10 border border-slate-200 text-center space-y-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto bg-amber-50 text-[#C48229]"
          >
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Nenhuma empresa encontrada para este filtro
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {linkedClientes.length === 0
              ? `Não há empresas vinculadas ao setor ${setorNome} no momento. Clique no botão de gerenciar vínculos para associar clientes.`
              : 'Nenhum resultado corresponde à sua pesquisa. Tente outros termos.'}
          </p>
          {onOpenLinkModal && (
            <button
              onClick={onOpenLinkModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all bg-[#C48229] hover:bg-[#92611F]"
            >
              <Link2 className="w-4 h-4" />
              <span>Vincular Empresas ao {setorNome}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {displayedClientes.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => onSelectClienteDetail && onSelectClienteDetail(cliente)}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-amber-100 text-[#92611F]"
                    >
                      {cliente.nomeFantasia.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                        {cliente.nomeFantasia}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {cliente.razaoSocial}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      cliente.status === 'Ativo'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {cliente.status}
                  </span>
                </div>

                {/* Badges Info */}
                <div className="flex flex-wrap items-center gap-1.5 my-2.5">
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {cliente.codigoCliente}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                    {cliente.segmento}
                  </span>
                  {cliente.cidadeUF && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {cliente.cidadeUF}
                    </span>
                  )}
                </div>

                {/* Operations & Cold Chain */}
                <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Exigência Térmica:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-sky-600" />
                      {cliente.faixaTemperaturaPrincipal || '2°C a 8°C / Climatizado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">AFE ANVISA / CRF:</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {cliente.afeAnvisaNumero ? `AFE ${cliente.afeAnvisaNumero}` : 'Válida / Regular'}
                    </span>
                  </div>
                  {cliente.contatoOperacionalNome && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Contato Operacional:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[140px]">
                        {cliente.contatoOperacionalNome}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <SetorIcon className="w-3.5 h-3.5 text-slate-400" />
                  Operando no {isAereo ? 'Aéreo' : 'Rodoviário'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleUnlink(cliente, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title={`Desvincular do setor ${setorNome}`}
                  >
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectClienteDetail && onSelectClienteDetail(cliente)}
                    className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Ver Cadastro</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
