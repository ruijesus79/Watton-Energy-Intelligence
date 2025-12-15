
import { InvoiceData, SimulationResult, PrescriptiveAnalysisResult, TariffCycle, VoltageLevel } from '../types';

interface TariffPeriod {
  ponta: number;      // €/kWh
  cheia: number;      // €/kWh
  vazio: number;      // €/kWh
  super_vazio: number;// €/kWh
}

/**
 * TABELA DE PREÇOS INTERNA (ZUG - FOLHA DE PREÇOS)
 * Dados extraídos do PDF "FOLHA DE PREÇOS - PREÇOS FIXOS BASE (KISS)"
 * Linha de Referência: Inicio Q+1 12 meses (01.01.2026 - 31.12.2026)
 * Valores originais em €/MWh.
 */
const ZUG_FORWARD_2026_MWH = {
  // Baixa Tensão Normal (< 20.7 kVA)
  BTN_LOW: {
    [TariffCycle.SIMPLE]:       { ponta: 90.338, cheia: 0, vazio: 0, super_vazio: 0 }, // Diario Simples
    [TariffCycle.BI_HOURLY]:    { ponta: 0, cheia: 89.531, vazio: 90.224, super_vazio: 0 }, // Diario Bi-Horario
    [TariffCycle.TRI_HOURLY]:   { ponta: 100.570, cheia: 85.055, vazio: 93.079, super_vazio: 0 }, // Diario Tri-Horario
  },
  
  // Baixa Tensão Normal (> 20.7 kVA)
  BTN_HIGH: {
    [TariffCycle.SIMPLE]:       { ponta: 97.498, cheia: 0, vazio: 0, super_vazio: 0 }, 
    [TariffCycle.BI_HOURLY]:    { ponta: 0, cheia: 84.300, vazio: 90.375, super_vazio: 0 },
    [TariffCycle.TRI_HOURLY]:   { ponta: 99.777, cheia: 85.016, vazio: 90.224, super_vazio: 0 }, // << O TEU EXEMPLO (34.5kVA)
  },

  // Baixa Tensão Especial (BTE)
  BTE: {
    [TariffCycle.TETRA_HOURLY]: { ponta: 94.782, cheia: 86.418, vazio: 83.063, super_vazio: 80.196 },
    [TariffCycle.TRI_HOURLY]:   { ponta: 95.017, cheia: 87.820, vazio: 84.211, super_vazio: 0 }, // Semanal s/ Feriados Aprox
  },

  // Média Tensão (MT)
  MT: {
    [TariffCycle.TETRA_HOURLY]: { ponta: 84.589, cheia: 81.126, vazio: 75.210, super_vazio: 73.843 },
    [TariffCycle.TRI_HOURLY]:   { ponta: 93.918, cheia: 79.445, vazio: 74.253, super_vazio: 0 },
  }
};

/**
 * FASE 3: Motor de Preços Internos (Correção Lógica PDF)
 * Seleciona o custo base correto considerando Tensão E Potência.
 */
export const getWattonCost = (voltage: VoltageLevel, cycle: TariffCycle, power: number): TariffPeriod => {
  let categoryTable;

  // 1. Lógica de Seleção Baseada no PDF
  if (voltage === VoltageLevel.MT || voltage === VoltageLevel.AT) {
    categoryTable = ZUG_FORWARD_2026_MWH.MT;
  } else if (voltage === VoltageLevel.BTE) {
    categoryTable = ZUG_FORWARD_2026_MWH.BTE;
  } else {
    // Caso BTN (ou BT genérico), decide pela Potência Contratada
    // PDF Segmenta em < 20.7kW e > 20.7kW
    if (power > 20.7) {
      categoryTable = ZUG_FORWARD_2026_MWH.BTN_HIGH;
    } else {
      categoryTable = ZUG_FORWARD_2026_MWH.BTN_LOW;
    }
  }

  // 2. Seleção do Ciclo (Fallback robusto)
  // @ts-ignore - Acesso dinâmico seguro pois temos fallbacks
  let costMWh = categoryTable[cycle];

  // Fallback se o ciclo não existir na tabela específica (ex: BTN Tetra -> usa Tri)
  if (!costMWh) {
      // @ts-ignore
      costMWh = categoryTable[TariffCycle.TRI_HOURLY] || categoryTable[Object.keys(categoryTable)[0]];
  }

  // 3. Conversão MWh -> kWh (Divisão por 1000)
  // Exemplo BTN >20.7 Tri: 99.777 / 1000 = 0.099777
  return {
    ponta: parseFloat((costMWh.ponta / 1000).toFixed(6)),
    cheia: parseFloat((costMWh.cheia / 1000).toFixed(6)),
    vazio: parseFloat((costMWh.vazio / 1000).toFixed(6)),
    super_vazio: parseFloat((costMWh.super_vazio / 1000).toFixed(6)),
  };
};

/**
 * FASE 9: Análise Prescritiva Avançada
 * Calcula a oferta ideal, MMV (Maximum Viable Margin) e insights operacionais.
 */
export const runSmartBillPrescriptiveAnalysis = (
  invoice: InvoiceData,
  currentSimulation: SimulationResult
): PrescriptiveAnalysisResult => {

  // --- 1. DATA AGGREGATION ---
  const consumption = {
    Ponta: invoice.consumo_ponta,
    Cheia: invoice.consumo_cheia,
    Vazio: invoice.consumo_vazio,
    'Super Vazio': invoice.consumo_super_vazio
  };

  const currentCosts = {
    Ponta: invoice.consumo_ponta * invoice.preco_ponta,
    Cheia: invoice.consumo_cheia * invoice.preco_cheia,
    Vazio: invoice.consumo_vazio * invoice.preco_vazio,
    'Super Vazio': invoice.consumo_super_vazio * invoice.preco_super_vazio
  };

  const totalConsumption = Object.values(consumption).reduce((a, b) => a + b, 0) || 1;

  // --- 2. PROFILE ANALYSIS ---
  const highestConsumptionPeriod = Object.entries(consumption)
    .sort(([, a], [, b]) => b - a)[0][0] as any;

  const highestCostPeriod = Object.entries(currentCosts)
    .sort(([, a], [, b]) => b - a)[0][0] as any;

  const nonPeakConsumption = totalConsumption - consumption.Ponta;
  const profileEfficiencyScore = Math.min(100, Math.round((nonPeakConsumption / totalConsumption) * 100));

  // --- 3. FINANCIAL OPTIMIZATION (Com tabela ZUG correta) ---
  // Passamos agora a potência contratada para decidir entre BTN Low/High
  const internalCosts = getWattonCost(invoice.tensao_fornecimento, invoice.ciclo, invoice.potencia_contratada);
  
  const MIN_SAVINGS_TARGET_PCT = 0.05;
  const STANDARD_MARGIN_PCT = 0.15;

  const calculateProposed = (cost: number, marginPct: number) => cost * (1 + marginPct);
  
  const standardProposed = {
    ponta: calculateProposed(internalCosts.ponta, STANDARD_MARGIN_PCT),
    cheia: calculateProposed(internalCosts.cheia, STANDARD_MARGIN_PCT),
    vazio: calculateProposed(internalCosts.vazio, STANDARD_MARGIN_PCT),
    super_vazio: calculateProposed(internalCosts.super_vazio, STANDARD_MARGIN_PCT)
  };

  const standardTotalCost = 
    (standardProposed.ponta * invoice.consumo_ponta) +
    (standardProposed.cheia * invoice.consumo_cheia) +
    (standardProposed.vazio * invoice.consumo_vazio) +
    (standardProposed.super_vazio * invoice.consumo_super_vazio) +
    (currentSimulation.proposed_potencia_dia * 365);

  const currentTotalCost = currentSimulation.currentAnnualCost;
  const standardSavingsPct = (currentTotalCost - standardTotalCost) / currentTotalCost;

  let finalStrategy = 'Standard';
  let finalMargins = {
    ponta: standardProposed.ponta - internalCosts.ponta,
    cheia: standardProposed.cheia - internalCosts.cheia,
    vazio: standardProposed.vazio - internalCosts.vazio
  };

  // LOGICA MMV (Maximum Viable Margin)
  if (standardSavingsPct < MIN_SAVINGS_TARGET_PCT) {
    finalStrategy = 'Maximum Viable Margin';
    const calcMMV = (currentPrice: number, cost: number) => {
        const target = currentPrice * (1 - MIN_SAVINGS_TARGET_PCT);
        const margin = target - cost;
        return Math.max(0.001, margin);
    };

    finalMargins = {
        ponta: calcMMV(invoice.preco_ponta, internalCosts.ponta),
        cheia: calcMMV(invoice.preco_cheia, internalCosts.cheia),
        vazio: calcMMV(invoice.preco_vazio, internalCosts.vazio)
    };
  }

  // --- 4. OPERATIONAL INSIGHTS ---
  const shiftViability = profileEfficiencyScore < 60 
    ? `Alta. O cliente consome ${consumption.Ponta.toFixed(0)} kWh em Ponta. Mover 10% para Vazio gera ~${((invoice.preco_ponta - invoice.preco_vazio) * consumption.Ponta * 0.1).toFixed(0)}€ de poupança direta.`
    : `Baixa. O cliente já apresenta uma eficiência de ${profileEfficiencyScore}%.`;

  const readingRisk = invoice.leituraTipo === 'Estimada'
    ? `CRÍTICO. Fatura baseada em estimativas. Recomenda-se envio imediato de leitura real.`
    : `Baixo. Faturação real, garantindo precisão.`;

  const servicesCount = invoice.servicosAdicionais?.length || 0;
  const servicesImpact = servicesCount > 0
    ? `Atenção: Cliente subscreve ${servicesCount} serviços adicionais (${invoice.servicosAdicionais?.join(', ')}).`
    : `Nenhum serviço adicional detetado.`;

  return {
    highestConsumptionPeriod,
    highestCostPeriod,
    profileEfficiencyScore,
    
    savingsProjection: {
      fixedContractSavings: currentSimulation.savingsTotal,
      indexContractSavings: currentSimulation.savingsTotal * 1.12,
      bestOption: 'Indexed'
    },

    optimizationSuggestion: {
      loadShiftingViability: shiftViability,
      estimatedReadingRisk: readingRisk,
      additionalServicesImpact: servicesImpact
    },
    
    marginAnalysis: {
        appliedStrategy: finalStrategy as any,
        marginPonta: parseFloat(finalMargins.ponta.toFixed(6)),
        marginCheia: parseFloat(finalMargins.cheia.toFixed(6)),
        marginVazio: parseFloat(finalMargins.vazio.toFixed(6))
    }
  };
};
