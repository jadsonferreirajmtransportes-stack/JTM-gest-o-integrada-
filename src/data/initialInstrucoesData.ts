import { InstrucaoTrabalho } from '../types';

// Duas instruções de exemplo (uma por operação) já "Vigente", no formato de formulário por
// etapas, para servir de referência de preenchimento para as próximas instruções.
export const INITIAL_INSTRUCOES_TRABALHO: InstrucaoTrabalho[] = [
  {
    id: 'it-aer-1',
    codigo: 'IT-AER-001',
    titulo: 'Coleta e Conferência de AWB — Farma Aéreo',
    categoria: 'Farma Aéreo',
    status: 'Vigente',
    versao: 1,
    responsavel: 'Lucas Gabriel Mendonça',
    aprovadoPor: 'Jadson Ferreira',
    dataVigencia: '2026-08-01',
    autor: 'Lucas Gabriel Mendonça',
    objetivo:
      'Padronizar a coleta e a conferência do AWB antes do embarque, evitando divergências de peso, temperatura e documentação na TECA.',
    aplicacaoAbrangencia:
      'Aplica-se à equipe de coleta do Farma Aéreo, do momento da coleta no remetente até a entrega na TECA do aeroporto.',
    definicoes: 'AWB: Air Waybill, conhecimento de transporte aéreo. TECA: Terminal de Cargas Aeroportuário.',
    responsabilidades: [
      { id: 'resp-aer-1', responsavel: 'Motorista/Coletador', responsabilidade: 'Conferir carga e temperatura no ato da coleta' },
      { id: 'resp-aer-2', responsavel: 'Supervisor Farma Aéreo', responsabilidade: 'Validar AWB e liberar entrega na TECA' },
    ],
    sipoc: [
      {
        id: 'sipoc-aer-1',
        fornecedores: 'Laboratório/remetente',
        entradas: 'AWB, Nota Fiscal, CT-e',
        processo: 'Coletar, conferir e entregar na TECA',
        saidas: 'Carga embarcada e registrada',
        clientes: 'Cliente farmacêutico, TECA',
      },
    ],
    fluxoProcesso: [
      { id: 'fluxo-aer-1', ordem: 1, etapa: 'Conferir AWB, Nota Fiscal e CT-e', responsavel: 'Motorista', entrada: 'Documentos do remetente', saida: 'Conferência validada', sistemaDocumento: 'AWB/NF/CT-e', observacao: '' },
      { id: 'fluxo-aer-2', ordem: 2, etapa: 'Verificar faixa de temperatura exigida', responsavel: 'Motorista', entrada: 'Especificação do cliente', saida: 'Veículo pré-climatizado', sistemaDocumento: '', observacao: '' },
      { id: 'fluxo-aer-3', ordem: 3, etapa: 'Registrar peso e volumes coletados', responsavel: 'Motorista', entrada: 'Carga coletada', saida: 'Peso/volumes registrados', sistemaDocumento: 'Sistema JMT', observacao: 'Confrontar com o informado na NF' },
      { id: 'fluxo-aer-4', ordem: 4, etapa: 'Entregar na TECA e registrar embarque', responsavel: 'Supervisor', entrada: 'Carga conferida', saida: 'Embarque registrado', sistemaDocumento: 'Sistema JMT', observacao: '' },
    ],
    criteriosDecisao: 'Carga com avaria aparente ou fora da faixa de temperatura não é embarcada sem aprovação do supervisor.',
    registrosEvidencias: 'Fotos da embalagem/etiquetagem, registro de peso e volumes no sistema JMT.',
    indicadores: [
      { id: 'ind-aer-1', indicador: '% de AWBs sem divergência', formula: 'AWBs sem divergência / total de AWBs', meta: '≥ 98%', frequencia: 'Semanal', responsavel: 'Supervisor Farma Aéreo' },
    ],
    riscosControles: [
      { id: 'risco-aer-1', risco: 'Ruptura de cadeia fria na coleta', controle: 'Pré-climatização obrigatória do veículo antes da coleta' },
    ],
    planoAcao5W2H: [],
    historicoRevisoes: [
      { id: 'rev-aer-1', revisao: '1', data: '2026-08-01', alteradoPor: 'Lucas Gabriel Mendonça', descricao: 'Emissão inicial do documento.' },
    ],
    criadoEm: '2026-08-01T09:00:00.000Z',
    atualizadoEm: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'it-rod-1',
    codigo: 'IT-ROD-001',
    titulo: 'Checklist de Pré-Viagem (Cadeia Fria) — Farma Rodoviário',
    categoria: 'Farma Rodoviário',
    status: 'Vigente',
    versao: 1,
    responsavel: 'Carlos Eduardo Lima',
    aprovadoPor: 'Jadson Ferreira',
    dataVigencia: '2026-08-05',
    autor: 'Carlos Eduardo Lima',
    objetivo:
      'Garantir que o baú refrigerado, a documentação e o motorista estejam aptos antes da saída, evitando ocorrências térmicas em rota.',
    aplicacaoAbrangencia: 'Aplica-se a toda viagem rodoviária com carga sob cadeia fria, do carregamento até a primeira parada.',
    definicoes: 'MDF-e: Manifesto Eletrônico de Documentos Fiscais.',
    responsabilidades: [
      { id: 'resp-rod-1', responsavel: 'Motorista', responsabilidade: 'Conferir baú, temperatura e documentação antes da saída' },
      { id: 'resp-rod-2', responsavel: 'Supervisor Farma Rodoviário', responsabilidade: 'Validar sequência de entregas e liberar a viagem' },
    ],
    sipoc: [
      {
        id: 'sipoc-rod-1',
        fornecedores: 'Base/pátio de carregamento',
        entradas: 'MDF-e, CT-e, Notas Fiscais',
        processo: 'Climatizar, conferir e liberar a viagem',
        saidas: 'Viagem liberada com cadeia fria validada',
        clientes: 'Clientes da rota, supervisão',
      },
    ],
    fluxoProcesso: [
      { id: 'fluxo-rod-1', ordem: 1, etapa: 'Pré-climatizar o baú na faixa exigida', responsavel: 'Motorista', entrada: 'Especificação da carga', saida: 'Baú climatizado', sistemaDocumento: '', observacao: 'Com 30 min de antecedência' },
      { id: 'fluxo-rod-2', ordem: 2, etapa: 'Conferir termógrafo/registrador de temperatura', responsavel: 'Motorista', entrada: 'Equipamento do baú', saida: 'Registrador funcionando', sistemaDocumento: '', observacao: '' },
      { id: 'fluxo-rod-3', ordem: 3, etapa: 'Conferir MDF-e, CT-e e Notas Fiscais', responsavel: 'Motorista', entrada: 'Documentos da rota', saida: 'Documentação conferida', sistemaDocumento: 'MDF-e/CT-e/NF', observacao: '' },
      { id: 'fluxo-rod-4', ordem: 4, etapa: 'Validar sequência de entregas e janelas de descarga', responsavel: 'Supervisor', entrada: 'Roteiro da viagem', saida: 'Viagem liberada', sistemaDocumento: 'Sistema JMT', observacao: '' },
    ],
    criteriosDecisao: 'Viagem não é liberada se o registrador de temperatura estiver inoperante.',
    registrosEvidencias: 'Registro de temperatura por parada, canhoto de conferência assinado no destino.',
    indicadores: [
      { id: 'ind-rod-1', indicador: '% de viagens sem desvio de temperatura', formula: 'Viagens conformes / total de viagens', meta: '≥ 99%', frequencia: 'Mensal', responsavel: 'Supervisor Farma Rodoviário' },
    ],
    riscosControles: [
      { id: 'risco-rod-1', risco: 'Desvio de temperatura em rota', controle: 'Checklist de pré-viagem obrigatório e registrador monitorado' },
    ],
    planoAcao5W2H: [],
    historicoRevisoes: [
      { id: 'rev-rod-1', revisao: '1', data: '2026-08-05', alteradoPor: 'Carlos Eduardo Lima', descricao: 'Emissão inicial do documento.' },
    ],
    criadoEm: '2026-08-05T09:00:00.000Z',
    atualizadoEm: '2026-08-05T09:00:00.000Z',
  },
];
