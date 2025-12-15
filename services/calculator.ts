
import { InvoiceData, SimulationResult, CalculationResult, WattonPriceConfig } from '../types';
import { MARKET_DATA } from '../constants';
import { getWattonCost } from './smartBill';

// ═══════════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH - Todos os cálculos passam aqui
// ═══════════════════════════════════════════════════════════════════

const getBillingDays = (data: InvoiceData): number => {
  if (data.data_inicio && data.data_fim) {
    const start = new Date(data.data_inicio);
    const end = new Date(data.data_fim);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays > 0 && diffDays < 366) return diffDays;
    }
  }
  return 30; // Fallback robusto
};

// ═══════════════════════════════════════════════════════════════════
// FÓRMULA CANÓNICA (INVIOLÁVEL)
// Custo Anual = (Custo Total Período / Dias Período) × 365
// ═══════════════════════════════════════════════════════════════════
export const calculateAnnualCost = (monthlyTotal: number, billingDays: number): number => {
  if (billingDays <= 0) {
    console.warn('⚠️ Dias inválidos:', billingDays);
    return 0;
  }

  const dailyCost = monthlyTotal / billingDays;
  const annualCost = dailyCost * 365;

  // Arredondar a 2 casas decimais (€)
  return Math.round(annualCost * 100) / 100;
};

// ═══════════════════════════════════════════════════════════════════
// SIMULAÇÃO ÚNICA (CORE ENGINE)
// ═══════════════════════════════════════════════════════════════════
export const simulateWattonProposal = (
  invoiceData: InvoiceData,
  wattonPrices: WattonPriceConfig,
  billingDaysOverride?: number
): CalculationResult => {
  
  // Extrai consumos (com segurança)
  const consumption = {
    ponta: invoiceData.consumo_ponta || 0,
    cheias: invoiceData.consumo_cheia || 0,
    vazio: invoiceData.consumo_vazio || 0,
    superVazio: invoiceData.consumo_super_vazio || 0,
  };

  // Extrai preços atuais (com segurança)
  const pricesActual = {
    ponta: invoiceData.preco_ponta || 0,
    cheias: invoiceData.preco_cheia || 0,
    vazio: invoiceData.preco_vazio || 0,
    superVazio: invoiceData.preco_super_vazio || 0,
  };

  // CÁLCULO ENERGIA - ATUAL
  const energyCostCurrent = {
    ponta: consumption.ponta * pricesActual.ponta,
    cheias: consumption.cheias * pricesActual.cheias,
    vazio: consumption.vazio * pricesActual.vazio,
    superVazio: consumption.superVazio * pricesActual.superVazio,
  };
  const totalEnergyCurrent = Object.values(energyCostCurrent).reduce((a, b) => a + b, 0);

  // CÁLCULO POTÊNCIA - ATUAL
  const billingDays = billingDaysOverride || getBillingDays(invoiceData);
  const powerCostCurrent = (invoiceData.preco_potencia_dia || 0) * billingDays;

  // TOTAL MENSAL ATUAL (Period Total)
  let currentMonthly = totalEnergyCurrent + powerCostCurrent;
  
  // Fallback: Se cálculo for zero mas fatura tiver total, usar total da fatura (sem IVA aprox)
  if (currentMonthly === 0 && invoiceData.total_fatura_com_iva > 0) {
      currentMonthly = invoiceData.total_fatura_com_iva / 1.23;
  }

  // TOTAL ANUAL ATUAL (FÓRMULA CANÓNICA)
  const currentAnnual = calculateAnnualCost(currentMonthly, billingDays);

  // ═══════════════════════════════════════════════════════════════════
  // CÁLCULO WATTON (Proposta)
  // ═══════════════════════════════════════════════════════════════════

  const energyCostWatton = {
    ponta: consumption.ponta * (wattonPrices.ponta || 0),
    cheias: consumption.cheias * (wattonPrices.cheia || 0),
    vazio: consumption.vazio * (wattonPrices.vazio || 0),
    superVazio: consumption.superVazio * (wattonPrices.superVazio || 0),
  };
  const totalEnergyWatton = Object.values(energyCostWatton).reduce((a, b) => a + b, 0);

  const powerCostWatton = (wattonPrices.powerDaily || 0) * billingDays;

  const wattonMonthly = totalEnergyWatton + powerCostWatton;
  const wattonAnnual = calculateAnnualCost(wattonMonthly, billingDays);

  // ═══════════════════════════════════════════════════════════════════
  // POUPANÇA (RESULTADO FINAL)
  // ═══════════════════════════════════════════════════════════════════

  const savingsMonthly = currentMonthly - wattonMonthly;
  const savingsAnnual = currentAnnual - wattonAnnual;
  const savingsPercent = currentAnnual > 0 ? (savingsAnnual / currentAnnual) * 100 : 0;

  return {
    // Valores do Período (Mensais/Bimensais)
    currentMonthly: Math.round(currentMonthly * 100) / 100,
    wattonMonthly: Math.round(wattonMonthly * 100) / 100,
    savingsMonthly: Math.round(savingsMonthly * 100) / 100,

    // Anuais (CANÓNICOS - NUNCA RECALCULAR)
    currentAnnual: Math.round(currentAnnual * 100) / 100,
    wattonAnnual: Math.round(wattonAnnual * 100) / 100,
    savingsAnnual: Math.round(savingsAnnual * 100) / 100,
    savingsPercent: Math.round(savingsPercent * 100) / 100,

    // Detalhe
    breakdown: {
      energyCurrent: {
        ponta: Math.round(energyCostCurrent.ponta * 100) / 100,
        cheias: Math.round(energyCostCurrent.cheias * 100) / 100,
        vazio: Math.round(energyCostCurrent.vazio * 100) / 100,
        superVazio: Math.round(energyCostCurrent.superVazio * 100) / 100,
        total: Math.round(totalEnergyCurrent * 100) / 100,
      },
      energyWatton: {
        ponta: Math.round(energyCostWatton.ponta * 100) / 100,
        cheias: Math.round(energyCostWatton.cheias * 100) / 100,
        vazio: Math.round(energyCostWatton.vazio * 100) / 100,
        superVazio: Math.round(energyCostWatton.superVazio * 100) / 100,
        total: Math.round(totalEnergyWatton * 100) / 100,
      },
      powerCurrent: Math.round(powerCostCurrent * 100) / 100,
      powerWatton: Math.round(powerCostWatton * 100) / 100,
      billingDays,
      annualizationFactor: 365 / billingDays,
    },
  };
};


// ═══════════════════════════════════════════════════════════════════
// BRIDGE PARA UI EXISTENTE (Mantém compatibilidade)
// ═══════════════════════════════════════════════════════════════════
export const calculateSimulation = (data: InvoiceData): SimulationResult => {
  
  // 1. Obter Custos Base (ZUG)
  const baseCostsEnergy = getWattonCost(data.tensao_fornecimento, data.ciclo, data.potencia_contratada);
  
  let vKey: keyof typeof MARKET_DATA.access_tariffs = 'BTE';
  if (data.tensao_fornecimento.includes('BTN')) vKey = 'BTN';
  else if (data.tensao_fornecimento.includes('MT')) vKey = 'MT';
  
  const basePowerCost = MARKET_DATA.access_tariffs[vKey].potencia;

  const bases = {
    ponta: baseCostsEnergy.ponta,
    cheia: baseCostsEnergy.cheia,
    vazio: baseCostsEnergy.vazio,
    super_vazio: baseCostsEnergy.super_vazio,
    potencia_dia: basePowerCost
  };

  // Estratégia de Margem Automática
  const targetSavingsPct = 0.08; 
  const calcSmartPrice = (current: number, base: number) => {
    if (!current || current === 0) return base * 1.1; 
    const target = current * (1 - targetSavingsPct);
    if (target < base) return base + 0.001; 
    return target;
  };

  const proposedPrices: WattonPriceConfig = {
    ponta: calcSmartPrice(data.preco_ponta, bases.ponta),
    cheia: calcSmartPrice(data.preco_cheia, bases.cheia),
    vazio: calcSmartPrice(data.preco_vazio, bases.vazio),
    superVazio: calcSmartPrice(data.preco_super_vazio, bases.super_vazio),
    powerDaily: calcSmartPrice(data.preco_potencia_dia, bases.potencia_dia)
  };

  // EXECUTA MOTOR PRINCIPAL
  const result = simulateWattonProposal(data, proposedPrices);

  // Mapeia para estrutura SimulationResult antiga + nova
  return mapToSimulationResult(result, bases, proposedPrices);
};


export const recalculateWithOverrides = (
  data: InvoiceData, 
  originalSim: SimulationResult, 
  overrides: any
): SimulationResult => {
  
  // Reconstrói configuração de preços baseado nos overrides ou originais
  const bases = {
    ponta: overrides.base_ponta ?? originalSim.base_ponta,
    cheia: overrides.base_cheia ?? originalSim.base_cheia,
    vazio: overrides.base_vazio ?? originalSim.base_vazio,
    super_vazio: overrides.base_super_vazio ?? originalSim.base_super_vazio,
    potencia_dia: overrides.base_potencia_dia ?? originalSim.base_potencia_dia,
  };

  const margins = {
    ponta: overrides.margin_ponta ?? originalSim.margin_ponta,
    cheia: overrides.margin_cheia ?? originalSim.margin_cheia,
    vazio: overrides.margin_vazio ?? originalSim.margin_vazio,
    super_vazio: overrides.margin_super_vazio ?? originalSim.margin_super_vazio,
    potencia_dia: overrides.margin_potencia_dia ?? originalSim.margin_potencia_dia,
  };

  const proposedPrices: WattonPriceConfig = {
    ponta: bases.ponta + margins.ponta,
    cheia: bases.cheia + margins.cheia,
    vazio: bases.vazio + margins.vazio,
    superVazio: bases.super_vazio + margins.super_vazio,
    powerDaily: bases.potencia_dia + margins.potencia_dia
  };

  // EXECUTA MOTOR PRINCIPAL
  const result = simulateWattonProposal(data, proposedPrices);
  const finalResult = mapToSimulationResult(result, bases, proposedPrices);
  
  // Preserve AI Insights
  finalResult.aiInsights = originalSim.aiInsights;
  finalResult.autoSwitch = overrides.autoSwitch ?? originalSim.autoSwitch;

  return finalResult;
};

// Helper para manter compatibilidade com UI
function mapToSimulationResult(
  calc: CalculationResult, 
  bases: any, 
  proposed: WattonPriceConfig
): SimulationResult {
  
  // Calculate Score
  let score = 5;
  if (calc.savingsPercent > 20) score = 8;
  else if (calc.savingsPercent > 30) score = 9;
  else if (calc.savingsPercent < 5) score = 3;

  let label: any = 'MÉDIO';
  if (score >= 8) label = 'CRÍTICO'; else if (score <= 3) label = 'BAIXO'; else if (score >= 6) label = 'ELEVADO';

  const margins = {
    ponta: proposed.ponta - bases.ponta,
    cheia: proposed.cheia - bases.cheia,
    vazio: proposed.vazio - bases.vazio,
    super_vazio: proposed.superVazio - bases.super_vazio,
    potencia_dia: proposed.powerDaily - bases.potencia_dia
  };

  const wattonBaseAnnual = calc.wattonAnnual - (
     (margins.ponta * calc.breakdown.billingDays * calc.breakdown.annualizationFactor) // Simplificação para demo
  ); 

  return {
    ...calc, // Spread CalculationResult props (currentMonthly, currentAnnual, etc)
    
    // Aliases
    currentAnnualCost: calc.currentAnnual,
    wattonProposedCost: calc.wattonAnnual,
    savingsTotal: calc.savingsAnnual,
    wattonBaseCost: calc.wattonAnnual * 0.85, // Estimate base cost
    wattonMarginTotal: calc.wattonAnnual * 0.15, // Estimate margin
    wattonMarginPercent: 15,

    base_ponta: bases.ponta, base_cheia: bases.cheia, base_vazio: bases.vazio, base_super_vazio: bases.super_vazio, base_potencia_dia: bases.potencia_dia,
    
    margin_ponta: margins.ponta, margin_cheia: margins.cheia, margin_vazio: margins.vazio, margin_super_vazio: margins.super_vazio, margin_potencia_dia: margins.potencia_dia,
    
    proposed_ponta: proposed.ponta, proposed_cheia: proposed.cheia, proposed_vazio: proposed.vazio, proposed_super_vazio: proposed.superVazio, proposed_potencia_dia: proposed.powerDaily,

    bestMarginOpportunity: 'Ponta',
    vulnerabilityScore: score,
    vulnerabilityLabel: label,

    loadShift: { peakPercentage: 0, shiftPotentialKwh: 0, shiftSavingsEuro: 0, optimizedAnnualCost: 0 },
    risk: { profile: 'Moderado', marketVolatilityExposure: 'Média', recommendation: 'Indexado Controlado' },
    
    autoSwitch: { isEnabled: false, status: 'idle' },
    validationMessages: []
  };
}
