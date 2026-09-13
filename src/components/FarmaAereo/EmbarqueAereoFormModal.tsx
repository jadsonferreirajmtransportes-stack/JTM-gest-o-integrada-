import React, { useState, useEffect } from 'react';
import {
  X,
  Plane,
  Thermometer,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Box,
} from 'lucide-react';
import {
  EmbarqueAereo,
  StatusEmbarqueAereo,
  FaixaTemperaturaAereo,
  TipoCargaAereo,
  CompanhiaAerea,
  Cliente,
} from '../../types';

interface EmbarqueAereoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (embarque: EmbarqueAereo) => void;
  initialData?: EmbarqueAereo | null;
  clientes: Cliente[];
}

export const EmbarqueAereoFormModal: React.FC<EmbarqueAereoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  clientes,
}) => {
  const buildEmptyEmbarque = (): Partial<EmbarqueAereo> => ({
    codigoAWB: '',
    numeroCteAereo: '',
    clienteId: clientes[0]?.id || '',
    clienteNome: clientes[0]?.nomeFantasia || clientes[0]?.razaoSocial || '',
    remetenteNome: '',
    remetenteCidadeUF: 'São Paulo/SP',
    destinatarioNome: '',
    destinatarioEndereco: '',
    destinatarioCidadeUF: 'Natal/RN',
    tipoCarga: 'Medicamentos Termolábeis',
    faixaTemperatura: 'Refrigerado (2°C a 8°C)',
    tipoEmbalagem: 'Caixa Térmica Qualificada VIP com PCM 2°C-8°C',
    companhiaAerea: 'LATAM Cargo',
    numeroVoo: '',
    aeroportoOrigem: 'GRU - São Paulo/Guarulhos',
    aeroportoDestino: 'NAT - Aeroporto Aluízio Alves (Natal/RN)',
    dataEmbarque: new Date().toISOString().split('T')[0],
    horarioPrevistoDecolagem: '08:00',
    horarioPrevistoPouso: '11:30',
    previsaoEntregaDestino: `${new Date().toISOString().split('T')[0]} 16:00`,
    status: 'No TECA Origem',
    temperaturaAtual: 4.5,
    temperaturaMinima: 2.0,
    temperaturaMaxima: 8.0,
    dataloggerSerial: 'TT-ULTRA-8800',
    dataloggerModelo: 'TempTale Ultra Multiproduto',
    termogramaValidado: true,
    pesoBrutoKg: 25.0,
    quantidadeVolumes: 2,
    valorMercadoria: 85000.0,
    valorFreteAereo: 1950.0,
    urgencia: 'Normal',
    numeroNotaFiscal: '',
    responsavelLiberacaoTeca: 'Plantão JMT Natal',
    observacoes: '',
    historico: [
      {
        id: `hist-${Date.now()}`,
        dataHora: `${new Date().toISOString().split('T')[0]} 08:00`,
        local: 'TECA Origem',
        descricao: 'Embarque aéreo registrado no sistema.',
        temperaturaAferida: 4.5,
      },
    ],
  });

  const [formData, setFormData] = useState<Partial<EmbarqueAereo>>(() => {
    if (initialData) return { ...initialData };
    return buildEmptyEmbarque();
  });

  // Reajusta o formulário sempre que o modal é reaberto — o componente nunca é desmontado
  // (apenas o prop `isOpen` alterna), então sem isso os dados do último registro permaneciam.
  useEffect(() => {
    if (!isOpen) return;
    setFormData(initialData ? { ...initialData } : buildEmptyEmbarque());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleClienteChange = (cliId: string) => {
    const found = clientes.find((c) => c.id === cliId);
    setFormData((prev) => ({
      ...prev,
      clienteId: cliId,
      clienteNome: found ? found.nomeFantasia || found.razaoSocial : '',
    }));
  };

  const handleFaixaTempChange = (faixa: FaixaTemperaturaAereo) => {
    let min = 2;
    let max = 8;
    let curr = 4.5;
    if (faixa.includes('15°C')) {
      min = 15;
      max = 25;
      curr = 20.0;
    } else if (faixa.includes('Gelo Seco')) {
      min = -70;
      max = -20;
      curr = -30.0;
    } else if (faixa.includes('Nitrogênio')) {
      min = -196;
      max = -150;
      curr = -190.0;
    }

    setFormData((prev) => ({
      ...prev,
      faixaTemperatura: faixa,
      temperaturaMinima: min,
      temperaturaMaxima: max,
      temperaturaAtual: curr,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigoAWB || !formData.clienteId) return;

    const payload: EmbarqueAereo = {
      id: initialData?.id || `emb-air-${Date.now()}`,
      codigoAWB: formData.codigoAWB.trim().toUpperCase(),
      numeroCteAereo: formData.numeroCteAereo?.trim() || `CTE-AER-${Date.now().toString().slice(-6)}`,
      clienteId: formData.clienteId,
      clienteNome: formData.clienteNome || 'Cliente JMT',
      remetenteNome: formData.remetenteNome?.trim() || 'Laboratório Remetente',
      remetenteCidadeUF: formData.remetenteCidadeUF?.trim() || 'São Paulo/SP',
      destinatarioNome: formData.destinatarioNome?.trim() || 'Destinatário Final',
      destinatarioEndereco: formData.destinatarioEndereco?.trim() || '',
      destinatarioCidadeUF: formData.destinatarioCidadeUF?.trim() || 'Natal/RN',
      tipoCarga: (formData.tipoCarga as TipoCargaAereo) || 'Medicamentos Termolábeis',
      faixaTemperatura: (formData.faixaTemperatura as FaixaTemperaturaAereo) || 'Refrigerado (2°C a 8°C)',
      tipoEmbalagem: formData.tipoEmbalagem || 'Caixa Térmica Qualificada',
      companhiaAerea: (formData.companhiaAerea as CompanhiaAerea) || 'LATAM Cargo',
      numeroVoo: formData.numeroVoo?.trim() || 'LA-3712',
      aeroportoOrigem: formData.aeroportoOrigem || 'GRU - São Paulo/Guarulhos',
      aeroportoDestino: formData.aeroportoDestino || 'NAT - Aeroporto Aluízio Alves (Natal/RN)',
      dataEmbarque: formData.dataEmbarque || new Date().toISOString().split('T')[0],
      horarioPrevistoDecolagem: formData.horarioPrevistoDecolagem || '08:00',
      horarioPrevistoPouso: formData.horarioPrevistoPouso || '11:30',
      previsaoEntregaDestino: formData.previsaoEntregaDestino || '',
      status: (formData.status as StatusEmbarqueAereo) || 'No TECA Origem',
      temperaturaAtual: Number(formData.temperaturaAtual) || 4.5,
      temperaturaMinima: Number(formData.temperaturaMinima) || 2.0,
      temperaturaMaxima: Number(formData.temperaturaMaxima) || 8.0,
      dataloggerSerial: formData.dataloggerSerial || 'TT-8921',
      dataloggerModelo: formData.dataloggerModelo || 'TempTale Ultra',
      termogramaValidado: true,
      pesoBrutoKg: Number(formData.pesoBrutoKg) || 10,
      quantidadeVolumes: Number(formData.quantidadeVolumes) || 1,
      valorMercadoria: Number(formData.valorMercadoria) || 10000,
      valorFreteAereo: Number(formData.valorFreteAereo) || 1500,
      urgencia: formData.urgencia || 'Normal',
      numeroNotaFiscal: formData.numeroNotaFiscal || 'NF-e Pendente',
      responsavelLiberacaoTeca: formData.responsavelLiberacaoTeca || 'Equipe JMT',
      observacoes: formData.observacoes || '',
      historico: initialData?.historico || [
        {
          id: `hist-${Date.now()}`,
          dataHora: `${new Date().toISOString().split('T')[0]} 08:00`,
          local: formData.aeroportoOrigem?.split(' - ')[0] || 'TECA Origem',
          descricao: 'Embarque aéreo registrado no sistema.',
          temperaturaAferida: Number(formData.temperaturaAtual) || 4.5,
        },
      ],
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                {initialData ? 'Editar Embarque Aéreo' : 'Novo Embarque Farma Aéreo'}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Emissão e controle de AWB, voo e conformidade térmica RDC 430
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Section 1: AWB, Airline & Route */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Plane className="w-4 h-4 text-blue-600" />
              Identificação do Voo & AWB
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código AWB (Conhecimento) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: LA-8192034"
                  value={formData.codigoAWB || ''}
                  onChange={(e) => setFormData({ ...formData, codigoAWB: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Companhia Aérea *
                </label>
                <select
                  value={formData.companhiaAerea || 'LATAM Cargo'}
                  onChange={(e) => setFormData({ ...formData, companhiaAerea: e.target.value as CompanhiaAerea })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="LATAM Cargo">LATAM Cargo</option>
                  <option value="Gollog (GOL)">Gollog (GOL)</option>
                  <option value="Azul Cargo Express">Azul Cargo Express</option>
                  <option value="Voepass Cargo">Voepass Cargo</option>
                  <option value="Voo Fretado / Táxi Aéreo">Voo Fretado / Táxi Aéreo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número do Voo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: LA-3712 ou G3-1590"
                  value={formData.numeroVoo || ''}
                  onChange={(e) => setFormData({ ...formData, numeroVoo: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aeroporto de Origem *
                </label>
                <select
                  value={formData.aeroportoOrigem || 'GRU - São Paulo/Guarulhos'}
                  onChange={(e) => setFormData({ ...formData, aeroportoOrigem: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="GRU - São Paulo/Guarulhos">GRU - São Paulo/Guarulhos</option>
                  <option value="VCP - Campinas/Viracopos">VCP - Campinas/Viracopos</option>
                  <option value="CGH - São Paulo/Congonhas">CGH - São Paulo/Congonhas</option>
                  <option value="GIG - Rio de Janeiro/Galeão">GIG - Rio de Janeiro/Galeão</option>
                  <option value="BSB - Brasília/DF">BSB - Brasília/DF</option>
                  <option value="CNF - Belo Horizonte/Confins">CNF - Belo Horizonte/Confins</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aeroporto de Destino *
                </label>
                <select
                  value={formData.aeroportoDestino || 'NAT - Aeroporto Aluízio Alves (Natal/RN)'}
                  onChange={(e) => setFormData({ ...formData, aeroportoDestino: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="NAT - Aeroporto Aluízio Alves (Natal/RN)">NAT - Aeroporto Aluízio Alves (Natal/RN)</option>
                  <option value="REC - Recife/Guararapes (PE)">REC - Recife/Guararapes (PE)</option>
                  <option value="FOR - Fortaleza/Pinto Martins (CE)">FOR - Fortaleza/Pinto Martins (CE)</option>
                  <option value="JPA - João Pessoa/Castro Pinto (PB)">JPA - João Pessoa/Castro Pinto (PB)</option>
                  <option value="SSA - Salvador/Dep. Luís Eduardo (BA)">SSA - Salvador/Dep. Luís Eduardo (BA)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data do Voo</label>
                <input
                  type="date"
                  value={formData.dataEmbarque || ''}
                  onChange={(e) => setFormData({ ...formData, dataEmbarque: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Decolagem Prevista</label>
                <input
                  type="time"
                  value={formData.horarioPrevistoDecolagem || ''}
                  onChange={(e) => setFormData({ ...formData, horarioPrevistoDecolagem: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pouso Previsto</label>
                <input
                  type="time"
                  value={formData.horarioPrevistoPouso || ''}
                  onChange={(e) => setFormData({ ...formData, horarioPrevistoPouso: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Client & Destination */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Cliente, Remetente & Destinatário
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente Contratante *</label>
                <select
                  value={formData.clienteId || ''}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeFantasia || c.razaoSocial} ({c.codigoCliente})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Urgência / Prioridade</label>
                <select
                  value={formData.urgencia || 'Normal'}
                  onChange={(e) => setFormData({ ...formData, urgencia: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Normal">Normal (Programado)</option>
                  <option value="Urgente">Urgente (Mesmo dia / Prioridade)</option>
                  <option value="Plantão Emergencial / UTI 24h">Plantão Emergencial / UTI 24h</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remetente (Laboratório/Indústria)</label>
                <input
                  type="text"
                  placeholder="Ex: Eurofarma, EMS, Sanofi"
                  value={formData.remetenteNome || ''}
                  onChange={(e) => setFormData({ ...formData, remetenteNome: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destinatário (Hospital/Clínica)</label>
                <input
                  type="text"
                  placeholder="Ex: Hospital Walfredo Gurgel, Unimed"
                  value={formData.destinatarioNome || ''}
                  onChange={(e) => setFormData({ ...formData, destinatarioNome: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço de Entrega no Destino</label>
              <input
                type="text"
                placeholder="Ex: Av. Senador Salgado Filho, 1200 - Tirol, Natal/RN"
                value={formData.destinatarioEndereco || ''}
                onChange={(e) => setFormData({ ...formData, destinatarioEndereco: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Section 3: Cold Chain & Temperature */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-teal-600" />
              Controle de Temperatura & Cadeia Fria (RDC 430)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Faixa Térmica Exigida *</label>
                <select
                  value={formData.faixaTemperatura || 'Refrigerado (2°C a 8°C)'}
                  onChange={(e) => handleFaixaTempChange(e.target.value as FaixaTemperaturaAereo)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Refrigerado (2°C a 8°C)">Refrigerado (2°C a 8°C)</option>
                  <option value="Climatizado (15°C a 25°C)">Climatizado (15°C a 25°C)</option>
                  <option value="Gelo Seco (-70°C a -20°C)">Gelo Seco (-70°C a -20°C)</option>
                  <option value="Nitrogênio Líquido (-196°C)">Nitrogênio Líquido (-196°C)</option>
                  <option value="Ambiente Controlado">Ambiente Controlado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Embalagem Qualificada</label>
                <input
                  type="text"
                  placeholder="Ex: Caixa Térmica VIP c/ PCM 72h"
                  value={formData.tipoEmbalagem || ''}
                  onChange={(e) => setFormData({ ...formData, tipoEmbalagem: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temp Atual (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperaturaAtual ?? 4.5}
                  onChange={(e) => setFormData({ ...formData, temperaturaAtual: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Serial do Datalogger</label>
                <input
                  type="text"
                  placeholder="Ex: TT-ULTRA-99120"
                  value={formData.dataloggerSerial || ''}
                  onChange={(e) => setFormData({ ...formData, dataloggerSerial: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Operacional</label>
                <select
                  value={formData.status || 'No TECA Origem'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusEmbarqueAereo })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="No TECA Origem">No TECA Origem</option>
                  <option value="Em Voo / Trânsito">Em Voo / Trânsito</option>
                  <option value="Pousado / No TECA Destino">Pousado / No TECA Destino</option>
                  <option value="Liberado TECA / ANVISA">Liberado TECA / ANVISA</option>
                  <option value="Em Rota de Entrega">Em Rota de Entrega</option>
                  <option value="Entregue com Sucesso">Entregue com Sucesso</option>
                  <option value="Alerta Térmico">Alerta Térmico</option>
                  <option value="Alerta de Atraso">Alerta de Atraso</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Volumes, Weights & Values */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Box className="w-4 h-4 text-amber-600" />
              Volumes, Peso & Faturamento
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nota Fiscal (NF-e)</label>
                <input
                  type="text"
                  placeholder="Ex: NF-e 089.123"
                  value={formData.numeroNotaFiscal || ''}
                  onChange={(e) => setFormData({ ...formData, numeroNotaFiscal: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Volumes</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantidadeVolumes || 1}
                  onChange={(e) => setFormData({ ...formData, quantidadeVolumes: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peso Bruto (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.pesoBrutoKg || 10}
                  onChange={(e) => setFormData({ ...formData, pesoBrutoKg: parseFloat(e.target.value) || 10 })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Mercadoria (R$)</label>
                <input
                  type="number"
                  value={formData.valorMercadoria || 0}
                  onChange={(e) => setFormData({ ...formData, valorMercadoria: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {initialData ? 'Salvar Alterações' : 'Cadastrar Embarque Aéreo'}
          </button>
        </div>
      </div>
    </div>
  );
};
