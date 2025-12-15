

export enum TariffCycle {
  SIMPLE = 'Simples',
  BI_HOURLY = 'Bi-Horário',
  TRI_HOURLY = 'Tri-Horário',
  TETRA_HOURLY = 'Tetra-Horário'
}

export enum VoltageLevel {
  BTN = 'BTN',
  BTE = 'BTE',
  MT = 'MT',
  AT = 'AT', // Alta Tensão (> 45 kV)
  BT = 'BT'  // Baixa Tensão (Genérico)
}

export enum TimeCycleOption {
  DIARIO = 'Diário',
  SEMANAL = 'Semanal',
  SEMANAL_C_FERIADOS = 'Semanal c/ Feriados',
  SEMANAL_S_FERIADOS = 'Semanal s/ Feriados'
}

// Sub-types for Granular Extraction
export interface MonthlyConsumption {
  mes: string;
  consumoKWh: number;
}

export interface RegulatedCosts {
  tarifaAcessoRedes: number | null; // € total ou €/kWh
  ciegValor: number | null;         // € total
  taxaExploracao: number | null;    // € total
}

export interface InvoiceData {
  id?: string;
  nome_cliente: string;
  nif_cliente: string;
  morada_cliente: string;
  cpe: string;
  
  // ARQUIVO ORIGINAL (Novo)
  originalFileBase64?: string;
  originalFileName?: string;
  originalMimeType?: string;

  // FASE 2: Granular Extraction Fields
  contractType: string | null;      // ex: 'BTN Diário Tri-horário > 20,7KVA'
  leituraTipo: 'Real' | 'Estimada' | 'Mista' | null;
  servicosAdicionais: string[] | null; // ex: ['Seguro', 'Manutenção']
  custosRegulados: RegulatedCosts | null;
  historicoConsumoMensal: MonthlyConsumption[] | null;
  mixProducao: string | null;       // ex: '100% Renovável'
  
  tensao_fornecimento: VoltageLevel;
  ciclo: TariffCycle;
  opcao_horaria: TimeCycleOption; 
  potencia_contratada: number; // kVA/kW
  
  // Dates
  data_inicio: string;
  data_fim: string;

  // Consumption (kWh)
  consumo_ponta: number;
  consumo_cheia: number;
  consumo_vazio: number;
  consumo_super_vazio: number;

  // Current Pricing (€/kWh)
  preco_ponta: number;
  preco_cheia: number;
  preco_vazio: number;
  preco_super_vazio: number;
  
  // Power Cost (€/day)
  preco_potencia_dia: number;

  total_fatura_com_iva: number;
  raw_text?: string;
  timestamp?: number;
}

export interface LoadShiftAnalysis {
  peakPercentage: number; 
  shiftPotentialKwh: number;
  shiftSavingsEuro: number;
  optimizedAnnualCost: number; 
}

export interface RiskAnalysis {
  profile: 'Conservador' | 'Moderado' | 'Agressivo';
  marketVolatilityExposure: 'Baixa' | 'Média' | 'Alta';
  recommendation: 'Fixar Preço' | 'Indexado Controlado' | 'Híbrido';
}

export interface TacticalMeasure {
  action: string;
  impact: string;
  difficulty: string;
  estimated_savings_pct: number;
}

export interface StrategicAnalysis {
  executive_summary: string;
  hedging_strategy: string;
  tactical_measures: TacticalMeasure[];
}

export interface AutoSwitchConfig {
  isEnabled: boolean;
  lastCheck?: string;
  potentialExtraSavings?: number;
  status: 'idle' | 'scanning' | 'found' | 'applied';
}

// FASE 9: Prescriptive Analysis Result
export interface PrescriptiveAnalysisResult {
  highestConsumptionPeriod: 'Ponta' | 'Cheia' | 'Vazio' | 'Super Vazio';
  highestCostPeriod: 'Ponta' | 'Cheia' | 'Vazio' | 'Super Vazio';
  profileEfficiencyScore: number; // 0-100%
  
  savingsProjection: {
    fixedContractSavings: number; // €
    indexContractSavings: number; // €
    bestOption: 'Fixed' | 'Indexed';
  };

  optimizationSuggestion: {
    loadShiftingViability: string; // CFO-Ready text
    estimatedReadingRisk: string;  // CFO-Ready text
    additionalServicesImpact: string; // CFO-Ready text
  };
  
  marginAnalysis: {
    appliedStrategy: 'Standard' | 'Maximum Viable Margin';
    marginPonta: number;
    marginCheia: number;
    marginVazio: number;
  }
}

// ═══════════════════════════════════════════════════════════════════
// NEW CORE ENGINES TYPES (PRODUCTION GRADE)
// ═══════════════════════════════════════════════════════════════════

export interface WattonPriceConfig {
  ponta: number;
  cheia: number;
  vazio: number;
  superVazio: number;
  powerDaily: number;
}

export interface CalculationResult {
  // Valores mensais
  currentMonthly: number;
  wattonMonthly: number;
  savingsMonthly: number;

  // Valores anuais (CANÓNICOS)
  currentAnnual: number;
  wattonAnnual: number;
  savingsAnnual: number;
  savingsPercent: number;

  // Detalhe (para auditoria)
  breakdown: {
    energyCurrent: {
      ponta: number;
      cheias: number;
      vazio: number;
      superVazio: number;
      total: number;
    };
    energyWatton: {
      ponta: number;
      cheias: number;
      vazio: number;
      superVazio: number;
      total: number;
    };
    powerCurrent: number;
    powerWatton: number;
    billingDays: number;
    annualizationFactor: number;
  };
}

export interface SimulationResult extends CalculationResult {
  // Legacy/UI Compatibility Fields
  currentAnnualCost: number; // Alias to currentAnnual
  wattonBaseCost: number; 
  wattonProposedCost: number; // Alias to wattonAnnual
  wattonMarginTotal: number;
  wattonMarginPercent: number;
  savingsTotal: number; // Alias to savingsAnnual
  
  base_ponta: number;
  base_cheia: number;
  base_vazio: number;
  base_super_vazio: number;
  base_potencia_dia: number;

  margin_ponta: number;
  margin_cheia: number;
  margin_vazio: number;
  margin_super_vazio: number;
  margin_potencia_dia: number;

  proposed_ponta: number;
  proposed_cheia: number;
  proposed_vazio: number;
  proposed_super_vazio: number;
  proposed_potencia_dia: number;

  bestMarginOpportunity: 'Ponta' | 'Cheia' | 'Vazio' | 'S. Vazio' | 'Nenhuma';
  vulnerabilityScore: number; 
  vulnerabilityLabel: 'BAIXO' | 'MÉDIO' | 'ELEVADO' | 'CRÍTICO';
  
  loadShift: LoadShiftAnalysis;
  risk: RiskAnalysis;
  
  aiInsights?: StrategicAnalysis;
  prescriptiveAnalysis?: PrescriptiveAnalysisResult;
  autoSwitch?: AutoSwitchConfig;
  
  validationMessages: string[];
}

export interface ClientRecord {
  id: string;
  data: InvoiceData;
  simulation: SimulationResult;
  createdAt: string;
}
