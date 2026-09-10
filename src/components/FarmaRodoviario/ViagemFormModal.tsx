import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Thermometer,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  ViagemRodoviaria,
  StatusViagemRodoviaria,
  FaixaTemperaturaRodoviario,
  ModalidadeViagemRodoviaria,
  PontoParadaViagem,
  Cliente,
} from '../../types';

interface ViagemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (viagem: ViagemRodoviaria) => void;
  initialData?: ViagemRodoviaria | null;
  clientes: Cliente[];
}

export const ViagemFormModal: React.FC<ViagemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  clientes,
}) => {
  const buildPontoParadaPadrao = (): PontoParadaViagem => ({
    id: `ponto-${Date.now()}-1`,
    ordemEntrega: 1,
    clienteId: clientes[0]?.id || 'cli-001',
    clienteNome: clientes[0]?.nomeFantasia || 'Hospital Regional',
    destinatarioNome: 'Farmácia Central',
    endereco: 'Av. Salgado Filho, 1200 - Tirol',
    cidadeUF: 'Natal/RN',
    numeroNotaFiscal: 'NF-08812',
    quantidadeVolumes: 5,
    pesoKg: 45.0,
    valorMercadoria: 32000.0,
    status: 'Pendente',
  });

  const buildEmptyViagem = (): Partial<ViagemRodoviaria> => ({
    veiculoPlaca: '',
    veiculoTipo: 'Van Renault Master Refrigerada',
    motoristaNome: '',
    motoristaCpf: '',
    motoristaTelefone: '',
    modalidade: 'Distribuição Urbana / Last Mile',
    faixaTemperatura: 'Refrigerado (2°C a 8°C)',
    setpointTermostato: 4.0,
    temperaturaMinima: 2.0,
    temperaturaMaxima: 8.0,
    temperaturaAtualBau: 4.2,
    dataloggerSerial: 'DL-ROD-8821',
    numeroMdfe: '',
    dataSaida: new Date().toISOString().split('T')[0],
    horarioSaida: '06:30',
    previsaoChegadaDestino: `${new Date().toISOString().split('T')[0]} 17:00`,
    rotaOrigem: 'CD Central JMT - Parnamirim/RN',
    rotaDestino: 'Grande Natal & Região Metropolitana',
    status: 'Carregamento / Pré-Resfriamento',
    quantidadeNotasFiscais: 3,
    quantidadeTotalVolumes: 15,
    pesoTotalKg: 180.0,
    valorTotalMercadoria: 95000.0,
    checklistPartida: {
      sanitizadoBau: true,
      preResfriamentoConcluido: true,
      dataloggerAtivo: true,
      numeroLacre: 'LCR-9901',
      dataVerificacao: new Date().toISOString().split('T')[0],
      responsavelExpedicao: 'Expedição JMT Farma',
    },
    pontosParada: [buildPontoParadaPadrao()],
    historicoTemperatura: [],
  });

  const [formData, setFormData] = useState<Partial<ViagemRodoviaria>>(() => {
    if (initialData) return { ...initialData };
    return buildEmptyViagem();
  });

  const [pontos, setPontos] = useState<PontoParadaViagem[]>(
    initialData?.pontosParada || [buildPontoParadaPadrao()]
  );

  // Reajusta o formulário sempre que o modal é reaberto — o componente nunca é desmontado
  // (apenas o prop `isOpen` alterna), então sem isso os dados do último registro permaneciam.
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({ ...initialData });
      setPontos(initialData.pontosParada || [buildPontoParadaPadrao()]);
    } else {
      const empty = buildEmptyViagem();
      setFormData(empty);
      setPontos(empty.pontosParada || [buildPontoParadaPadrao()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleAddPonto = () => {
    const newOrder = pontos.length + 1;
    const firstClient = clientes[0];
    const newPonto: PontoParadaViagem = {
      id: `ponto-${Date.now()}-${newOrder}`,
      ordemEntrega: newOrder,
      clienteId: firstClient?.id || '',
      clienteNome: firstClient?.nomeFantasia || 'Cliente JMT',
      destinatarioNome: 'Farmácia / Almoxarifado',
      endereco: 'Rua Principal, 100',
      cidadeUF: 'Natal/RN',
      numeroNotaFiscal: `NF-${Math.floor(10000 + Math.random() * 90000)}`,
      quantidadeVolumes: 3,
      pesoKg: 20.0,
      valorMercadoria: 15000.0,
      status: 'Pendente',
    };
    setPontos([...pontos, newPonto]);
  };

  const handleRemovePonto = (id: string) => {
    const updated = pontos.filter((p) => p.id !== id).map((p, idx) => ({ ...p, ordemEntrega: idx + 1 }));
    setPontos(updated);
  };

  const handleUpdatePonto = (id: string, field: keyof PontoParadaViagem, value: any) => {
    const updated = pontos.map((p) => {
      if (p.id === id) {
        const item = { ...p, [field]: value };
        if (field === 'clienteId') {
          const cli = clientes.find((c) => c.id === value);
          if (cli) item.clienteNome = cli.nomeFantasia || cli.razaoSocial;
        }
        return item;
      }
      return p;
    });
    setPontos(updated);
  };

  const handleFaixaTempChange = (faixa: FaixaTemperaturaRodoviario) => {
    let min = 2;
    let max = 8;
    let setp = 4.0;
    if (faixa.includes('15°C')) {
      min = 15;
      max = 25;
      setp = 20.0;
    } else if (faixa.includes('Congelado')) {
      min = -25;
      max = -15;
      setp = -20.0;
    }
    setFormData((prev) => ({
      ...prev,
      faixaTemperatura: faixa,
      temperaturaMinima: min,
      temperaturaMaxima: max,
      setpointTermostato: setp,
      temperaturaAtualBau: setp + 0.2,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.veiculoPlaca || !formData.motoristaNome) return;

    const totalVols = pontos.reduce((acc, p) => acc + (p.quantidadeVolumes || 0), 0);
    const totalPeso = pontos.reduce((acc, p) => acc + (p.pesoKg || 0), 0);
    const totalVal = pontos.reduce((acc, p) => acc + (p.valorMercadoria || 0), 0);

    const payload: ViagemRodoviaria = {
      id: initialData?.id || `viag-rod-${Date.now()}`,
      veiculoPlaca: formData.veiculoPlaca.trim().toUpperCase(),
      veiculoTipo: formData.veiculoTipo || 'Van Renault Master Refrigerada',
      motoristaNome: formData.motoristaNome.trim(),
      motoristaCpf: formData.motoristaCpf || '000.000.000-00',
      motoristaTelefone: formData.motoristaTelefone || '(84) 99999-0000',
      modalidade: (formData.modalidade as ModalidadeViagemRodoviaria) || 'Distribuição Urbana / Last Mile',
      faixaTemperatura: (formData.faixaTemperatura as FaixaTemperaturaRodoviario) || 'Refrigerado (2°C a 8°C)',
      setpointTermostato: Number(formData.setpointTermostato) || 4.0,
      temperaturaMinima: Number(formData.temperaturaMinima) || 2.0,
      temperaturaMaxima: Number(formData.temperaturaMaxima) || 8.0,
      temperaturaAtualBau: Number(formData.temperaturaAtualBau) || 4.2,
      dataloggerSerial: formData.dataloggerSerial || 'DL-ROD-8821',
      numeroMdfe: formData.numeroMdfe?.trim() || `MDFE-${Date.now().toString().slice(-6)}`,
      dataSaida: formData.dataSaida || new Date().toISOString().split('T')[0],
      horarioSaida: formData.horarioSaida || '06:30',
      previsaoChegadaDestino: formData.previsaoChegadaDestino || '',
      rotaOrigem: formData.rotaOrigem || 'CD Central JMT',
      rotaDestino: formData.rotaDestino || 'Destino Farma',
      status: (formData.status as StatusViagemRodoviaria) || 'Carregamento / Pré-Resfriamento',
      quantidadeNotasFiscais: pontos.length,
      quantidadeTotalVolumes: totalVols || 1,
      pesoTotalKg: totalPeso || 10,
      valorTotalMercadoria: totalVal || 50000,
      checklistPartida: formData.checklistPartida || {
        sanitizadoBau: true,
        preResfriamentoConcluido: true,
        dataloggerAtivo: true,
        numeroLacre: 'LCR-9901',
        dataVerificacao: new Date().toISOString().split('T')[0],
        responsavelExpedicao: 'Expedição JMT Farma',
      },
      pontosParada: pontos,
      historicoTemperatura: initialData?.historicoTemperatura || [],
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">
                {initialData ? 'Editar Viagem Rodoviária' : 'Novo Romaneio / Viagem Rodoviária'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Controle de frotas, motoristas, telemetria e conformidade RDC 430
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Section 1: Vehicle & Driver */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              Veículo & Motorista
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: RNL-4J92"
                  value={formData.veiculoPlaca || ''}
                  onChange={(e) => setFormData({ ...formData, veiculoPlaca: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Veículo *
                </label>
                <select
                  value={formData.veiculoTipo || 'Van Renault Master Refrigerada'}
                  onChange={(e) => setFormData({ ...formData, veiculoTipo: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Van Renault Master Refrigerada">Van Renault Master Refrigerada (2°C-8°C)</option>
                  <option value="Caminhão VUC Climatizado">Caminhão VUC Climatizado (15°C-25°C)</option>
                  <option value="Caminhão 3/4 Frigorífico">Caminhão 3/4 Frigorífico</option>
                  <option value="Caminhão Toco Refrigerado">Caminhão Toco Refrigerado</option>
                  <option value="Fiorino / Utilitário Climatizado">Fiorino / Utilitário Climatizado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Motorista *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: José Carlos Oliveira"
                  value={formData.motoristaNome || ''}
                  onChange={(e) => setFormData({ ...formData, motoristaNome: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidade</label>
                <select
                  value={formData.modalidade || 'Distribuição Urbana / Last Mile'}
                  onChange={(e) => setFormData({ ...formData, modalidade: e.target.value as ModalidadeViagemRodoviaria })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Distribuição Urbana / Last Mile">Distribuição Urbana / Last Mile</option>
                  <option value="Linha Tronco / Transferência">Linha Tronco / Transferência</option>
                  <option value="Dedicado Exclusivo">Dedicado Exclusivo</option>
                  <option value="Coleta de Emergência">Coleta de Emergência</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">MDF-e</label>
                <input
                  type="text"
                  placeholder="Ex: MDF-e 001.992"
                  value={formData.numeroMdfe || ''}
                  onChange={(e) => setFormData({ ...formData, numeroMdfe: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status da Viagem</label>
                <select
                  value={formData.status || 'Carregamento / Pré-Resfriamento'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusViagemRodoviaria })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="Carregamento / Pré-Resfriamento">Carregamento / Pré-Resfriamento</option>
                  <option value="Em Rota / Trânsito">Em Rota / Trânsito</option>
                  <option value="Parada / Entrega em Andamento">Parada / Entrega em Andamento</option>
                  <option value="Viagem Concluída">Viagem Concluída</option>
                  <option value="Ocorrência Operacional">Ocorrência Operacional</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Temperature & Cold Chain */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-teal-600" />
              Faixa de Temperatura & Telemetria do Baú
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Faixa Térmica *</label>
                <select
                  value={formData.faixaTemperatura || 'Refrigerado (2°C a 8°C)'}
                  onChange={(e) => handleFaixaTempChange(e.target.value as FaixaTemperaturaRodoviario)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Refrigerado (2°C a 8°C)">Refrigerado (2°C a 8°C)</option>
                  <option value="Climatizado (15°C a 25°C)">Climatizado (15°C a 25°C)</option>
                  <option value="Congelado (-25°C a -15°C)">Congelado (-25°C a -15°C)</option>
                  <option value="Ambiente Monitorado">Ambiente Monitorado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Set-point Termostato (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.setpointTermostato ?? 4.0}
                  onChange={(e) => setFormData({ ...formData, setpointTermostato: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temp Atual do Baú (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperaturaAtualBau ?? 4.2}
                  onChange={(e) => setFormData({ ...formData, temperaturaAtualBau: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold text-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Delivery Points & Stops */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Pontos de Parada & Clientes no Romaneio ({pontos.length})
              </h3>
              <button
                type="button"
                onClick={handleAddPonto}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Parada
              </button>
            </div>

            <div className="space-y-3">
              {pontos.map((ponto, idx) => (
                <div key={ponto.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      Parada #{idx + 1}
                    </span>
                    {pontos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePonto(ponto.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Cliente</label>
                      <select
                        value={ponto.clienteId}
                        onChange={(e) => handleUpdatePonto(ponto.id, 'clienteId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nomeFantasia || c.razaoSocial}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Endereço / Cidade</label>
                      <input
                        type="text"
                        placeholder="Ex: Av. Salgado Filho, 1200 - Natal/RN"
                        value={ponto.endereco}
                        onChange={(e) => handleUpdatePonto(ponto.id, 'endereco', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">NF-e</label>
                      <input
                        type="text"
                        value={ponto.numeroNotaFiscal}
                        onChange={(e) => handleUpdatePonto(ponto.id, 'numeroNotaFiscal', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Volumes</label>
                      <input
                        type="number"
                        value={ponto.quantidadeVolumes}
                        onChange={(e) => handleUpdatePonto(ponto.id, 'quantidadeVolumes', parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Valor Carga (R$)</label>
                      <input
                        type="number"
                        value={ponto.valorMercadoria}
                        onChange={(e) => handleUpdatePonto(ponto.id, 'valorMercadoria', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
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
            className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {initialData ? 'Salvar Alterações' : 'Cadastrar Viagem Rodoviária'}
          </button>
        </div>
      </div>
    </div>
  );
};
