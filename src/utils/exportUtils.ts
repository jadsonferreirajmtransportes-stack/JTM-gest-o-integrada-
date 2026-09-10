import * as XLSX from 'xlsx';
import { Colaborador, ProgramacaoFerias, Ocorrencia } from '../types';
import {
  formatDate,
  formatMoney,
  calcVtMes,
  calcVaMes,
  calcCustoMensalTotal,
  calcExamStatus,
  calcDaysRemaining,
} from './formatters';

/**
 * Download a generated XLSX file
 */
export function exportToXLSX(data: any[], fileName: string, sheetName = 'Dados') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Download a generated CSV file with UTF-8 BOM
 */
export function exportToCSV(data: any[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export Employees List
 */
export function exportColaboradoresReport(colaboradores: Colaborador[], format: 'xlsx' | 'csv' = 'xlsx') {
  const rows = colaboradores.map((c) => {
    const examStatus = calcExamStatus(c.dataVencimentoExame);
    const vtMes = calcVtMes(c.vtValorTarifa, c.vtQuantidadeTarifasDia);
    const vaMes = calcVaMes(c.valorValeAlimentacaoDia);
    const custoTotal = calcCustoMensalTotal(
      c.remuneracao,
      c.gratificacao,
      c.vtValorTarifa,
      c.vtQuantidadeTarifasDia,
      c.valorValeAlimentacaoDia
    );

    return {
      'Matrícula': c.codigoMatricula,
      'Nome Completo': c.nomeCompleto,
      'CPF': c.cpf,
      'RG': `${c.rg || ''} ${c.orgaoEmissorUF || ''}`.trim(),
      'Status': c.status,
      'Cargo / Função': c.funcaoCargo,
      'Setor': c.setor,
      'Data de Admissão': formatDate(c.dataAdmissao),
      'Data de Demissão': c.dataDemissao ? formatDate(c.dataDemissao) : '-',
      'Remuneração Base (R$)': c.remuneracao,
      'Gratificação (R$)': c.gratificacao,
      'VT Total/Mês (R$)': vtMes,
      'VA Total/Mês (R$)': vaMes,
      'Custo Total Mensal (R$)': custoTotal,
      'Telefone / WhatsApp': c.telefoneWhatsapp,
      'E-mail': c.email,
      'Banco': c.banco || '-',
      'Agência': c.agencia || '-',
      'Conta': c.numeroConta || '-',
      'Chave PIX': c.chavePix || '-',
      'Último Exame ASO': formatDate(c.dataUltimoExameOcupacional),
      'Vencimento Exame': formatDate(c.dataVencimentoExame),
      'Status Exame (RDC 430)': examStatus,
      'Tamanho Camisa': c.tamanhoCamisa,
      'Número Calça': c.numeroCalca,
      'Número Calçado': c.numeroCalcado,
    };
  });

  const title = `JMT_Relatorio_Colaboradores_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'xlsx') {
    exportToXLSX(rows, title, 'Colaboradores JMT');
  } else {
    exportToCSV(rows, title);
  }
}

/**
 * Export Monthly Costs Report (Module 2.11)
 */
export function exportCustosMensaisReport(colaboradores: Colaborador[], format: 'xlsx' | 'csv' = 'xlsx') {
  const rows = colaboradores.map((c) => {
    const vtDia = (c.vtValorTarifa || 0) * (c.vtQuantidadeTarifasDia || 0);
    const vtMes = calcVtMes(c.vtValorTarifa, c.vtQuantidadeTarifasDia);
    const vaDia = c.valorValeAlimentacaoDia || 0;
    const vaMes = calcVaMes(vaDia);
    const custoTotal = calcCustoMensalTotal(
      c.remuneracao,
      c.gratificacao,
      c.vtValorTarifa,
      c.vtQuantidadeTarifasDia,
      c.valorValeAlimentacaoDia
    );

    return {
      'Matrícula': c.codigoMatricula,
      'Nome do Colaborador': c.nomeCompleto,
      'Cargo / Função': c.funcaoCargo,
      'Setor': c.setor,
      'Status': c.status,
      'Salário Base (R$)': c.remuneracao,
      'Gratificação (R$)': c.gratificacao,
      'VT Valor Diário (R$)': vtDia,
      'VT Total Mensal (R$)': vtMes,
      'VA Valor Diário (R$)': vaDia,
      'VA Total Mensal (R$)': vaMes,
      'Custo Total Mensal (R$)': custoTotal,
    };
  });

  const title = `JMT_Custos_Mensais_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'xlsx') {
    exportToXLSX(rows, title, 'Custos Mensais');
  } else {
    exportToCSV(rows, title);
  }
}

/**
 * Export Benefits Report (VA / VT)
 */
export function exportBeneficiosReport(colaboradores: Colaborador[], format: 'xlsx' | 'csv' = 'xlsx') {
  const rows = colaboradores
    .filter((c) => c.status !== 'Inativo')
    .map((c) => {
      const vtDia = (c.vtValorTarifa || 0) * (c.vtQuantidadeTarifasDia || 0);
      const vtMes = calcVtMes(c.vtValorTarifa, c.vtQuantidadeTarifasDia);
      const vaDia = c.valorValeAlimentacaoDia || 0;
      const vaMes = calcVaMes(vaDia);

      return {
        'Matrícula': c.codigoMatricula,
        'Nome do Colaborador': c.nomeCompleto,
        'Cargo': c.funcaoCargo,
        'Setor': c.setor,
        'VT Tarifas/Dia': c.vtQuantidadeTarifasDia,
        'VT Valor Tarifa (R$)': c.vtValorTarifa,
        'VT Total/Dia (R$)': vtDia,
        'VT Total/Mês (R$)': vtMes,
        'Identificação da Condução': c.vtIdentificacaoConducao || 'Não informado',
        'VA Valor/Dia (R$)': vaDia,
        'VA 1ª Quinzena (R$)': vaMes / 2,
        'VA 2ª Quinzena (R$)': vaMes / 2,
        'VA Total/Mês (R$)': vaMes,
        'Total Benefícios/Mês (R$)': vtMes + vaMes,
      };
    });

  const title = `JMT_Programacao_Beneficios_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'xlsx') {
    exportToXLSX(rows, title, 'Beneficios VA VT');
  } else {
    exportToCSV(rows, title);
  }
}

/**
 * Export Occupational Health (ANVISA / RDC 430) Report
 */
export function exportSaudeReport(colaboradores: Colaborador[], format: 'xlsx' | 'csv' = 'xlsx') {
  const rows = colaboradores.map((c) => {
    const status = calcExamStatus(c.dataVencimentoExame);
    const dias = calcDaysRemaining(c.dataVencimentoExame);

    return {
      'Matrícula': c.codigoMatricula,
      'Colaborador': c.nomeCompleto,
      'Cargo': c.funcaoCargo,
      'Setor': c.setor,
      'Admissão': formatDate(c.dataAdmissao),
      'Exame Admissional': formatDate(c.dataExameAdmissional),
      'Último Periódico': formatDate(c.dataUltimoExameOcupacional),
      'Data de Vencimento': formatDate(c.dataVencimentoExame),
      'Dias Restantes': dias !== null ? dias : 'N/A',
      'Status RDC 430': status,
      'Exame Demissional': formatDate(c.dataExameDemissional),
      'Clínica / Médico': c.clinicaMedica || 'MedSeg Medicina do Trabalho',
    };
  });

  const title = `JMT_Conformidade_Saude_RDC430_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'xlsx') {
    exportToXLSX(rows, title, 'Saude Ocupacional RDC 430');
  } else {
    exportToCSV(rows, title);
  }
}

export const exportExamesReport = exportSaudeReport;

/**
 * Export Vacation Schedule
 */
export function exportFeriasReport(
  ferias: ProgramacaoFerias[],
  colaboradoresMap: Map<string, Colaborador>,
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  const rows = ferias.map((f) => {
    const colab = colaboradoresMap.get(f.colaboradorId);
    const diasLimite = calcDaysRemaining(f.prazoLimiteGozo);

    return {
      'Colaborador': colab?.nomeCompleto || 'Colaborador',
      'Setor': colab?.setor || '-',
      'Período Aquisitivo Início': formatDate(f.periodoAquisitivoInicio),
      'Período Aquisitivo Fim': formatDate(f.periodoAquisitivoFim),
      'Prazo Limite Gozo (CLT)': formatDate(f.prazoLimiteGozo),
      'Dias até Limite CLT': diasLimite !== null ? diasLimite : 'N/A',
      'Início do Gozo': f.dataInicio ? formatDate(f.dataInicio) : 'A definir',
      'Fim do Gozo': f.dataFim ? formatDate(f.dataFim) : 'A definir',
      'Dias de Gozo': f.diasGozados,
      'Abono Pecuniário (10 dias)': f.abonoPecuniario ? 'Sim' : 'Não',
      'Status': f.status,
    };
  });

  const title = `JMT_Programacao_Ferias_CLT_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'xlsx') {
    exportToXLSX(rows, title, 'Programacao Ferias CLT');
  } else {
    exportToCSV(rows, title);
  }
}

/**
 * Export Occurrences Report
 */
export function exportOcorrenciasReport(
  ocorrencias: Ocorrencia[],
  colaboradoresMap: Map<string, Colaborador>,
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  const rows = ocorrencias.map((o) => {
    const colab = colaboradoresMap.get(o.colaboradorId);
    return {
      'Data da Ocorrência': formatDate(o.dataOcorrencia),
      'Colaborador': colab?.nomeCompleto || 'Colaborador',
      'Matrícula': colab?.codigoMatricula || '-',
      'Setor': colab?.setor || '-',
      'Tipo de Evento': o.tipo,
      'Dias Afastamento': o.diasAfastamento || 0,
      'Descrição / Justificativa': o.descricao,
      'Registrado Por': o.registradoPor || 'Departamento Pessoal',
      'Comprovante Anexo': o.comprovanteAnexo || 'Não anexado',
    };
  });

  const title = `JMT_Relatorio_Ocorrencias_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'xlsx') {
    exportToXLSX(rows, title, 'Ocorrencias');
  } else {
    exportToCSV(rows, title);
  }
}

/**
 * Export Birthday Celebrants Report
 */
export function exportAniversariantesReport(
  colaboradores: Colaborador[],
  monthIndex?: number, // 1-12 or undefined for all
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let filtered = colaboradores.filter((c) => c.status !== 'Inativo' && c.dataNascimento);

  if (monthIndex !== undefined && monthIndex >= 1 && monthIndex <= 12) {
    filtered = filtered.filter((c) => {
      const parts = c.dataNascimento!.split('-');
      return parseInt(parts[1], 10) === monthIndex;
    });
  }

  // Sort by month and day
  filtered.sort((a, b) => {
    const partsA = a.dataNascimento!.split('-');
    const partsB = b.dataNascimento!.split('-');
    const mA = parseInt(partsA[1], 10);
    const mB = parseInt(partsB[1], 10);
    if (mA !== mB) return mA - mB;
    return parseInt(partsA[2], 10) - parseInt(partsB[2], 10);
  });

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  const rows = filtered.map((c) => {
    const parts = c.dataNascimento!.split('-');
    const anoNasc = parseInt(parts[0], 10);
    const mesNasc = parseInt(parts[1], 10);
    const diaNasc = parseInt(parts[2], 10);
    const idade = isNaN(anoNasc) ? '-' : anoAtual - anoNasc;

    return {
      'Dia': diaNasc,
      'Mês': monthNames[mesNasc - 1],
      'Data de Nascimento': `${String(diaNasc).padStart(2, '0')}/${String(mesNasc).padStart(2, '0')}/${anoNasc}`,
      [`Idade em ${anoAtual}`]: idade,
      'Colaborador': c.nomeCompleto,
      'Matrícula': c.codigoMatricula,
      'Cargo / Função': c.funcaoCargo,
      'Setor': c.setor,
      'Telefone / WhatsApp': c.telefoneWhatsapp || '-',
      'E-mail': c.email || '-',
      'Status': c.status,
    };
  });

  const monthSuffix = monthIndex ? `_${monthNames[monthIndex - 1]}` : '_Anual';
  const title = `JMT_Aniversariantes${monthSuffix}_${new Date().toISOString().slice(0, 10)}`;

  if (format === 'xlsx') {
    exportToXLSX(rows, title, 'Aniversariantes');
  } else {
    exportToCSV(rows, title);
  }
}
