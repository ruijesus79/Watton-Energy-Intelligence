
import React, { useState, useEffect } from 'react';
import { InvoiceData, SimulationResult, StrategicAnalysis } from '../types';
import { generateStrategicInsight } from '../services/gemini';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface ReportPreviewProps {
  data: InvoiceData;
  simulation: SimulationResult;
  onBack: () => void;
}

// Helper para formatar moeda
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
const formatPrice = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(val);

export const ReportPreview: React.FC<ReportPreviewProps> = ({ data, simulation, onBack }) => {
  const [insights, setInsights] = useState<StrategicAnalysis | null>(simulation.aiInsights || null);
  const [loading, setLoading] = useState(!simulation.aiInsights);
  const [omipData, setOmipData] = useState<any[]>([]);
  
  useEffect(() => {
    // 1. Configurar nome do ficheiro para "Guardar como PDF"
    const prevTitle = document.title;
    const dateStr = new Date().toISOString().split('T')[0];
    const cleanName = data.nome_cliente.replace(/[^a-zA-Z0-9]/g, '_');
    document.title = `WATTON_Relatorio_Vulnerabilidade_${cleanName}_${dateStr}`;

    // 2. Generate simple chart data for visualization
    const points = [];
    let currentPrice = 65.50;
    for (let i = 0; i < 40; i++) {
        currentPrice = Math.max(40, currentPrice + (Math.random() - 0.5) * 8);
        points.push({ name: i, price: currentPrice, avg: 60 });
    }
    setOmipData(points);

    if (!simulation.aiInsights) {
        generateStrategicInsight(data, simulation).then(result => {
          setInsights(result);
          setLoading(false);
        });
    } else {
        setLoading(false);
    }

    // Cleanup title on unmount
    return () => {
        document.title = prevTitle;
    };
  }, [data, simulation]);

  // --- CALCULATION FOR CONSUMPTION WHEEL ---
  const totalConsumption = data.consumo_ponta + data.consumo_cheia + data.consumo_vazio + data.consumo_super_vazio || 1;
  const segments = [
      { id: 'Ponta', val: data.consumo_ponta, color: '#ef4444', labelColor: '#fff' }, // Red
      { id: 'Cheia', val: data.consumo_cheia, color: '#f97316', labelColor: '#fff' }, // Orange
      { id: 'Vazio', val: data.consumo_vazio, color: '#8BC53F', labelColor: '#000' }, // Lime
      { id: 'S. Vazio', val: data.consumo_super_vazio, color: '#2E5A27', labelColor: '#fff' } // Green
  ].filter(s => s.val > 0);

  // Calculate SVG Pie Segments
  let accumulatedPercent = 0;
  const wheelData = segments.map(seg => {
      const percent = seg.val / totalConsumption;
      const startAngle = accumulatedPercent * 360;
      const endAngle = (accumulatedPercent + percent) * 360;
      
      // Calculate path (Donut Slice)
      // Converting polar to cartesian
      const getCoords = (percent: number, radius: number) => {
          const x = Math.cos(2 * Math.PI * percent);
          const y = Math.sin(2 * Math.PI * percent);
          return [x * radius, y * radius];
      };

      // Since we rotate -90deg via CSS/SVG transform, 0 is at top.
      const cumulative = accumulatedPercent; 
      const nextCumulative = accumulatedPercent + percent;

      // Stroke Dasharray Method (Simpler for Donuts)
      // Circumference of r=16 (approx 100 units) -> C = 2*PI*16 = 100.53
      const radius = 15.9155; // This radius makes C = 100 exactly
      const dashArray = `${percent * 100} 100`;
      const dashOffset = -accumulatedPercent * 100;
      
      // Label Position (Middle of segment)
      const midAngle = (cumulative + percent / 2) * 2 * Math.PI - (Math.PI / 2); // -90deg offset
      const labelR = 26; // Distance from center
      const labelX = 50 + labelR * Math.cos(midAngle);
      const labelY = 50 + labelR * Math.sin(midAngle);

      accumulatedPercent += percent;

      return {
          ...seg,
          percent,
          dashArray,
          dashOffset,
          labelX,
          labelY,
          isSmall: percent < 0.05 // Hide label if too small
      };
  });

  const score = simulation.vulnerabilityScore; // 0 to 10

  return (
    <div className="min-h-screen bg-neutral-900 flex justify-center py-8 px-4 overflow-auto font-sans">
      
      {/* Floating Action Bar - PDF SAVE ACTION */}
      <div className="fixed top-6 right-6 flex flex-col gap-3 z-50 no-print animate-slide-in">
        <button 
          onClick={() => window.print()} 
          className="bg-[#8BC53F] hover:bg-[#7ab035] text-black font-bold py-3 px-6 rounded-full shadow-[0_0_20px_rgba(139,197,63,0.3)] transition-all flex items-center justify-center gap-3 group border border-[#8BC53F]"
          title="Guardar como PDF"
        >
           <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
           <span className="uppercase tracking-wider text-xs">Guardar PDF</span>
        </button>
        <button 
          onClick={onBack} 
          className="bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded-full shadow-xl transition-all flex items-center justify-center border border-neutral-600 self-end"
          title="Voltar à Simulação"
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="w-[210mm] bg-white text-black shadow-2xl flex flex-col print:shadow-none print:w-full print:m-0 print:absolute print:top-0 print:left-0">
        
        {/* ========================================== */}
        {/* PÁGINA 1: RELATÓRIO DE VULNERABILIDADE    */}
        {/* ========================================== */}
        <div className="min-h-[297mm] relative flex flex-col p-[12mm] break-after-page">
            
            {/* 1. Header */}
            <header className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
               <div className="flex flex-col">
                  {/* Watton Logo Simulation */}
                  <div className="text-5xl font-bold tracking-tighter leading-none text-[#2E5A27] flex items-baseline">
                     watton<span className="text-[#8BC53F] text-6xl leading-none">.</span>
                  </div>
                  <div className="text-[9px] tracking-[0.45em] uppercase text-neutral-800 mt-1 pl-1 font-medium">energy consulting</div>
               </div>
               <div className="text-right">
                  <h1 className="text-3xl font-bold text-[#2E5A27] uppercase leading-[0.9]">RELATÓRIO DE<br/><span className="text-black">VULNERABILIDADE</span></h1>
                  <p className="text-[9px] text-neutral-500 font-bold tracking-[0.2em] uppercase mt-2">ENERGY INTELLIGENCE PLATFORM</p>
               </div>
            </header>

            {/* 2. Identificação & Consumption Wheel */}
            <div className="grid grid-cols-12 gap-8 mb-8">
               <div className="col-span-8">
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4 border-b border-gray-200 pb-1">Identificação</h3>
                   
                   <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                         <p className="text-[9px] uppercase text-neutral-400 font-bold mb-0.5">Empresa</p>
                         <p className="text-lg font-bold text-black uppercase leading-tight">{data.nome_cliente}</p>
                      </div>
                      <div>
                         <p className="text-[9px] uppercase text-neutral-400 font-bold mb-0.5">NIF / Contribuinte</p>
                         <p className="text-lg font-bold text-black">{data.nif_cliente}</p>
                      </div>
                      
                      <div className="col-span-2 grid grid-cols-4 gap-4">
                         <div className="col-span-1">
                            <p className="text-[9px] uppercase text-neutral-400 font-bold mb-0.5">CPE</p>
                            <p className="text-xs font-bold text-black bg-gray-100 px-2 py-1 rounded border border-gray-200 inline-block">{data.cpe}</p>
                         </div>
                         <div>
                            <p className="text-[9px] uppercase text-neutral-400 font-bold mb-0.5">Tensão</p>
                            <p className="font-bold text-sm">{data.tensao_fornecimento}</p>
                         </div>
                         <div>
                            <p className="text-[9px] uppercase text-neutral-400 font-bold mb-0.5">Horário</p>
                            <p className="font-bold text-sm">{data.ciclo}</p>
                         </div>
                         <div>
                            <p className="text-[9px] uppercase text-neutral-400 font-bold mb-0.5">Potência</p>
                            <p className="font-bold text-sm bg-gray-100 px-2 rounded inline-block">{data.potencia_contratada} kVA</p>
                         </div>
                      </div>
                   </div>
               </div>

               <div className="col-span-4 flex flex-col items-center justify-center relative">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 w-full text-center mb-2">Perfil de Consumo</h3>
                    
                    {/* CONSUMPTION WHEEL (SVG DONUT) */}
                    <div className="relative w-40 h-40">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                           {/* Base Circle */}
                           <circle cx="50" cy="50" r="15.9155" fill="none" stroke="#f3f4f6" strokeWidth="18" />
                           
                           {/* Segments */}
                           {wheelData.map((seg, i) => (
                               <circle 
                                  key={i}
                                  cx="50" 
                                  cy="50" 
                                  r="15.9155" 
                                  fill="none" 
                                  stroke={seg.color} 
                                  strokeWidth="18" 
                                  strokeDasharray={seg.dashArray}
                                  strokeDashoffset={seg.dashOffset}
                                  className="print-color-adjust-exact"
                               />
                           ))}
                        </svg>

                        {/* Labels Overlay (Absolute positioning over SVG to handle text better) */}
                        <div className="absolute inset-0 pointer-events-none">
                            {wheelData.map((seg, i) => !seg.isSmall && (
                                <div 
                                    key={i}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold"
                                    style={{ 
                                        left: `${seg.labelX}%`, 
                                        top: `${seg.labelY}%`,
                                        color: seg.color === '#8BC53F' ? 'black' : seg.color // Contrast for Lime
                                    }}
                                >
                                    {(seg.percent * 100).toFixed(0)}%
                                </div>
                            ))}
                        </div>

                        {/* Center Info (Risk Score) */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                             <span className="text-3xl font-bold tracking-tighter leading-none">{score.toFixed(1)}</span>
                             <span className={`text-[7px] font-bold uppercase tracking-wider ${score > 7 ? 'text-red-500' : score > 4 ? 'text-amber-500' : 'text-[#8BC53F]'}`}>
                                Risco {simulation.vulnerabilityLabel}
                             </span>
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-2 mt-2 px-2">
                        {wheelData.map((seg, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }}></div>
                                <span className="text-[8px] font-bold uppercase text-gray-500">{seg.id}</span>
                            </div>
                        ))}
                    </div>
               </div>
            </div>

            {/* 3. Tabela Económica */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-black">Análise Económica Detalhada</h3>
                    <span className="text-[9px] text-gray-400 uppercase">Valores sem IVA</span>
                </div>
                
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-black text-white h-10">
                            <th className="px-4 text-left uppercase text-[10px] tracking-wider font-bold w-[30%]">Período Horário</th>
                            <th className="px-4 text-right uppercase text-[10px] tracking-wider font-bold w-[20%]">Consumo (kWh)</th>
                            <th className="px-4 text-right uppercase text-[10px] tracking-wider font-bold w-[15%]">Preço Atual (€)</th>
                            <th className="px-4 text-right uppercase text-[10px] tracking-wider font-bold w-[20%] bg-[#2E5A27] print:bg-[#2E5A27]">Preço Watton (€)</th>
                            <th className="px-4 text-right uppercase text-[10px] tracking-wider font-bold w-[15%] bg-[#8BC53F] text-black print:bg-[#8BC53F]">Poupança (€)</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {[
                            { l: 'Ponta', c: data.consumo_ponta, p1: data.preco_ponta, p2: simulation.proposed_ponta },
                            { l: 'Cheias', c: data.consumo_cheia, p1: data.preco_cheia, p2: simulation.proposed_cheia },
                            { l: 'Vazio', c: data.consumo_vazio, p1: data.preco_vazio, p2: simulation.proposed_vazio },
                            { l: 'Super Vazio', c: data.consumo_super_vazio, p1: data.preco_super_vazio, p2: simulation.proposed_super_vazio },
                        ].map((row, idx) => (
                             <tr key={idx} className="border-b border-gray-200 h-9">
                                <td className="px-4 font-bold text-gray-800">{row.l}</td>
                                <td className="px-4 text-right font-medium text-gray-600">{row.c > 0 ? row.c.toLocaleString('pt-PT') : '0'}</td>
                                <td className="px-4 text-right font-bold text-gray-800">{formatPrice(row.p1)}</td>
                                <td className="px-4 text-right font-bold text-[#2E5A27] bg-[#f0fdf4] print:bg-[#f0fdf4]">{formatPrice(row.p2)}</td>
                                <td className="px-4 text-right font-bold bg-[#f7fee7] print:bg-[#f7fee7]">
                                    {row.c > 0 ? `+${((row.p1 - row.p2)*row.c).toFixed(2)}` : '0,00'}
                                </td>
                            </tr>
                        ))}
                         <tr className="bg-gray-50 border-b border-gray-200 h-10">
                                <td className="px-4 font-bold text-gray-800">Potência ({data.potencia_contratada} kVA)</td>
                                <td className="px-4 text-right text-gray-400 text-[10px]">30 dias</td>
                                <td className="px-4 text-right font-bold text-gray-800">{formatPrice(data.preco_potencia_dia)} <span className="text-[9px] font-normal text-gray-500">/dia</span></td>
                                <td className="px-4 text-right font-bold text-[#2E5A27] bg-[#f0fdf4] print:bg-[#f0fdf4]">{formatPrice(simulation.proposed_potencia_dia)} <span className="text-[9px] font-normal text-gray-500">/dia</span></td>
                                <td className="px-4 text-right font-bold bg-[#f7fee7] print:bg-[#f7fee7]">
                                    {((data.preco_potencia_dia - simulation.proposed_potencia_dia) * 30).toFixed(2)}
                                </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 4. KPI Boxes */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {/* Box 1 */}
                <div className="border border-gray-200 p-4 flex flex-col items-center justify-center min-h-[100px]">
                    <p className="text-[9px] uppercase font-bold text-gray-400 mb-2">Fatura Atual (Mensal)</p>
                    <p className="text-2xl font-bold text-gray-800 tracking-tight">{(simulation.currentAnnualCost / 12).toFixed(2)} €</p>
                </div>
                {/* Box 2 */}
                <div className="border border-[#8BC53F] bg-[#fcfef9] print:bg-[#fcfef9] p-4 flex flex-col items-center justify-center min-h-[100px]">
                    <p className="text-[9px] uppercase font-bold text-[#6a9e25] mb-2">Poupança Mensal</p>
                    <p className="text-2xl font-bold text-black tracking-tight">+{simulation.savingsMonthly.toFixed(2)} €</p>
                </div>
                {/* Box 3 */}
                <div className="bg-[#8BC53F] p-4 flex flex-col items-center justify-center text-black print:bg-[#8BC53F] min-h-[100px]">
                    <p className="text-[9px] uppercase font-bold text-black/60 mb-2">Poupança Anual Est.</p>
                    <p className="text-3xl font-bold text-black tracking-tight">+{simulation.savingsTotal.toFixed(2)} €</p>
                </div>
                {/* Box 4 */}
                <div className="bg-[#2E5A27] p-4 flex flex-col items-center justify-center text-white relative overflow-hidden print:bg-[#2E5A27] min-h-[100px]">
                    <div className="absolute top-0 right-0 text-[9px] font-bold bg-white/20 px-2 py-1 rounded-bl text-white">
                        -{Math.abs(simulation.savingsPercent).toFixed(1)}%
                    </div>
                    <p className="text-[9px] uppercase font-bold text-white/60 mb-2">Nova Fatura (Mensal)</p>
                    <p className="text-2xl font-bold text-white tracking-tight">{(simulation.wattonProposedCost / 12).toFixed(2)} €</p>
                </div>
            </div>

            {/* 5. Estratégia */}
            <div className="mb-8">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-[#8BC53F]"></div>
                    <h3 className="text-xs font-bold uppercase text-[#2E5A27]">Estratégia Recomendada</h3>
                 </div>
                 <p className="text-[11px] text-gray-700 leading-relaxed text-justify">
                    A Watton propõe a estratégia <span className="font-bold">'Watton Móvel 12 Meses'</span>, um modelo de hedging sofisticado que bloqueia o preço da energia nas horas de maior volatilidade, nomeadamente nos períodos de Ponta e Cheias. Esta abordagem protege a {data.nome_cliente} contra picos de preço, enquanto permite o aproveitamento de oportunidades de mercado nas horas de Vazio, onde os preços são tipicamente mais favoráveis. O resultado é uma previsibilidade orçamental reforçada, com a garantia de que os custos de energia se mantêm dentro de parâmetros controlados, independentemente das oscilações do mercado.
                 </p>
            </div>

            {/* 6. Portfólio Footer (Services) */}
            <div className="mt-auto">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                    <h4 className="text-[10px] font-bold uppercase text-[#2E5A27]">Portfólio Watton: <span className="text-gray-400 font-normal normal-case">Soluções de Otimização e Sustentabilidade</span></h4>
                    <span className="text-[8px] uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Serviços Premium</span>
                </div>
                <div className="grid grid-cols-4 gap-6">
                    {[
                        { t: "1. Hedging Energético", d: "Transforme a volatilidade em vantagem competitiva. Modelos de compra dinâmica com tetos de preço." },
                        { t: "2. Soluções de Carbono & ESG", d: "Apoio integral ao cumprimento da diretiva CSRD. Análise de Pegada de Carbono (Escopos 1, 2 e 3)." },
                        { t: "3. Cartões Frota & Mobilidade", d: "Plataforma unificada (BP, Prio, Shell). Telemetria GPS e gestão de portagens europeias." },
                        { t: "4. Roteiro de Descarbonização", d: "Definição estratégica rumo à neutralidade carbónica (Net Zero), alinhada com Science Based Targets." }
                    ].map((s, i) => (
                        <div key={i}>
                            <h5 className="text-[9px] font-bold text-[#8BC53F] mb-1 uppercase">{s.t}</h5>
                            <p className="text-[8px] text-gray-500 leading-tight">{s.d}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Bar */}
            <div className="absolute bottom-10 left-[12mm] right-[12mm] flex items-end justify-between border-t-2 border-[#e5e5e5] pt-4">
                 <div className="bg-gray-200 px-3 py-1 font-bold text-gray-500 uppercase text-xs">Watton</div>
                 <div className="text-[8px] text-gray-400 text-right leading-tight">
                    <span className="font-bold text-[#2E5A27] uppercase">Watton Energy Consulting</span><br/>
                    Rua Professor Manuel Baganha 283<br/>
                    Lj. A | 4350-009 Porto
                 </div>
                 <div className="text-[8px] text-gray-400 text-right leading-tight">
                    T: +351 225 500 632<br/>
                    E: geral@wattonenergy.pt<br/>
                    www.wattonenergy.pt
                 </div>
            </div>
        </div>

        {/* ========================================== */}
        {/* PÁGINA 2: CONTEXTO DE MERCADO             */}
        {/* ========================================== */}
        <div className="min-h-[297mm] relative flex flex-col p-[12mm] break-after-page bg-white">
            
             {/* Header Page 2 */}
             <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-8">
                 <h2 className="text-xl font-bold uppercase text-black">Contexto de Mercado</h2>
                 <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Data Intelligence</p>
             </div>

             {/* Chart 1: Histórico */}
             <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                 <div className="flex items-center gap-2 mb-6 border-l-4 border-[#8BC53F] pl-3">
                     <h3 className="font-bold uppercase text-xs text-black tracking-wider">Histórico do Mercado Grossista</h3>
                 </div>
                 
                 <div className="grid grid-cols-12 gap-8">
                     {/* Sidebar Table */}
                     <div className="col-span-3 space-y-4">
                        <div className="flex gap-2 mb-4">
                            <span className="bg-[#8BC53F] text-black text-[9px] font-bold px-2 py-1 rounded flex-1 text-center">ELECTRICIDADE</span>
                            <span className="bg-white border border-gray-200 text-gray-400 text-[9px] font-bold px-2 py-1 rounded flex-1 text-center">GÁS NATURAL</span>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Próximos Contratos</p>
                            {[
                                { l: 'PTEL BASE', v: '€79.20', c: 'text-red-500' },
                                { l: 'Wk52-25', v: '€58.35', c: 'text-red-500' },
                                { l: 'Jan-26', v: '€68.91', c: 'text-green-500' },
                                { l: 'Q1-26', v: '€59.52', c: 'text-green-500' },
                                { l: 'YR-26', v: '€57.43', c: 'text-green-500', bg: 'bg-[#8BC53F] text-black' }
                            ].map((r, i) => (
                                <div key={i} className={`flex justify-between items-center p-2 rounded mb-1 ${r.bg || 'bg-gray-50'}`}>
                                    <span className={`text-[9px] font-bold ${r.bg ? 'text-black' : 'text-gray-700'}`}>{r.l}</span>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-[9px] font-mono ${r.bg ? 'text-black' : 'text-gray-600'}`}>{r.v}</span>
                                        {!r.bg && <span className={`text-[8px] ${r.c}`}>▼</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                     
                     {/* Chart Area */}
                     <div className="col-span-9 h-64 relative">
                        <p className="absolute top-0 left-0 text-[10px] font-bold text-gray-500">Power Portugal Base Load - YR-26</p>
                        <ResponsiveContainer width="100%" height="100%">
                             <ComposedChart data={omipData}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                 <XAxis dataKey="name" hide />
                                 <YAxis domain={['auto', 'auto']} hide />
                                 <Area type="monotone" dataKey="price" stroke="#8BC53F" fill="#8BC53F" fillOpacity={0.1} strokeWidth={2} />
                             </ComposedChart>
                         </ResponsiveContainer>
                         <div className="flex justify-between text-[8px] text-gray-400 mt-2 px-2">
                            <span>17. Nov</span>
                            <span>24. Nov</span>
                            <span>1. Dec</span>
                            <span>8. Dec</span>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Chart 2: Previsão */}
             <div className="mb-10 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                 <div className="flex items-center gap-2 mb-6 border-l-4 border-[#2E5A27] pl-3">
                     <h3 className="font-bold uppercase text-xs text-black tracking-wider">Previsão do Mercado Grossista</h3>
                 </div>
                 
                 <div className="grid grid-cols-12 gap-8">
                     {/* Sidebar Table */}
                     <div className="col-span-3 space-y-4">
                        <div className="flex gap-2 mb-4">
                            <span className="bg-[#2E5A27] text-white text-[9px] font-bold px-2 py-1 rounded flex-1 text-center">ELECTRICIDADE</span>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Contratos Seguintes</p>
                            {[
                                { l: 'YR-27', v: '€56.10', c: 'text-green-500' },
                                { l: 'YR-28', v: '€56.55', c: 'text-red-500' },
                                { l: 'YR-29', v: '€56.40', c: 'text-red-500' },
                                { l: 'YR-30', v: '€56.40', c: 'text-red-500' },
                            ].map((r, i) => (
                                <div key={i} className="flex justify-between items-center p-2 rounded mb-1 bg-gray-50 border-b border-gray-100">
                                    <span className="text-[9px] font-bold text-gray-700">{r.l}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-mono text-gray-600">{r.v}</span>
                                        <span className={`text-[8px] ${r.c}`}>▼</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                     
                     {/* Chart Area */}
                     <div className="col-span-9 h-64 relative">
                        <p className="absolute top-0 left-0 text-[10px] font-bold text-gray-500">Power Portugal Base Load - YR-26 (Forecast)</p>
                        <ResponsiveContainer width="100%" height="100%">
                             <ComposedChart data={omipData.map(d => ({...d, price: d.price * (1 + Math.random()*0.1)}))}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                 <XAxis dataKey="name" hide />
                                 <YAxis domain={['auto', 'auto']} hide />
                                 <Area type="monotone" dataKey="price" stroke="#2E5A27" fill="#2E5A27" fillOpacity={0.2} strokeWidth={2} />
                                 <Line type="monotone" dataKey="price" stroke="#2E5A27" strokeWidth={1} dot={false} />
                             </ComposedChart>
                         </ResponsiveContainer>
                         <div className="flex justify-between text-[8px] text-gray-400 mt-2 px-2">
                            <span>2024</span>
                            <span>2025</span>
                            <span>2026</span>
                            <span>2027</span>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Insight Executivo */}
             <div className="bg-gray-100 p-8 border-l-8 border-[#2E5A27] mt-auto">
                 <h3 className="text-xs font-bold uppercase text-black mb-4">Insight Executivo</h3>
                 <p className="text-base font-serif italic text-gray-800 leading-relaxed font-medium">
                    "Ao não agir, a <span className="font-bold uppercase">{data.nome_cliente}</span> desperdiça <span className="text-[#2E5A27] font-bold">{formatCurrency(simulation.savingsTotal)}</span> anuais em custos de ineficiência contratual e operacional. A Watton não é apenas um fornecedor; somos o seu guardião financeiro no mercado energético, defendendo os seus interesses e não os das grandes elétricas."
                 </p>
                 
                 <div className="grid grid-cols-3 gap-12 mt-8 pt-8 border-t border-gray-200">
                    <div>
                        <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Poupança Mensal</p>
                        <p className="text-2xl font-bold text-black tracking-tight">{formatCurrency(simulation.savingsMonthly)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Recuperação Anual</p>
                        <p className="text-2xl font-bold text-[#2E5A27] tracking-tight">{formatCurrency(simulation.savingsTotal)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-gray-500 mb-2">Classificação</p>
                        <div className="flex justify-end gap-1.5">
                             {[1,2,3,4,5].map(i => (
                                 <div key={i} className={`w-3 h-3 rounded-full ${i <= Math.ceil(simulation.vulnerabilityScore/2) ? 'bg-[#8BC53F]' : 'bg-gray-300'}`}></div>
                             ))}
                        </div>
                    </div>
                 </div>
             </div>

             {/* Footer Bar Page 2 */}
             <div className="absolute bottom-10 left-[12mm] right-[12mm] flex items-end justify-between border-t-2 border-[#e5e5e5] pt-4">
                 <div className="bg-gray-200 px-3 py-1 font-bold text-gray-500 uppercase text-xs">Watton</div>
                 <div className="text-[8px] text-gray-400 text-right leading-tight">
                    <span className="font-bold text-[#2E5A27] uppercase">Watton Energy Consulting</span><br/>
                    Rua Professor Manuel Baganha 283<br/>
                    Lj. A | 4350-009 Porto
                 </div>
                 <div className="text-[8px] text-gray-400 text-right leading-tight">
                    T: +351 225 500 632<br/>
                    E: geral@wattonenergy.pt<br/>
                    www.wattonenergy.pt
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
};
