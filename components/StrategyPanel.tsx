
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
  const [error, setError] = useState(false);

  // Calcular Driver de Poupança para mostrar na UI enquanto a AI pensa
  const savingsDrivers = [
    { label: 'Energia Ponta', val: (data.preco_ponta - simulation.proposed_ponta) * data.consumo_ponta },
    { label: 'Energia Cheia', val: (data.preco_cheia - simulation.proposed_cheia) * data.consumo_cheia },
    { label: 'Energia Vazio', val: (data.preco_vazio - simulation.proposed_vazio) * (data.consumo_vazio + data.consumo_super_vazio) },
    { label: 'Potência', val: (data.preco_potencia_dia - simulation.proposed_potencia_dia) * 365 }
  ];
  const topDriver = savingsDrivers.sort((a, b) => b.val - a.val)[0];
  const topDriverPct = (topDriver.val / simulation.savingsTotal) * 100;

  useEffect(() => {
    // Only generate if we have a valid simulation AND we don't have insights yet
    if (simulation.currentAnnualCost > 0 && !insight) {
      setLoading(true);
      setError(false);
      
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
        .finally(() => setLoading(false));
    } else if (simulation.aiInsights) {
        setInsight(simulation.aiInsights);
        setLoading(false);
    }
  }, [data, simulation]);

  // Calculate Avg Price accurately
  const totalConsumption = (data.consumo_ponta + data.consumo_cheia + data.consumo_vazio + data.consumo_super_vazio) || 1;
  const avgPrice = simulation.currentAnnualCost / (totalConsumption * (365 / 30)); 
  const isCriticalPrice = avgPrice > 0.145;

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-watton-lime/30 border-t-watton-lime rounded-full animate-spin mb-4"></div>
        <p className="text-white font-bold animate-pulse">A Comparar Fatura vs Proposta...</p>
        <p className="text-slate-500 text-xs mt-2 text-center">
           Auditando preços unitários por período.<br/>
           Calculando spreads de rentabilidade.
        </p>
      </div>
    );
  }

  if (error || !insight) {
     return (
        <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
           <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           <h3 className="text-white font-bold mb-2">Análise Indisponível</h3>
           <button onClick={() => window.location.reload()} className="mt-4 text-watton-lime text-xs uppercase font-bold hover:underline">Recalcular</button>
        </div>
     );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      
      {/* Left Column: Data Hard Facts */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* KPI 1: Price */}
        <div className={`glass-panel p-6 rounded-2xl border-l-4 ${isCriticalPrice ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Custo Médio Efetivo</h4>
          <div className="flex justify-between items-end">
             <div>
                <p className="text-xs text-slate-400">Cliente Atual</p>
                <p className={`${isCriticalPrice ? 'text-red-400' : 'text-emerald-400'} font-bold font-mono text-lg`}>{avgPrice.toFixed(4)} €</p>
             </div>
             <div className="text-right">
                <p className="text-xs text-slate-400">Watton</p>
                <p className="text-watton-lime font-bold font-mono text-lg">{(simulation.wattonProposedCost / (totalConsumption * (365/30))).toFixed(4)} €</p>
             </div>
          </div>
        </div>

        {/* KPI 2: Savings Driver */}
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-watton-lime">
           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Principal Motor de Poupança</h4>
           <p className="text-white font-bold text-lg">{topDriver.label}</p>
           <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-watton-lime h-full" style={{ width: `${Math.min(topDriverPct, 100)}%` }}></div>
           </div>
           <p className="text-[10px] text-slate-400 mt-2">
             Representa <span className="text-white font-bold">{topDriverPct.toFixed(0)}%</span> do ganho total obtido.
           </p>
        </div>

        {/* Strategy Tag */}
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500">
           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Estratégia MIBEL</h4>
           <p className="text-slate-300 text-sm leading-relaxed text-justify mt-2">
             {insight.hedging_strategy}
           </p>
        </div>
      </div>

      {/* Right Column: Narrative & Tactics */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Executive Summary */}
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden bg-gradient-to-br from-slate-900 to-black border border-slate-800">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <svg className="w-40 h-40 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
           </div>
           <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
             Auditoria Comparativa (SmartBill™)
           </h3>
           <div className="relative pl-6 border-l-2 border-watton-lime">
                <p className="text-slate-300 leading-relaxed text-justify whitespace-pre-line font-serif italic text-lg">
                    "{insight.executive_summary}"
                </p>
           </div>
        </div>

        {/* Tactical Actions */}
        <div>
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Medidas de Otimização</h3>
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
                      <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-900/20 px-2 py-0.5 rounded">-{t.estimated_savings_pct}% OPEX</span>
                   </div>
                </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};
