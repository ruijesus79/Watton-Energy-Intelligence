
import { InvoiceData, SimulationResult, VoltageLevel, TariffCycle } from '../types';
import { MARKET_DATA } from '../constants';
import { getWattonCost } from './smartBill';

/**
 * WATTON FINANCIAL ENGINE V2 (High Precision)
 * Integrado com Tabelas ZUG (smartBill.ts)
 */

const calculatePeriodTotal = (
  consumptions: { ponta: number; cheia: number; vazio: number; super_vazio: number },
  prices: { ponta: number; cheia: number; vazio: number; super_vazio: number },
  power: { days: number; pricePerDay: number }
) => {
  const c = {
    ponta: consumptions.ponta || 0,
    cheia: consumptions.cheia || 0,
    vazio: consumptions.vazio || 0,
    super_vazio: consumptions.super_vazio || 0
  };
  
  const energyCost = 
    (c.ponta * prices.ponta) +
    (c.cheia * prices.cheia) +
    (c.vazio * prices.vazio) +
    (c.super_vazio * prices.super_vazio);
  
  const powerCost = (power.days || 30) * (power.pricePerDay || 0);

  return energyCost + powerCost;
};

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

export const calculateSimulation = (data: InvoiceData): SimulationResult => {
  const daysInPeriod = getBillingDays(data);
  const annualizationFactor = 365 / daysInPeriod;

  // 1. OBTER CUSTOS BASE (ZUG)
  // Agora passamos a Potência Contratada para distinguir BTN Low/High
  const baseCostsEnergy = getWattonCost(data.tensao_fornecimento, data.ciclo, data.potencia_contratada);
  
  // Custo Base de Potência (TAR Potência)
  // Simplificação: Usamos um valor base do constants ou heurística, já que a folha ZUG é focada em Energia.
  // Vamos assumir que o custo base de potência é aprox 40% do valor de venda médio de mercado se não tivermos TAR exata.
  // Para demo, usamos o valor do constants.ts
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

  const proposed = {
    ponta: calcSmartPrice(data.preco_ponta, bases.ponta),
    cheia: calcSmartPrice(data.preco_cheia, bases.cheia),
    vazio: calcSmartPrice(data.preco_vazio, bases.vazio),
    super_vazio: calcSmartPrice(data.preco_super_vazio, bases.super_vazio),
    potencia_dia: calcSmartPrice(data.preco_potencia_dia, bases.potencia_dia)
  };

  const margins = {
    ponta: proposed.ponta - bases.ponta,
    cheia: proposed.cheia - bases.cheia,
    vazio: proposed.vazio - bases.vazio,
    super_vazio: proposed.super_vazio - bases.super_vazio,
    potencia_dia: proposed.potencia_dia - bases.potencia_dia
  };

  return computeFinancials(data, bases, margins, daysInPeriod, annualizationFactor);
};

export const recalculateWithOverrides = (
  data: InvoiceData, 
  originalSim: SimulationResult, 
  overrides: any
): SimulationResult => {
  const daysInPeriod = getBillingDays(data);
  const annualizationFactor = 365 / daysInPeriod;

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

  const result = computeFinancials(data, bases, margins, daysInPeriod, annualizationFactor);
  result.aiInsights = originalSim.aiInsights;
  result.autoSwitch = overrides.autoSwitch ?? originalSim.autoSwitch;

  return result;
};

function computeFinancials(
  data: InvoiceData,
  bases: any,
  margins: any,
  daysInPeriod: number,
  annualizationFactor: number
): SimulationResult {

  const consumptions = {
    ponta: data.consumo_ponta || 0,
    cheia: data.consumo_cheia || 0,
    vazio: data.consumo_vazio || 0,
    super_vazio: data.consumo_super_vazio || 0
  };

  const currentPrices = {
    ponta: data.preco_ponta || 0,
    cheia: data.preco_cheia || 0,
    vazio: data.preco_vazio || 0,
    super_vazio: data.preco_super_vazio || 0
  };
  
  let currentCostPeriod = calculatePeriodTotal(consumptions, currentPrices, { days: daysInPeriod, pricePerDay: data.preco_potencia_dia || 0 });
  
  if (currentCostPeriod === 0 && data.total_fatura_com_iva > 0) {
      currentCostPeriod = data.total_fatura_com_iva / 1.23; 
  }

  const currentAnnualCost = currentCostPeriod * annualizationFactor;

  const basePrices = {
    ponta: bases.ponta,
    cheia: bases.cheia,
    vazio: bases.vazio,
    super_vazio: bases.super_vazio
  };
  const wattonBaseCostPeriod = calculatePeriodTotal(consumptions, basePrices, { days: daysInPeriod, pricePerDay: bases.potencia_dia });
  const wattonBaseAnnual = wattonBaseCostPeriod * annualizationFactor;

  const proposedPrices = {
    ponta: bases.ponta + margins.ponta,
    cheia: bases.cheia + margins.cheia,
    vazio: bases.vazio + margins.vazio,
    super_vazio: bases.super_vazio + margins.super_vazio
  };
  const proposedPowerPrice = bases.potencia_dia + margins.potencia_dia;
  
  const wattonProposedCostPeriod = calculatePeriodTotal(consumptions, proposedPrices, { days: daysInPeriod, pricePerDay: proposedPowerPrice });
  const wattonProposedAnnual = wattonProposedCostPeriod * annualizationFactor;

  const savingsTotal = currentAnnualCost - wattonProposedAnnual;
  const totalMarginAnnual = wattonProposedAnnual - wattonBaseAnnual;
  
  let score = 5;
  if (savingsTotal > (currentAnnualCost * 0.2)) score = 8; 
  else if (savingsTotal > (currentAnnualCost * 0.3)) score = 9;
  else if (savingsTotal < (currentAnnualCost * 0.05)) score = 3; 

  let label: any = 'MÉDIO';
  if (score >= 8) label = 'CRÍTICO'; else if (score <= 3) label = 'BAIXO'; else if (score >= 6) label = 'ELEVADO';

  return {
    currentAnnualCost,
    wattonBaseCost: wattonBaseAnnual,
    wattonProposedCost: wattonProposedAnnual,
    wattonMarginTotal: totalMarginAnnual,
    wattonMarginPercent: wattonProposedAnnual > 0 ? (totalMarginAnnual / wattonProposedAnnual) * 100 : 0,
    savingsTotal,
    savingsMonthly: savingsTotal / 12,
    savingsPercent: currentAnnualCost > 0 ? (savingsTotal / currentAnnualCost) * 100 : 0,

    base_ponta: bases.ponta, base_cheia: bases.cheia, base_vazio: bases.vazio, base_super_vazio: bases.super_vazio, base_potencia_dia: bases.potencia_dia,
    margin_ponta: margins.ponta, margin_cheia: margins.cheia, margin_vazio: margins.vazio, margin_super_vazio: margins.super_vazio, margin_potencia_dia: margins.potencia_dia,
    proposed_ponta: proposedPrices.ponta, proposed_cheia: proposedPrices.cheia, proposed_vazio: proposedPrices.vazio, proposed_super_vazio: proposedPrices.super_vazio, proposed_potencia_dia: proposedPowerPrice,

    bestMarginOpportunity: 'Ponta',
    vulnerabilityScore: score,
    vulnerabilityLabel: label,

    loadShift: { peakPercentage: 0, shiftPotentialKwh: 0, shiftSavingsEuro: 0, optimizedAnnualCost: 0 },
    risk: { profile: 'Moderado', marketVolatilityExposure: 'Média', recommendation: 'Indexado Controlado' },
    
    autoSwitch: { isEnabled: false, status: 'idle' },
    
    validationMessages: []
  };
}
