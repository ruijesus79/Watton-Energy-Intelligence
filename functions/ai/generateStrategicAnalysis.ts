
import { GoogleGenAI } from "@google/genai";
import { InvoiceData, SimulationResult, StrategicAnalysis } from "../../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * CLOUD FUNCTION: generateStrategicAnalysis (Engine v3.0 - Comparative Auditor)
 * 
 * Objetivo: Comparar a fatura atual com a proposta Watton ao nível do cêntimo e período horário.
 * Persona: Auditor Financeiro de Energia & Estrategista de Mercado.
 */
export const generateStrategicAnalysis = async (
  simulation: SimulationResult, 
  client: InvoiceData
): Promise<StrategicAnalysis | null> => {
  
  try {
    // 1. DATA PRE-PROCESSING (Load Profile)
    const totalConsumo = client.consumo_ponta + client.consumo_cheia + client.consumo_vazio + client.consumo_super_vazio;
    if (totalConsumo <= 0) return null;

    const mix = {
      ponta: (client.consumo_ponta / totalConsumo) * 100,
      cheia: (client.consumo_cheia / totalConsumo) * 100,
      vazio: (client.consumo_vazio / totalConsumo) * 100,
      super_vazio: (client.consumo_super_vazio / totalConsumo) * 100
    };

    // 2. DIFFERENTIAL ANALYSIS (Savings Drivers)
    // Onde é que estamos a ganhar dinheiro exatamente?
    const savings = {
      ponta: (client.preco_ponta - simulation.proposed_ponta) * client.consumo_ponta,
      cheia: (client.preco_cheia - simulation.proposed_cheia) * client.consumo_cheia,
      vazio: (client.preco_vazio - simulation.proposed_vazio) * client.consumo_vazio,
      super_vazio: (client.preco_super_vazio - simulation.proposed_super_vazio) * client.consumo_super_vazio,
      potencia: (client.preco_potencia_dia - simulation.proposed_potencia_dia) * 365
    };

    // Encontrar o "Hero Driver" (Onde poupamos mais)
    const drivers = [
        { id: 'Energia em Ponta', val: savings.ponta },
        { id: 'Energia em Cheia', val: savings.cheia },
        { id: 'Energia em Vazio', val: savings.vazio },
        { id: 'Potência Contratada', val: savings.potencia }
    ];
    const topDriver = drivers.sort((a, b) => b.val - a.val)[0];

    // Encontrar o "Pain Point" (Onde o cliente gasta mais volume atualmente)
    const volumeDrivers = [
        { id: 'Ponta', val: mix.ponta },
        { id: 'Cheia', val: mix.cheia },
        { id: 'Vazio', val: mix.vazio + mix.super_vazio }
    ];
    const mainConsumptionPeriod = volumeDrivers.sort((a, b) => b.val - a.val)[0];

    // Análise de Preço Unitário (Spread)
    // Qual o período com maior redução de tarifa unitária?
    const spreads = [
       { id: 'Ponta', val: client.preco_ponta - simulation.proposed_ponta },
       { id: 'Cheia', val: client.preco_cheia - simulation.proposed_cheia },
       { id: 'Vazio', val: client.preco_vazio - simulation.proposed_vazio }
    ];
    const bestRateReduction = spreads.sort((a, b) => b.val - a.val)[0];

    // 3. PROMPT ENGINEERING (Auditor Mode)
    const prompt = `
      Atua como um Auditor de Energia e Estrategista Financeiro (IQ 350).
      Tens de analisar a eficiência da proposta Watton face à fatura atual do cliente.

      DADOS DO CLIENTE & PERFIL:
      - Cliente: ${client.nome_cliente} (${client.tensao_fornecimento})
      - Perfil de Consumo: Focado em ${mainConsumptionPeriod.id} (${mainConsumptionPeriod.val.toFixed(0)}% do volume total).
      - Vulnerabilidade Atual: ${simulation.vulnerabilityLabel} (Score: ${simulation.vulnerabilityScore}/10).

      COMPARAÇÃO FINANCEIRA (A Verdade dos Números):
      1. Ponta: Cliente paga ${client.preco_ponta.toFixed(4)}€ vs Proposta ${simulation.proposed_ponta.toFixed(4)}€ (Spread: ${spreads[0].val.toFixed(4)}€).
      2. Cheia: Cliente paga ${client.preco_cheia.toFixed(4)}€ vs Proposta ${simulation.proposed_cheia.toFixed(4)}€.
      3. Vazio: Cliente paga ${client.preco_vazio.toFixed(4)}€ vs Proposta ${simulation.proposed_vazio.toFixed(4)}€.
      
      PRINCIPAL MOTOR DE POUPANÇA (O "Why"):
      - A maior fatia da poupança (${simulation.savingsTotal.toFixed(0)}€/ano) vem de: ${topDriver.id} (Impacto de ~${topDriver.val.toFixed(0)}€).
      
      OBJETIVO:
      Gera uma análise executiva que explique PORQUE é que a proposta é melhor, cruzando o perfil de consumo com a redução de preços.

      INSTRUÇÕES JSON:
      1. 'executive_summary': Explica a sinergia entre o consumo do cliente e a descida de preço.
         Exemplo: "Sendo um cliente com ${mainConsumptionPeriod.val.toFixed(0)}% de consumo em ${mainConsumptionPeriod.id}, a nossa redução agressiva de tarifa neste período gera 60% da poupança total, corrigindo a ineficiência contratual atual."
      
      2. 'hedging_strategy':
         - Se o cliente consome muito em Cheia/Ponta, fala em mitigar volatilidade diurna.
         - Se o preço atual é muito alto (>0.15), fala em "Correção de Spread Excessivo".

      3. 'tactical_measures': 3 ações.
         - Ação 1 deve ser sobre o período de maior consumo (${mainConsumptionPeriod.id}).
         - Ação 2 sobre a Potência (se houver poupança lá) ou Otimização Fiscal.

      OUTPUT: JSON válido apenas.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            executive_summary: { type: "STRING" },
            hedging_strategy: { type: "STRING" },
            tactical_measures: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  action: { type: "STRING" },
                  impact: { type: "STRING" },
                  difficulty: { type: "STRING" },
                  estimated_savings_pct: { type: "NUMBER" }
                }
              }
            }
          }
        },
        temperature: 0.25 // Preciso e Analítico
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as StrategicAnalysis;
    }
    
    return null;

  } catch (error) {
    console.error("Critical Strategy Error:", error);
    return null; 
  }
};
