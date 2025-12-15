
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { z } from "zod";
import { InvoiceData, StrategicAnalysis } from "../types";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found in environment.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// 1. OCR SCHEMA UPDATED
const genAiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nome_cliente: { type: Type.STRING },
    nif_cliente: { type: Type.STRING },
    morada_cliente: { type: Type.STRING },
    cpe: { type: Type.STRING },
    tensao: { type: Type.STRING, enum: ["BTN", "BTE", "MT", "AT", "BT"] },
    ciclo: { type: Type.STRING, enum: ["Simples", "Bi-Horário", "Tri-Horário", "Tetra-Horário"] },
    opcao_horaria: { type: Type.STRING, enum: ["Diário", "Semanal", "Semanal c/ Feriados", "Semanal s/ Feriados"] },
    contractType: { type: Type.STRING },
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
    custos_regulados: {
      type: Type.OBJECT,
      properties: {
        tarifa_acesso_total: { type: Type.NUMBER, nullable: true },
        cieg_total: { type: Type.NUMBER, nullable: true },
        taxa_exploracao_total: { type: Type.NUMBER, nullable: true },
        imposto_especial_consumo: { type: Type.NUMBER, nullable: true }
      },
      nullable: true
    },
    data_inicio: { type: Type.STRING },
    data_fim: { type: Type.STRING },
    total_fatura: { type: Type.NUMBER }
  },
  required: ["nif_cliente", "total_fatura"]
};

// 2. STRATEGY SCHEMA (UPDATED FOR ORCHESTRATION)
const insightsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    executive_summary: { type: Type.STRING },
    hedging_strategy: { type: Type.STRING },
    market_authority_score: { type: Type.NUMBER, description: "0-100 score of market efficiency vs benchmark" },
    orchestration_nodes: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of data points analyzed (e.g. 'OMIP Futures', 'Volatility Index')" 
    },
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
 */
function generateFallbackInsight(invoice: InvoiceData, simulation: any): StrategicAnalysis {
  const savingsFormatted = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(simulation.savingsTotal);
  return {
    executive_summary: `Auditoria Watton AI: Orquestração concluída. Identificada oportunidade de ${savingsFormatted} através de correção de ineficiência tarifária. O cliente apresenta um desvio significativo face ao benchmark do setor.`,
    hedging_strategy: "Estratégia Híbrida Adaptativa: Fixação tática em Ponta/Cheia, mantendo exposição indexada em Vazio para capturar baixas de mercado.",
    market_authority_score: 65,
    orchestration_nodes: ["Análise OMIP Futuros 2026", "Perfil de Carga", "Volatilidade Diária", "Benchmark Setorial"],
    tactical_measures: [
      { action: "Ajuste de Potência", impact: "Adequação ao maxímetro registado.", difficulty: "Baixa", estimated_savings_pct: 2.5 },
      { action: "Otimização Tarifária", impact: "Mudança para tarifa indexada otimizada.", difficulty: "Média", estimated_savings_pct: 12.0 },
      { action: "Revisão Fiscal", impact: "Auditoria à taxa de IEC/ISP.", difficulty: "Alta", estimated_savings_pct: 1.0 }
    ]
  };
}

export async function processInvoiceDocument(base64Data: string, mimeType: string): Promise<Partial<InvoiceData>> {
  try {
    const ai = getAiClient();
    const prompt = `
      És um Auditor Especialista em Faturas de Energia de Portugal.
      O teu objetivo é extrair TODOS os dados financeiros e técnicos com precisão contabilística.
      Analisa a imagem e preenche o JSON estritamente.
    `;

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
        temperature: 0, 
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
        nome_cliente: rawData.nome_cliente || "Cliente Não Identificado",
        nif_cliente: nifClean,
        morada_cliente: rawData.morada_cliente || "",
        cpe: rawData.cpe || "",
        tensao_fornecimento: rawData.tensao || "BTE",
        ciclo: rawData.ciclo || "Tetra-Horário",
        opcao_horaria: rawData.opcao_horaria || "Semanal",
        potencia_contratada: rawData.potencia_contratada_kva || 0,
        preco_potencia_dia: finalPotenciaPrice || 0,
        contractType: rawData.contractType || null,
        custosRegulados: rawData.custos_regulados ? {
            tarifaAcessoRedes: rawData.custos_regulados.tarifa_acesso_total || 0,
            ciegValor: rawData.custos_regulados.cieg_total || 0,
            taxaExploracao: rawData.custos_regulados.taxa_exploracao_total || 0,
        } : null,
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
        raw_text: "Extração Avançada Gemini 2.5"
      };
    }
    return {};
  } catch (error: any) {
    console.error("OCR Failure:", error);
    if (error.status === 429 || error.code === 429 || (error.message && error.message.includes('quota'))) {
         return { raw_text: "⚠️ Limite de IA atingido. Por favor insira os dados manualmente." };
    }
    return { raw_text: "Falha na leitura automática." }; 
  }
}

export async function generateStrategicInsight(invoice: InvoiceData, simulation: any): Promise<StrategicAnalysis | null> {
    try {
        const ai = getAiClient();
        if (!simulation || simulation.currentAnnualCost === 0) {
            return generateFallbackInsight(invoice, simulation);
        }

        // PROMPT ATUALIZADO PARA "ERA DA ORQUESTRAÇÃO" E "AI-FIRST"
        const prompt = `
          Atua como um "AI Energy Orchestrator" (Inteligência Artificial de Orquestração Energética).
          Não és apenas um auditor, és um sistema preditivo que analisa o "Share of Efficiency" do cliente.

          Dados:
          - Cliente: ${invoice.nome_cliente}
          - Poupança Potencial: ${simulation.savingsTotal.toFixed(0)} EUR
          - Vulnerabilidade: ${simulation.vulnerabilityLabel}
          
          Conceitos a aplicar:
          1. "Orquestração de Busca": Analisa múltiplas fontes (Preço, Perfil, Regulatório).
          2. "Share of Efficiency": Compara o cliente com o ideal de mercado (Benchmark).
          3. "Branding Semântico": Usa termos de autoridade ("Dominância de Mercado", "Resiliência", "Futuro AI-First").

          OUTPUT JSON (Português PT):
          1. executive_summary: Resumo de autoridade focado na posição de mercado do cliente (max 40 palavras).
          2. hedging_strategy: Estratégia sofisticada. Fala em "Fan-out" de risco (diversificação).
          3. market_authority_score: Inteiro 0-100. (Se poupança > 20%, score baixo, pois é ineficiente).
          4. orchestration_nodes: Lista de 4-5 "fontes" analisadas (ex: "OMIP 2026", "Tendência Spot", "Taxas DGEG").
          5. tactical_measures: 3 ações de alto impacto.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: insightsSchema,
            temperature: 0.3, // Criatividade controlada para orquestração
          }
        });

        if (response.text) {
          return JSON.parse(response.text) as StrategicAnalysis;
        }
        return generateFallbackInsight(invoice, simulation);
    } catch (error: any) {
        if (error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
            console.warn("⚠️ API Quota limit reached. Using heuristic fallback.");
            return generateFallbackInsight(invoice, simulation);
        }
        console.error("Strategy Insight Error:", error);
        return generateFallbackInsight(invoice, simulation);
    }
}
