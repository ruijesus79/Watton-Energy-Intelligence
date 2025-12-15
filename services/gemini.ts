
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { InvoiceData, StrategicAnalysis } from "../types";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found in environment.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// 1. OCR SCHEMA UPDATED (Granular Extraction)
const genAiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nome_cliente: { type: Type.STRING },
    nif_cliente: { type: Type.STRING },
    morada_cliente: { type: Type.STRING },
    cpe: { type: Type.STRING },
    
    // Technical Details
    tensao: { type: Type.STRING, enum: ["BTN", "BTE", "MT", "AT", "BT"] },
    ciclo: { type: Type.STRING, enum: ["Simples", "Bi-Horário", "Tri-Horário", "Tetra-Horário"] },
    opcao_horaria: { type: Type.STRING, enum: ["Diário", "Semanal", "Semanal c/ Feriados", "Semanal s/ Feriados"] },
    contractType: { type: Type.STRING, description: "Descrição textual completa do contrato/tarifa (ex: 'BTN Diário Tri-horário')" },
    leituraTipo: { type: Type.STRING, enum: ["Real", "Estimada", "Mista"] },
    mixProducao: { type: Type.STRING, description: "Informação sobre origem da energia (ex: '100% Renovável')" },

    // Financials & Consumption
    potencia_contratada_kva: { type: Type.NUMBER },
    preco_potencia_unitario: { type: Type.NUMBER },
    unidade_preco_potencia: { type: Type.STRING, enum: ["dia", "mes"] },
    consumo_ponta_kwh: { type: Type.NUMBER },
    consumo_cheia_kwh: { type: Type.NUMBER },
    consumo_vazio_kwh: { type: Type.NUMBER },
    consumo_super_vazio_kwh: { type: Type.NUMBER },
    preco_ponta_eur_kwh: { type: Type.NUMBER },
    preco_cheia_eur_kwh: { type: Type.NUMBER },
    preco_vazio_eur_kwh: { type: Type.NUMBER },
    preco_super_vazio_eur_kwh: { type: Type.NUMBER },
    
    // Regulated Costs (New)
    custos_regulados: {
      type: Type.OBJECT,
      properties: {
        tarifa_acesso_total: { type: Type.NUMBER, nullable: true },
        cieg_total: { type: Type.NUMBER, nullable: true },
        taxa_exploracao_total: { type: Type.NUMBER, nullable: true }
      },
      nullable: true
    },
    
    // Additional Services (New)
    servicos_adicionais: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      nullable: true
    },

    // Dates & Totals
    data_inicio: { type: Type.STRING, description: "Data de início do período de faturação (YYYY-MM-DD)" },
    data_fim: { type: Type.STRING, description: "Data de fim do período de faturação (YYYY-MM-DD)" },
    total_fatura: { type: Type.NUMBER, description: "Valor final total da fatura com IVA" }
  },
  required: ["nif_cliente", "total_fatura"]
};

// 2. STRATEGY SCHEMA (Simplified for robustness)
const insightsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    executive_summary: { type: Type.STRING },
    hedging_strategy: { type: Type.STRING },
    tactical_measures: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          impact: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          estimated_savings_pct: { type: Type.NUMBER }
        }
      }
    }
  }
};

/**
 * HEURISTIC FALLBACK ENGINE
 * Used when API quota is exhausted (429) or fails.
 */
function generateFallbackInsight(invoice: InvoiceData, simulation: any): StrategicAnalysis {
  const savingsFormatted = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(simulation.savingsTotal);
  const percentFormatted = simulation.savingsPercent.toFixed(1);
  
  const consumptions = [
      { id: 'Ponta', val: invoice.consumo_ponta },
      { id: 'Cheia', val: invoice.consumo_cheia },
      { id: 'Vazio', val: invoice.consumo_vazio + invoice.consumo_super_vazio }
  ];
  const dominant = consumptions.sort((a,b) => b.val - a.val)[0];

  return {
    executive_summary: `Auditoria Watton (Modo Analítico): Identificada oportunidade de ${savingsFormatted} (${percentFormatted}%) através da otimização de tarifário. O perfil de consumo revela elevada exposição em ${dominant.id}, mitigada pela nossa nova estrutura de preços.`,
    hedging_strategy: simulation.vulnerabilityScore > 7 
        ? "Estratégia Defensiva: Recomendamos fixar preço a 12 meses (Fixed Price Swap) para blindar o orçamento contra a volatilidade do mercado Spot." 
        : "Estratégia Híbrida: Manter indexação no Vazio para capturar baixas de mercado, com teto máximo (Cap) nas horas de Ponta.",
    tactical_measures: [
      { action: "Otimização de Potência (kVA)", impact: "Ajustar a potência contratada à carga real máxima registada.", difficulty: "Baixa", estimated_savings_pct: 2.5 },
      { action: `Desvio de Carga (${dominant.id} → Vazio)`, impact: `Transferir processos intensivos de ${dominant.id} para horas de Vazio.`, difficulty: "Média", estimated_savings_pct: 4.8 },
      { action: "Revisão Fiscal (ISP)", impact: "Auditoria à taxa de Imposto sobre Produtos Petrolíferos.", difficulty: "Alta", estimated_savings_pct: 1.2 }
    ]
  };
}

export async function processInvoiceDocument(base64Data: string, mimeType: string): Promise<Partial<InvoiceData>> {
  try {
    const ai = getAiClient();
    const prompt = `
      És um Auditor Financeiro de Energia (IQ 300).
      A tua missão é extrair dados de faturas elétricas com 100% de precisão para auditoria.

      REGRAS CRÍTICAS DE EXTRAÇÃO:
      1. PREÇOS UNITÁRIOS (€/kWh): Procura com precisão até 6 casas decimais (ex: 0.145321). Se encontrares valores arredondados, procura na tabela detalhada.
      2. DATAS (YYYY-MM-DD): Identifica claramente o início e fim do período de faturação.
      3. POTÊNCIA: Distingue "Potência Contratada" (kVA) de "Potência Tomada" (kW). Queremos a CONTRATADA.
      4. VALORES NULOS: Se um campo não estiver explícito na fatura, retorna null. Não alucines valores.
      5. TOTAIS: O total_fatura deve incluir IVA.

      Extrai para o esquema JSON fornecido.
    `;

    // Using gemini-2.5-flash for production-grade speed and cost-efficiency
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: genAiSchema,
        temperature: 0, // Zero temperature for maximum determinism
      }
    });

    if (response.text) {
      const rawData = JSON.parse(response.text);
      
      let finalPotenciaPrice = rawData.preco_potencia_unitario;
      if (rawData.unidade_preco_potencia === 'mes' && finalPotenciaPrice) {
        finalPotenciaPrice = finalPotenciaPrice / 30;
      }
      
      const nifClean = rawData.nif_cliente ? rawData.nif_cliente.replace(/\D/g, '') : "";

      return {
        // Base Data
        nome_cliente: rawData.nome_cliente || "Cliente Não Identificado",
        nif_cliente: nifClean,
        morada_cliente: rawData.morada_cliente || "",
        cpe: rawData.cpe || "",
        
        // Granular Data (New Fields)
        contractType: rawData.contractType || null,
        leituraTipo: rawData.leituraTipo || null,
        servicosAdicionais: rawData.servicos_adicionais || null,
        custosRegulados: rawData.custos_regulados ? {
            tarifaAcessoRedes: rawData.custos_regulados.tarifa_acesso_total || null,
            ciegValor: rawData.custos_regulados.cieg_total || null,
            taxaExploracao: rawData.custos_regulados.taxa_exploracao_total || null
        } : null,
        mixProducao: rawData.mixProducao || null,
        historicoConsumoMensal: null, 

        // Technical
        tensao_fornecimento: rawData.tensao || "BTE",
        ciclo: rawData.ciclo || "Tetra-Horário",
        opcao_horaria: rawData.opcao_horaria || "Semanal",
        potencia_contratada: rawData.potencia_contratada_kva || 0,
        preco_potencia_dia: finalPotenciaPrice || 0,
        
        // Consumptions & Prices
        consumo_ponta: rawData.consumo_ponta_kwh || 0,
        consumo_cheia: rawData.consumo_cheia_kwh || 0,
        consumo_vazio: rawData.consumo_vazio_kwh || 0,
        consumo_super_vazio: rawData.consumo_super_vazio_kwh || 0,
        preco_ponta: rawData.preco_ponta_eur_kwh || 0,
        preco_cheia: rawData.preco_cheia_eur_kwh || 0,
        preco_vazio: rawData.preco_vazio_eur_kwh || 0,
        preco_super_vazio: rawData.preco_super_vazio_eur_kwh || 0,
        
        data_inicio: rawData.data_inicio || new Date().toISOString().split('T')[0],
        data_fim: rawData.data_fim || new Date().toISOString().split('T')[0],
        total_fatura_com_iva: rawData.total_fatura || 0,
        raw_text: "Extração Certificada via Gemini 2.5 (Watton Core)"
      };
    }
    return {};
  } catch (error: any) {
    console.error("OCR Failure:", error);
    if (error.status === 429 || error.code === 429 || (error.message && error.message.includes('quota'))) {
         return { raw_text: "⚠️ Limite de IA atingido. Por favor insira os dados da fatura manualmente." };
    }
    return { raw_text: "Falha na leitura automática. Verifique a qualidade da imagem." }; 
  }
}

export async function generateStrategicInsight(invoice: InvoiceData, simulation: any): Promise<StrategicAnalysis | null> {
    try {
        const ai = getAiClient();
        if (!simulation || simulation.currentAnnualCost === 0) {
            return generateFallbackInsight(invoice, simulation);
        }

        const prompt = `
          Atua como CFO Advisor e Estrategista de Mercado (Watton Energy).
          Analisa a fatura de "${invoice.nome_cliente}" vs Proposta Watton.
          
          DADOS FINANCEIROS:
          - Custo Atual (Anual): ${simulation.currentAnnualCost.toFixed(0)}€
          - Poupança Total (Anual): ${simulation.savingsTotal.toFixed(0)}€ (${simulation.savingsPercent.toFixed(1)}%)
          - Score Vulnerabilidade: ${simulation.vulnerabilityLabel}
          
          OBJETIVO:
          Gera um relatório executivo curto e direto que justifique a mudança para a Watton.
          
          OUTPUT JSON (Português PT):
          1. executive_summary: Resumo financeiro percutante do risco atual vs oportunidade (max 40 palavras).
          2. hedging_strategy: Recomenda FIXO se vulnerabilidade for ALTA, ou INDEXADO se BAIXA. Explica o porquê com base no perfil de consumo.
          3. tactical_measures: 3 ações táticas (ex: Ajuste Potência, Load Shifting, Auditoria Fiscal).
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // Keeping consistent with Flash for speed unless Pro is explicitly needed for reasoning depth
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: insightsSchema,
            temperature: 0.2, 
          }
        });

        if (response.text) {
          return JSON.parse(response.text) as StrategicAnalysis;
        }
        return generateFallbackInsight(invoice, simulation);
    } catch (error: any) {
        if (error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
            console.warn("⚠️ API Quota limit reached for Strategy Generation. Using heuristic fallback.");
            return generateFallbackInsight(invoice, simulation);
        }
        
        console.error("Strategy Insight Error (Non-Quota):", error);
        return generateFallbackInsight(invoice, simulation);
    }
}
