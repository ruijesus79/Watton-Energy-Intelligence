
import React, { useEffect, useState } from 'react';
import { InvoiceData, SimulationResult, StrategicAnalysis } from '../types';
import { generateStrategicInsight } from '../services/gemini';

interface StrategyPanelProps {
  data: InvoiceData;
  simulation: SimulationResult;
  onInsightGenerated?: (insight: StrategicAnalysis) => void;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({ data, simulation, onInsightGenerated }) => {
  const [insight, setInsight] = useState<StrategicAnalysis | null>(simulation.aiInsights || null);
  const [loading, setLoading] = useState(!simulation.aiInsights);
  const [analyzingNode, setAnalyzingNode] = useState<string>('Inicializando Orquestrador...');
  const [nodesActivated, setNodesActivated] = useState<string[]>([]);
  const [error, setError] = useState(false);

  // Simulation of "Query Fan-out" (AI checking multiple sources)
  const simulationNodes = [
    "Aceder OMIP Futures Market...",
    "Analisar Perfil de Consumo (15min)...",
    "Verificar Regulamentação ERSE 2025...",
    "Calcular Share of Efficiency...",
    "Otimizar Margem Comercial..."
  ];

  useEffect(() => {
    if (simulation.currentAnnualCost > 0 && !insight) {
      setLoading(true);
      setError(false);
      
      // Simulate Orchestration Steps visually
      let step = 0;
      const interval = setInterval(() => {
          if (step < simulationNodes.length) {
              setAnalyzingNode(simulationNodes[step]);
              setNodesActivated(prev => [...prev, simulationNodes[step]]);
              step++;
          }
      }, 800);

      generateStrategicInsight(data, simulation)
        .then(res => {
          if (res) {
             setInsight(res);
             if (onInsightGenerated) onInsightGenerated(res);
          } else {
             setError(true);
          }
        })
        .catch(() => setError(true))
        .finally(() => {
            clearInterval(interval);
            setLoading(false);
        });
        
      return () => clearInterval(interval);
    } else if (simulation.aiInsights) {
        setInsight(simulation.aiInsights);
        setLoading(false);
    }
  }, [data, simulation]);

  // Calculate Avg Price accurately
  const totalConsumption = (data.consumo_ponta + data.consumo_cheia + data.consumo_vazio + data.consumo_super_vazio) || 1;
  const avgPrice = simulation.currentAnnualCost / (totalConsumption * (365 / 30)); 
  
  // Benchmarking Logic (Share of Efficiency)
  // Se o score não vier da AI, calculamos: Poupança alta = Baixa Eficiencia Atual.
  const calcEfficiency = insight?.market_authority_score 
      ? insight.market_authority_score 
      : Math.max(0, 100 - (simulation.savingsPercent * 2)); // Heuristic fallback

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden bg-black">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 opacity-20">
             <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-watton-lime/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"></div>
        </div>
        
        {/* Central Orchestrator Node */}
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 border-2 border-watton-lime rounded-full flex items-center justify-center relative shadow-[0_0_50px_rgba(139,197,63,0.4)] bg-black">
                <div className="w-20 h-20 bg-watton-lime/10 rounded-full animate-ping absolute"></div>
                <svg className="w-10 h-10 text-watton-lime animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            
            <h3 className="text-xl font-bold text-white mt-6 tracking-tight">Watton AI Orchestrator</h3>
            <p className="text-watton-lime font-mono text-sm mt-2 animate-pulse">{analyzingNode}</p>
            
            <div className="mt-8 grid grid-cols-1 gap-2 text-center">
                {nodesActivated.map((node, i) => (
                    <span key={i} className="text-[10px] text-slate-500 font-mono transition-all duration-300 transform translate-y-0 opacity-100">
                        [OK] {node}
                    </span>
                ))}
            </div>
        </div>
      </div>
    );
  }

  if (error || !insight) {
     return (
        <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
           <p className="text-red-400">Falha na Orquestração AI.</p>
           <button onClick={() => window.location.reload()} className="mt-4 text-white text-xs underline">Tentar Novamente</button>
        </div>
     );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      
      {/* Left Column: Share of Efficiency (The Golden Metric) */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* "Share of Efficiency" Card */}
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-watton-lime bg-gradient-to-br from-slate-900 via-black to-black relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-watton-lime/10 rounded-full blur-2xl"></div>
          
          <h4 className="text-[10px] font-bold text-watton-lime uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-watton-lime rounded-full animate-pulse"></span>
             Share of Efficiency
          </h4>
          
          <div className="flex items-end justify-between mb-4">
             <div className="text-5xl font-bold text-white tracking-tighter leading-none">
                {calcEfficiency.toFixed(0)}<span className="text-2xl text-slate-500">/100</span>
             </div>
             <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase font-bold">Market Benchmark</p>
                <p className="text-xs text-white">vs. Setor {data.tensao_fornecimento}</p>
             </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
             <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-watton-lime transition-all duration-1000" style={{ width: `${calcEfficiency}%` }}></div>
          </div>
          
          <p className="text-[10px] text-slate-400 leading-tight">
             {calcEfficiency < 70 
                ? "⚠️ A sua marca está a perder competitividade energética. Otimização necessária." 
                : "✅ A sua marca lidera em eficiência energética."}
          </p>
        </div>

        {/* Orchestration Nodes (Sources) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
           <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Nós de Orquestração (AI)</h4>
           <div className="flex flex-wrap gap-2">
              {(insight.orchestration_nodes || ["OMIP Spot", "Futuros 2026", "Perfil Carga"]).map((node, i) => (
                 <span key={i} className="text-[9px] font-bold text-white bg-slate-800 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                    {node}
                 </span>
              ))}
           </div>
        </div>

      </div>

      {/* Right Column: AI Narrative */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Executive Summary AI-First */}
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden bg-black border border-slate-800">
           {/* Visual Element: Neural connections */}
           <svg className="absolute top-0 right-0 w-64 h-64 text-slate-800 opacity-20 pointer-events-none" viewBox="0 0 100 100">
              <circle cx="80" cy="20" r="2" fill="currentColor"><animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/></circle>
              <circle cx="20" cy="80" r="2" fill="currentColor"><animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite"/></circle>
              <path d="M80 20 L20 80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
           </svg>

           <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
             <svg className="w-5 h-5 text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             Análise do Orquestrador
           </h3>
           <div className="relative pl-6 border-l-2 border-watton-lime">
                <p className="text-slate-300 leading-relaxed text-justify whitespace-pre-line font-serif italic text-lg">
                    "{insight.executive_summary}"
                </p>
           </div>
           
           <div className="mt-6 pt-4 border-t border-slate-800/50 flex gap-8">
               <div>
                   <p className="text-[9px] text-slate-500 uppercase font-bold">Estratégia Detetada</p>
                   <p className="text-sm font-bold text-watton-lime">{insight.hedging_strategy}</p>
               </div>
               <div>
                   <p className="text-[9px] text-slate-500 uppercase font-bold">Futuro (2026)</p>
                   <p className="text-sm font-bold text-white">AI-First Ready</p>
               </div>
           </div>
        </div>

        {/* Tactical Actions */}
        <div>
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Ações Recomendadas (Fan-out)</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insight.tactical_measures.map((t, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-watton-lime/50 transition-all group relative overflow-hidden flex flex-col">
                   <div className="absolute top-0 left-0 w-1 h-full bg-slate-800 group-hover:bg-watton-lime transition-colors"></div>
                   
                   <div className="flex justify-between items-start mb-3 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold border border-slate-700">{idx + 1}</span>
                        <h4 className="font-bold text-white text-xs leading-tight">{t.action}</h4>
                      </div>
                   </div>
                   
                   <p className="text-xs text-slate-500 leading-relaxed pl-2 flex-grow">{t.impact}</p>
                   
                   <div className="mt-3 pl-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{t.difficulty}</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-900/20 px-2 py-0.5 rounded">-{t.estimated_savings_pct}%</span>
                   </div>
                </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};
