// Dados Oficiais da CONVENÇÃO COLETIVA DE TRABALHO 2026/2028 (SETCERN x SINTROCERN)
// Número de Registro no MTE: RN000245/2026 | Data de Registro: 25/06/2026
// Vigência: 01/05/2026 a 30/04/2028 | Data-base: 01/05 | Reajuste Geral: 5,5%

export interface CCTPisoSalarial {
  funcao: string;
  salarioBase: number;
  cbo?: string;
  setor: string;
  descricao?: string;
  exigeCnh?: boolean;
  categoriaCnh?: string;
  adicionalPadrao?: string;
}

export const CCT_METADATA = {
  registroMte: 'RN000245/2026',
  dataRegistroMte: '25/06/2026',
  solicitacao: 'MR035883/2026',
  processo: '47979.291595/2026-56',
  vigenciaInicio: '2026-05-01',
  vigenciaFim: '2028-04-30',
  dataBase: '01 de Maio',
  indiceReajuste: 0.055, // 5,5%
  sindicatoPatronal: 'SETCERN - Sindicato das Empresas de Transportes de Cargas e Logística do RN (CNPJ: 08.452.393/0001-86)',
  sindicatoLaboral: 'SINTROCERN - Sindicato dos Trabalhadores em Transportes Rodoviários de Cargas no RN (CNPJ: 24.518.045/0001-10)',
  abrangencia: 'Transporte Rodoviário de Cargas e Logística - Estado do Rio Grande do Norte (RN)',
  
  // Valores Econômicos Obrigatórios CCT 2026/2028
  valeAlimentacaoDia: 32.00, // Cláusula 15ª - R$ 32,00 por dia trabalhado
  subsidioPlanoSaudeMes: 189.50, // Cláusula 17ª - R$ 189,50 por trabalhador ativo (Plano Referência ANS Enfermaria)
  auxilioCuidadoPessoalMes: 47.90, // Cláusula 19ª - R$ 47,90 por trabalhador ativo (Gestora Bem Mais Benefícios)
  
  // Diárias de Viagem (Cláusula 14ª)
  diariaComPernoite: 107.00,
  diariaSemPernoite: 55.00,
  diariaAlmoco80km: 40.00,
  
  // Benefícios Assistenciais Cuidado Pessoal (Cláusula 19ª)
  planoMedicamentosCredito: 60.00, // R$ 60,00 a R$ 100,00 em medicamentos genéricos em 15 classes
  assistenciaFuneralMax: 3300.00,
  cestaBasicaMorteMeses: 6,
  cestaBasicaMorteValor: 150.00,
  assistenciaNatalidade: 600.00,
  assistenciaNatalidadeGemeosExtra: 300.00,
  
  // Penalidades e Multas (Cláusula 57ª)
  multaDescumprimentoCCT: 1316.00, // R$ 1.316,00 por trabalhador atingido
  prazoSaneamentoNotificacaoDias: 15,
  
  // Contribuições Sindicais (Cláusula 47ª, 48ª, 49ª, 52ª)
  mensalidadeSindicalPercentual: 0.02, // 2% do salário base para associados
  taxaCusteioDiasTrabalho: 1, // 1 dia de trabalho
  prazoOposicaoDias: 10, // 10 dias corridos pessoalmente no sindicato laboral
};

export const CCT_PISOS_SALARIAIS: CCTPisoSalarial[] = [
  {
    funcao: 'Auxiliar de Serviços Gerais',
    salarioBase: 1728.00,
    cbo: '5143-20',
    setor: 'Serviços Gerais / Limpeza',
    descricao: 'Limpeza e conservação predial de armazéns, garagens e dependências operacionais.',
  },
  {
    funcao: 'Ajudante de Cargas e Descargas em Geral / Entregador',
    salarioBase: 1736.00,
    cbo: '7832-15',
    setor: 'Operacional / Carga e Descarga',
    descricao: 'Movimentação manual e paletizada de mercadorias, carga e descarga de veículos rodoviários.',
  },
  {
    funcao: 'Auxiliar Administrativos',
    salarioBase: 1909.00,
    cbo: '4110-10',
    setor: 'Administrativo / DP',
    descricao: 'Rotinas administrativas, atendimento, suporte a departamento pessoal e faturamento.',
  },
  {
    funcao: 'Auxiliar de Escritório',
    salarioBase: 1909.00,
    cbo: '4110-05',
    setor: 'Administrativo',
    descricao: 'Apoio em documentação fiscal, arquivamento de manifestos e cadastros.',
  },
  {
    funcao: 'Recepcionista',
    salarioBase: 1909.00,
    cbo: '4221-05',
    setor: 'Administrativo / Recepção',
    descricao: 'Atendimento presencial e telefônico, recepção de motoristas, fornecedores e visitantes.',
  },
  {
    funcao: 'Conferente',
    salarioBase: 2051.00,
    cbo: '4141-05',
    setor: 'Armazenagem / Expedição',
    descricao: 'Conferência quantitativa e qualitativa de notas fiscais, volumes, datas de validade e lacres.',
  },
  {
    funcao: 'Motorista de Carros Leves',
    salarioBase: 2078.00,
    cbo: '7823-05',
    setor: 'Transportes',
    descricao: 'Condução de veículos leves (furgões, vans, utilitários) para entregas urbanas expressas.',
    exigeCnh: true,
    categoriaCnh: 'B',
  },
  {
    funcao: 'Motorista de 3/4, Toco, Truck e Caçamba',
    salarioBase: 2478.00,
    cbo: '7825-10',
    setor: 'Transportes',
    descricao: 'Condução de caminhões rígidos médios e pesados (3/4, Toco, Truck e Caçamba).',
    exigeCnh: true,
    categoriaCnh: 'C / D',
  },
  {
    funcao: 'Operador de Empilhadeiras',
    salarioBase: 2478.00,
    cbo: '7822-20',
    setor: 'Armazenagem / Pátio',
    descricao: 'Operação de empilhadeiras elétricas e a combustão para verticalização de porta-paletes.',
  },
  {
    funcao: 'Motorista de Betoneira',
    salarioBase: 2751.00,
    cbo: '7825-15',
    setor: 'Transportes Especiais',
    descricao: 'Condução e operação de caminhão betoneira para transporte de concreto.',
    exigeCnh: true,
    categoriaCnh: 'D / E',
    adicionalPadrao: 'Periculosidade 30% (Cláusula 13ª)',
  },
  {
    funcao: 'Motorista de Carreta',
    salarioBase: 2794.00,
    cbo: '7825-10',
    setor: 'Transportes Rodoviários',
    descricao: 'Condução de veículos articulados tipo cavalo mecânico e semirreboque (carreta aberta/baú).',
    exigeCnh: true,
    categoriaCnh: 'E',
  },
  {
    funcao: 'Motorista de Carreta Cebolão (Transp. Cimento a Granel)',
    salarioBase: 2794.00,
    cbo: '7825-10',
    setor: 'Transportes Granel',
    descricao: 'Condução de carreta silo cebolão para transporte pneumático de cimento a granel.',
    exigeCnh: true,
    categoriaCnh: 'E',
    adicionalPadrao: 'Insalubridade 15% sobre salário base (Cláusula 12ª, §2º)',
  },
  {
    funcao: 'Motorista de Bitrem',
    salarioBase: 3054.00,
    cbo: '7825-10',
    setor: 'Transportes Pesados',
    descricao: 'Condução de combinações de veículos de carga (CVC / Bitrem / Rodotrem).',
    exigeCnh: true,
    categoriaCnh: 'E',
  },
  {
    funcao: 'Motorista de Bitrem Cebolão (Transp. Cimento a Granel)',
    salarioBase: 3054.00,
    cbo: '7825-10',
    setor: 'Transportes Granel',
    descricao: 'Condução de bitrem equipado com silo cebolão pressurizado.',
    exigeCnh: true,
    categoriaCnh: 'E',
    adicionalPadrao: 'Insalubridade 15% sobre salário base (Cláusula 12ª, §2º)',
  },
  {
    funcao: 'Operador de Guindaste 30T',
    salarioBase: 3255.00,
    cbo: '7821-10',
    setor: 'Içamento e Movimentação',
    descricao: 'Operação de guindaste telescópico móvel rodoviário de até 30 toneladas.',
    exigeCnh: true,
    categoriaCnh: 'D / E',
    adicionalPadrao: 'Periculosidade 30% (Cláusula 13ª)',
  },
  {
    funcao: 'Motorista Bombista',
    salarioBase: 3393.00,
    cbo: '7825-15',
    setor: 'Transportes Especiais',
    descricao: 'Condução e bombeamento em caminhão bomba de concreto.',
    exigeCnh: true,
    categoriaCnh: 'D / E',
    adicionalPadrao: 'Periculosidade 30% (Cláusula 13ª)',
  },
  {
    funcao: 'Operador de Guindaste 50T',
    salarioBase: 3516.00,
    cbo: '7821-10',
    setor: 'Içamento e Movimentação',
    descricao: 'Operação de guindaste telescópico móvel rodoviário de até 50 toneladas.',
    exigeCnh: true,
    categoriaCnh: 'D / E',
    adicionalPadrao: 'Periculosidade 30% (Cláusula 13ª)',
  },
  {
    funcao: 'Operador de Guindaste 80T',
    salarioBase: 3774.00,
    cbo: '7821-10',
    setor: 'Içamento e Movimentação',
    descricao: 'Operação de guindaste pesado móvel rodoviário de até 80 toneladas.',
    exigeCnh: true,
    categoriaCnh: 'D / E',
    adicionalPadrao: 'Periculosidade 30% (Cláusula 13ª)',
  },
];

// Principais Cláusulas Normativas para Consulta do DP
export const CCT_CLAUSULAS_RESUMO = [
  {
    numero: '3ª e 4ª',
    titulo: 'Pisos Salariais & Reajuste Geral de 5,5%',
    resumo: 'Reajuste salarial de 5,5% sobre os salários vigentes em abril/2026. Quando o salário mínimo equiparar ou ultrapassar o piso, ASG, Ajudante e Entregador recebem acréscimo de +5% sobre o piso.',
    categoria: 'Salários',
  },
  {
    numero: '5ª',
    titulo: 'Prazo de Pagamento dos Salários',
    resumo: 'Pagamento até o 5º dia útil. Em caso de atraso superior a 5 dias após o vencimento, multa de 10% do valor devido ao empregado.',
    categoria: 'Salários',
  },
  {
    numero: '9ª',
    titulo: 'Dia do Motorista (25 de Julho)',
    resumo: 'Dia 25 de Julho é considerado feriado para todos os rodoviários. Trabalho nesta data assegura pagamento em dobro do salário correspondente ao dia ou concessão de outro dia de folga.',
    categoria: 'Jornada',
  },
  {
    numero: '10ª e 33ª',
    titulo: 'Jornada, Horas Extras e Interjornada',
    resumo: 'Jornada semanal de 44h. Empresas filiadas ao SETCERN podem prorrogar até 4 horas extras diárias (Art. 235-C CLT). Respeito obrigatório ao intervalo de interjornada de 11 horas consecutivas (Art. 66 CLT). Domingos e feriados trabalhados com 100% de acréscimo.',
    categoria: 'Jornada',
  },
  {
    numero: '12ª',
    titulo: 'Adicional de Insalubridade & Pausa Térmica',
    resumo: 'Trabalho em câmaras frigoríficas: adicional de 20% sobre o salário mínimo (NR 15 Anexo 9) e intervalo térmico de 20 minutos de repouso a cada 1h40 de trabalho contínuo (Art. 253 CLT). Motoristas de cimento cebolão: adicional de 15% sobre o salário-base.',
    categoria: 'Adicionais',
  },
  {
    numero: '13ª',
    titulo: 'Adicional de Periculosidade (30%)',
    resumo: 'Adicional de 30% sobre o salário base para transporte de inflamáveis em carro-tanque, botijões de gás GLP, produtos químicos (acetileno, oxigênio), caminhões munck, betoneira, bombistas, sondinhas, linhas vivas e guindastes.',
    categoria: 'Adicionais',
  },
  {
    numero: '14ª',
    titulo: 'Diárias de Viagem (Ajuda de Custo)',
    resumo: 'Diária com pernoite: R$ 107,00 (intermunicipais/interestaduais); Diária sem pernoite: R$ 55,00; Diária de almoço (até 80km voltando na jornada): R$ 40,00. Possuem natureza indenizatória e não integram salário.',
    categoria: 'Benefícios',
  },
  {
    numero: '15ª',
    titulo: 'Vale Alimentação / Refeição (R$ 32,00/dia)',
    resumo: 'R$ 32,00 por dia trabalhado para administrativos e operacionais internos. Desconto em folha: R$ 0,01 para filiados ao SINTROCERN ou até 20% para não filiados (PAT). Não cumulativo com diárias de viagem.',
    categoria: 'Benefícios',
  },
  {
    numero: '16ª',
    titulo: 'Obrigatoriedade do Vale-Transporte',
    resumo: 'Fornecimento obrigatório mediante Termo de Solicitação assinado e comprovante de residência idôneo (água, luz, locação). Desconto legal de até 6% do salário base conforme Lei 7.418/85.',
    categoria: 'Benefícios',
  },
  {
    numero: '17ª',
    titulo: 'Plano de Saúde (Subsídio Patronal de R$ 189,50)',
    resumo: 'Subsídio mensal de R$ 189,50 por trabalhador ativo no Plano Referência ANS (Ambulatorial + Hospitalar + Obstetrícia, Enfermaria, sem coparticipação). Desconto apenas se upgrade para apartamento ou inclusão de dependentes.',
    categoria: 'Benefícios',
  },
  {
    numero: '19ª',
    titulo: 'Plano de Assistência e Cuidado Pessoal (R$ 47,90)',
    resumo: 'Custeio patronal de R$ 47,90 por trabalhador ativo (Gestora Bem Mais Benefícios). Coberturas: Plano Odonto sem carência, Farmácia Medicamentos Genéricos (crédito R$ 60/mês), Seguro de Vida (mínimo 10x piso), Auxílio Funeral R$ 3.300 + Cesta básica morte 6x R$ 150, Natalidade R$ 600, Assistência Residencial e Automotiva.',
    categoria: 'Benefícios',
  },
  {
    numero: '21ª',
    titulo: 'Atestado de Antecedentes Criminais & CNH',
    resumo: 'Exigência legal na admissão de Atestado de Antecedentes Criminais e extrato de pontuação da CNH para motoristas. Renovação de CNH e Toxicológico custeados pela empresa para motoristas associados com mais de 8 meses.',
    categoria: 'Admissão',
  },
  {
    numero: '27ª',
    titulo: 'Descarregamento e Carregamento "Bater Carga" (15%)',
    resumo: 'Motoristas ficam desobrigados de efetuar carga e descarga. Caso venham a auxiliar no carrego ou descarrego, fazem jus ao adicional de acúmulo de função de 15% do salário base.',
    categoria: 'Adicionais',
  },
  {
    numero: '31ª',
    titulo: 'Transporte de Cargas em Escadas & Penosidade (15%)',
    resumo: 'Adicional de 15% do salário base para ajudantes que realizem transporte manual de mercadorias com peso individual superior a 25kg/30kg em escadas.',
    categoria: 'Adicionais',
  },
  {
    numero: '38ª',
    titulo: 'Tempo de Espera e Fracionamento do Repouso',
    resumo: 'Tempo de espera (carga/descarga/barreiras fiscais) indenizado em 30% do salário-hora normal (não conta como jornada ou hora extra). Possibilidade de fracionar descanso de 11h (mínimo de 8h ininterruptas no 1º período).',
    categoria: 'Jornada',
  },
  {
    numero: '39ª e 40ª',
    titulo: 'Férias, Licenças e Prazos Legais',
    resumo: 'Aviso prévio de férias com 30 dias de antecedência e pagamento das férias + 1/3 até 2 dias antes do gozo (sob pena de multa de 1 piso salarial). Licença nojo: 3 dias no estado ou 5 dias em outro estado. Licença casamento: 3 dias. Licença maternidade: 120 dias (ou 180 dias para associadas > 8 meses).',
    categoria: 'Férias',
  },
  {
    numero: '42ª',
    titulo: 'Gratuidade do Fardamento e Devolução Obrigatória',
    resumo: 'Fornecimento 100% gratuito de identificação, fardamento completo e calçados adequados. O empregado fica obrigado a devolver o fardamento e EPIs antigos no ato da troca ou desligamento.',
    categoria: 'Segurança',
  },
  {
    numero: '44ª',
    titulo: 'Atestados Médicos (Prazo de Entrega em 24h)',
    resumo: 'Atestados médicos/odontológicos devem ser entregues nas 24h seguintes à emissão por WhatsApp/e-mail, com entrega do original no retorno ao trabalho.',
    categoria: 'Saúde',
  },
  {
    numero: '57ª',
    titulo: 'Multa por Descumprimento de Cláusulas',
    resumo: 'Multa de R$ 1.316,00 por trabalhador atingido em caso de descumprimento de qualquer cláusula da CCT, caso a empresa não regularize no prazo de 15 dias após notificação.',
    categoria: 'Penalidades',
  },
];
