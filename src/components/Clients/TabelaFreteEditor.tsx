import React from 'react';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { TabelaPrecoFrete, FaixaTarifaCidade, CustoExtraTarifa } from '../../types';

interface TabelaFreteEditorProps {
  titulo: string;
  value: TabelaPrecoFrete;
  onChange: (value: TabelaPrecoFrete) => void;
}

/** Editor completo de uma tabela de frete (modelo de precificação, tarifa por cidade, custos
 *  extras, condições de pagamento) — extraído da aba "Contrato & Tabela de Fretes" do cadastro
 *  de cliente pra poder ser reaproveitado também na tabela específica do Rodoviário (ver
 *  Cliente.tabelaFreteRodoviario, hoje só usada pela LUFT). Totalmente controlado: não guarda
 *  nada internamente, só lê `value` e devolve o objeto inteiro atualizado em `onChange`. */
export const TabelaFreteEditor: React.FC<TabelaFreteEditorProps> = ({ titulo, value, onChange }) => {
  const modeloPrecificacao = value.modeloPrecificacao || 'tarifa_base';
  const tarifasPorCidade = value.tarifasPorCidade || [];
  const custosExtras = value.custosExtras || [];

  const handleAddTarifaCidade = () => {
    onChange({
      ...value,
      tarifasPorCidade: [
        ...tarifasPorCidade,
        {
          id: `tar-${Date.now()}`,
          cidade: '',
          raio: 'CAPITAL E REGIÃO METROPOLITANA',
          valorAte10Kg: 0,
          valorKgExcedente: 0,
          distanciaKm: undefined,
        },
      ],
    });
  };

  const handleUpdateTarifaCidade = (index: number, field: keyof FaixaTarifaCidade, campoValor: any) => {
    const updated = [...tarifasPorCidade];
    updated[index] = { ...updated[index], [field]: campoValor };
    onChange({ ...value, tarifasPorCidade: updated });
  };

  const handleRemoveTarifaCidade = (index: number) => {
    onChange({ ...value, tarifasPorCidade: tarifasPorCidade.filter((_, idx) => idx !== index) });
  };

  const handleAddCustoExtra = () => {
    onChange({
      ...value,
      custosExtras: [
        ...custosExtras,
        {
          id: `cex-${Date.now()}`,
          categoria: '',
          grupoDestinatario: '',
          itemDescricao: '',
          tipoCobranca: 'Valor fechado',
          valor: 0,
        },
      ],
    });
  };

  const handleUpdateCustoExtra = (index: number, field: keyof CustoExtraTarifa, campoValor: any) => {
    const updated = [...custosExtras];
    updated[index] = { ...updated[index], [field]: campoValor };
    onChange({ ...value, custosExtras: updated });
  };

  const handleRemoveCustoExtra = (index: number) => {
    onChange({ ...value, custosExtras: custosExtras.filter((_, idx) => idx !== index) });
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
      <h4 className="text-xs font-bold text-[#C48229] uppercase tracking-wider flex items-center gap-2">
        <DollarSign className="w-4 h-4" />
        {titulo}
      </h4>

      {/* Toggle: Modelo de Precificação */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Modelo de Precificação *</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, modeloPrecificacao: 'tarifa_base', tipoCobranca: 'Tabela por Faixa de Peso' })}
            className={`text-left p-2.5 rounded-lg border transition-colors ${
              modeloPrecificacao === 'tarifa_base'
                ? 'bg-amber-50 border-[#C48229] text-amber-900'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className="text-xs font-bold block">Tarifa Base</span>
            <span className="text-[10px] text-slate-400">Taxa de Entrega + Excedente</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onChange({ ...value, modeloPrecificacao: 'ad_valorem', tipoCobranca: '% sobre Nota Fiscal (Ad Valorem)' })
            }
            className={`text-left p-2.5 rounded-lg border transition-colors ${
              modeloPrecificacao === 'ad_valorem'
                ? 'bg-amber-50 border-[#C48229] text-amber-900'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className="text-xs font-bold block">% Ad Valorem</span>
            <span className="text-[10px] text-slate-400">Sobre a NF do Serviço</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...value, modeloPrecificacao: 'outro' })}
            className={`text-left p-2.5 rounded-lg border transition-colors ${
              modeloPrecificacao === 'outro'
                ? 'bg-amber-50 border-[#C48229] text-amber-900'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className="text-xs font-bold block">Outro Modelo</span>
            <span className="text-[10px] text-slate-400">Km rodado, diária, misto...</span>
          </button>
        </div>
      </div>

      {/* Campos: Tarifa Base (Taxa de Entrega + Excedente) */}
      {modeloPrecificacao === 'tarifa_base' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Taxa de Entrega (R$)</label>
            <input
              type="number"
              step="0.01"
              value={value.valorBase}
              onChange={(e) => onChange({ ...value, valorBase: Number(e.target.value) })}
              placeholder="0.00"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#C48229]"
            />
            <p className="text-[10px] text-slate-500 mt-1">Valor cobrado até o peso-base da faixa (ex: até 10kg).</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Valor por Kg Excedente (R$)</label>
            <input
              type="number"
              step="0.01"
              value={value.valorKgExcedente || 0}
              onChange={(e) => onChange({ ...value, valorKgExcedente: Number(e.target.value) })}
              placeholder="0.00"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#C48229]"
            />
            <p className="text-[10px] text-slate-500 mt-1">Cobrado por kg que ultrapassar o peso-base.</p>
          </div>
        </div>
      )}

      {/* Tabela Detalhada por Cidade / Praça (opcional, só na Tarifa Base) */}
      {modeloPrecificacao === 'tarifa_base' && (
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div>
              <span className="block text-xs font-semibold text-slate-600">
                Tabela Detalhada por Cidade / Praça <span className="text-slate-500 font-normal">(opcional)</span>
              </span>
              <p className="text-[10px] text-slate-500">
                Use quando a taxa varia por cidade/raio — mesmo formato do tarifário real (Cidade, Raio, Até 10kg, Kg Excedente, Km).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddTarifaCidade}
              className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Cidade</span>
            </button>
          </div>

          {tarifasPorCidade.length > 0 && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {tarifasPorCidade.map((tarifa, idx) => (
                <div key={tarifa.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={tarifa.cidade}
                      onChange={(e) => handleUpdateTarifaCidade(idx, 'cidade', e.target.value)}
                      placeholder="Cidade"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                    />
                    <input
                      type="text"
                      value={tarifa.raio}
                      onChange={(e) => handleUpdateTarifaCidade(idx, 'raio', e.target.value)}
                      placeholder="Raio / Faixa (Ex: Capital, Até 300km)"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 items-center">
                    <input
                      type="number"
                      step="0.01"
                      value={tarifa.valorAte10Kg}
                      onChange={(e) => handleUpdateTarifaCidade(idx, 'valorAte10Kg', Number(e.target.value))}
                      placeholder="Até 10kg (R$)"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={tarifa.valorKgExcedente}
                      onChange={(e) => handleUpdateTarifaCidade(idx, 'valorKgExcedente', Number(e.target.value))}
                      placeholder="Kg exc. (R$)"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                    />
                    <input
                      type="number"
                      value={tarifa.distanciaKm ?? ''}
                      onChange={(e) =>
                        handleUpdateTarifaCidade(idx, 'distanciaKm', e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="Km"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTarifaCidade(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition-colors justify-self-end"
                      title="Remover Cidade"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campo: % Ad Valorem sobre a NF do Serviço */}
      {modeloPrecificacao === 'ad_valorem' && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">% Ad Valorem sobre a NF do Serviço</label>
          <input
            type="number"
            step="0.01"
            value={value.percentualAdValoremNF || 0}
            onChange={(e) => onChange({ ...value, percentualAdValoremNF: Number(e.target.value) })}
            placeholder="0.30"
            className="w-full sm:w-1/2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#C48229]"
          />
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            Percentual cobrado sobre o valor declarado na Nota Fiscal do serviço/mercadoria transportada.
          </p>
        </div>
      )}

      {/* Campos: Outro Modelo (fallback avançado) */}
      {modeloPrecificacao === 'outro' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Modelo / Tipo de Cobrança</label>
            <select
              value={value.tipoCobranca}
              onChange={(e) => onChange({ ...value, tipoCobranca: e.target.value as TabelaPrecoFrete['tipoCobranca'] })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#C48229]"
            >
              <option value="Valor por Ponto/Entrega">Valor por Ponto / Entrega</option>
              <option value="Valor por Km Rodado">Valor por Km Rodado</option>
              <option value="Diária por Veículo Dedicado">Diária por Veículo Dedicado</option>
              <option value="Fracionado + Taxa Fixa">Fracionado + Taxa Fixa</option>
              <option value="Mista">Mista</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Base / Tarifa (R$)</label>
            <input
              type="number"
              step="0.01"
              value={value.valorBase}
              onChange={(e) => onChange({ ...value, valorBase: Number(e.target.value) })}
              placeholder="0.00"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#C48229]"
            />
          </div>
        </div>
      )}

      {/* Custos Extras / Encargos Avulsos (opcional, qualquer modelo) */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div>
            <span className="block text-xs font-semibold text-slate-600">
              Custos Extras / Encargos Avulsos <span className="text-slate-500 font-normal">(opcional)</span>
            </span>
            <p className="text-[10px] text-slate-500">
              TDE, dedicado, embarque, entrega rastreada etc. — mesmo formato do tarifário real (Categoria, Grupo/Destinatário, Item/Descrição, Tipo de Cobrança, Valor).
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddCustoExtra}
            className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Encargo</span>
          </button>
        </div>

        {custosExtras.length > 0 && (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {custosExtras.map((custo, idx) => (
              <div key={custo.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={custo.categoria}
                    onChange={(e) => handleUpdateCustoExtra(idx, 'categoria', e.target.value)}
                    placeholder="Categoria (Ex: TDE / VEÍCULO)"
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                  />
                  <input
                    type="text"
                    value={custo.grupoDestinatario || ''}
                    onChange={(e) => handleUpdateCustoExtra(idx, 'grupoDestinatario', e.target.value)}
                    placeholder="Grupo / Destinatário"
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1.5 items-center">
                  <input
                    type="text"
                    value={custo.itemDescricao || ''}
                    onChange={(e) => handleUpdateCustoExtra(idx, 'itemDescricao', e.target.value)}
                    placeholder="Item / Descrição"
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                  />
                  <select
                    value={custo.tipoCobranca}
                    onChange={(e) => handleUpdateCustoExtra(idx, 'tipoCobranca', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                  >
                    <option value="Valor fechado">Valor fechado</option>
                    <option value="Valor/KM">Valor/KM</option>
                    <option value="Serviço avulso">Serviço avulso</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={custo.valor}
                    onChange={(e) => handleUpdateCustoExtra(idx, 'valor', Number(e.target.value))}
                    placeholder="Valor (R$)"
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustoExtra(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition-colors justify-self-end"
                    title="Remover Encargo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Frete Mínimo (R$)</label>
          <input
            type="number"
            step="0.01"
            value={value.freteMinimo || 0}
            onChange={(e) => onChange({ ...value, freteMinimo: Number(e.target.value) })}
            placeholder="0.00"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#C48229]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Taxa de Descarga / Ajudante CCT (R$)</label>
          <input
            type="number"
            step="0.01"
            value={value.taxaDescargaAjudante || 0}
            onChange={(e) => onChange({ ...value, taxaDescargaAjudante: Number(e.target.value) })}
            placeholder="0.00"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#C48229]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">% GRIS & Pedágio</label>
          <input
            type="number"
            step="0.01"
            value={value.percentualGrisPedagio || 0}
            onChange={(e) => onChange({ ...value, percentualGrisPedagio: Number(e.target.value) })}
            placeholder="0.8"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#C48229]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Condição de Pagamento</label>
          <input
            type="text"
            value={value.condicaoPagamento}
            onChange={(e) => onChange({ ...value, condicaoPagamento: e.target.value })}
            placeholder="Ex: Faturamento Quinzenal (15 dias)"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#C48229]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Dia de Fechamento da Fatura</label>
          <input
            type="number"
            min={1}
            max={31}
            value={value.diaFechamento || 15}
            onChange={(e) => onChange({ ...value, diaFechamento: Number(e.target.value) })}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#C48229]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Regras Especiais / Observações de Tarifa</label>
        <textarea
          rows={2}
          value={value.observacoesTarifa || ''}
          onChange={(e) => onChange({ ...value, observacoesTarifa: e.target.value })}
          placeholder="Ex: Adicional de R$ 14,00 por volume termolábil com datalogger calibrado."
          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#C48229]"
        />
      </div>
    </div>
  );
};

export const TABELA_FRETE_PADRAO: TabelaPrecoFrete = {
  tipoCobranca: 'Tabela por Faixa de Peso',
  modeloPrecificacao: 'tarifa_base',
  valorBase: 0,
  valorKgExcedente: 0,
  tarifasPorCidade: [],
  custosExtras: [],
  freteMinimo: 0,
  taxaDescargaAjudante: 0,
  percentualGrisPedagio: 0.8,
  percentualAdValoremNF: 0,
  condicaoPagamento: 'Faturamento Quinzenal (15 dias)',
  diaFechamento: 15,
  observacoesTarifa: '',
};
