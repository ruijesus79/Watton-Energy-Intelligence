
export const APP_CONFIG = {
  colors: {
    primary: '#2E5A27',
    accent: '#8BC53F',
    bg: '#0f172a',
    card: '#1e293b'
  }
};

// DADOS DE MERCADO E REGULATÓRIOS (Simulação Realista 2025)
export const MARKET_DATA = {
  // CUSTO ENERGIA PURA (OMIP + HEDGING COST + GESTÃO)
  // Valores baseados em futuros 2025 (aprox 65-75 €/MWh base load)
  energy_commodity: {
    ponta: 0.0950,      // 95 €/MWh
    cheia: 0.0780,      // 78 €/MWh
    vazio: 0.0650,      // 65 €/MWh
    super_vazio: 0.0550 // 55 €/MWh
  },
  
  // TARIFAS DE ACESSO ÀS REDES (TAR) - ERSE 2025 (Estimativa Simplificada para Demo)
  // Estas são as "Tabelas ZUG" que o motor deve consultar
  access_tariffs: {
    BTE: {
      ponta: 0.0285,
      cheia: 0.0120,
      vazio: 0.0050,
      super_vazio: 0.0020,
      potencia: 0.0150 // €/kVA/dia
    },
    BTN: {
      ponta: 0.0350,
      cheia: 0.0200,
      vazio: 0.0080,
      super_vazio: 0.0050,
      potencia: 0.0250
    },
    MT: {
      ponta: 0.0150,
      cheia: 0.0080,
      vazio: 0.0020,
      super_vazio: 0.0010,
      potencia: 0.0100
    },
    // Fallback
    BT: {
      ponta: 0.0300,
      cheia: 0.0150,
      vazio: 0.0060,
      super_vazio: 0.0030,
      potencia: 0.0200
    }
  },

  // Perdas de Rede e Custo de Sistema (CGC, etc)
  system_losses: 1.15, // 15% de perdas
  margin_min_target: 0.008 // 0.8 cêntimos/kWh de margem mínima alvo
};

export const DEFAULT_INVOICE: any = {
  nome_cliente: "",
  nif_cliente: "",
  morada_cliente: "",
  cpe: "",
  tensao_fornecimento: "BTE",
  ciclo: "Tetra-Horário",
  opcao_horaria: "Semanal", 
  potencia_contratada: 41.4,
  data_inicio: "",
  data_fim: "",
  consumo_ponta: 0,
  consumo_cheia: 0,
  consumo_vazio: 0,
  consumo_super_vazio: 0,
  preco_ponta: 0,
  preco_cheia: 0,
  preco_vazio: 0,
  preco_super_vazio: 0,
  preco_potencia_dia: 0,
  total_fatura_com_iva: 0
};
