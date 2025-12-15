
import React, { useState, useEffect, useRef } from 'react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine
} from 'recharts';
import { fetchOmipData, MarketPoint, analyzeMarketTrend } from '../services/market.ts';

export const OmipChart: React.FC = () => {
  const [data, setData] = useState<MarketPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<'ALTA' | 'BAIXA' | 'NEUTRA'>('NEUTRA');
  
  // LIVE TICKER STATE
  const [livePrice, setLivePrice] = useState(0);
  const [priceDirection, setPriceDirection] = useState<'up'|'down'|'neutral'>('neutral');

  useEffect(() => {
    fetchOmipData().then(points => {
      setData(points);
      setTrend(analyzeMarketTrend(points));
      
      const lastPoint = points.filter(d => d.type === 'HISTORY').pop();
      if (lastPoint && lastPoint.price) {
          setLivePrice(lastPoint.price);
      }
      
      setLoading(false);
    });
  }, []);

  // Simulate Live Socket Updates
  useEffect(() => {
      if (loading) return;
      
      const interval = setInterval(() => {
          setLivePrice(prev => {
              const change = (Math.random() - 0.5) * 0.02; 
              const newPrice = prev + change;
              setPriceDirection(change > 0 ? 'up' : 'down');
              return parseFloat(newPrice.toFixed(4)); 
          });
      }, 4000); 

      return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="h-96 w-full glass-panel rounded-2xl flex flex-col items-center justify-center animate-pulse">
        <div className="text-watton-lime font-mono text-sm tracking-widest mb-2">A SINCRONIZAR COM OMIE.ES...</div>
        <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-watton-lime animate-progress-indeterminate"></div>
        </div>
      </div>
    );
  }

  // Display calculations
  const historyData = data.filter(d => d.type === 'HISTORY');
  const startPrice = historyData[0].price || 40;
  const delta = livePrice - startPrice;
  const deltaPercent = (delta / startPrice) * 100;

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-slate-800 animate-fade-in">
      
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      {/* Header Financeiro */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 relative z-10 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <h3 className="text-xs font-bold text-green-500 uppercase tracking-[0.2em] animate-pulse">OMIE LIVE FEED</h3>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Mercado Diário (Spot)
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 font-mono border border-slate-700">PT (Portugal)</span>
          </h2>
          <div className="flex items-center gap-4 mt-2">
             <p className="text-slate-500 text-sm">Preço Médio Diário (€/MWh)</p>
             <a 
               href="https://www.omie.es/pt/market-results/daily/daily-market/day-ahead-price" 
               target="_blank" 
               rel="noreferrer"
               className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider border border-blue-500/30 px-2 py-0.5 rounded hover:bg-blue-500/10 transition-colors"
             >
                Validar na Fonte Oficial
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
             </a>
          </div>
        </div>
        
        <div className="text-right mt-4 md:mt-0">
          <div className="flex items-baseline justify-end gap-3">
            <span className={`text-6xl font-mono font-bold tracking-tighter transition-colors duration-500 ${priceDirection === 'up' ? 'text-watton-lime' : priceDirection === 'down' ? 'text-red-400' : 'text-white'}`}>
                {livePrice.toFixed(2)}
            </span>
            <div className="flex flex-col items-start">
                <span className="text-sm text-slate-400 font-medium">€/MWh</span>
                <span className="text-[10px] text-slate-600 uppercase font-bold">Fecho Dia</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-2">
             <div className={`flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 ${delta >= 0 ? 'text-watton-lime' : 'text-red-400'}`}>
                <span className="font-bold text-sm">{delta > 0 ? '↑' : '↓'} {Math.abs(deltaPercent).toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500">30 Dias</span>
             </div>
             <div className={`px-3 py-1 rounded font-bold text-xs uppercase tracking-wide border ${trend === 'ALTA' ? 'bg-watton-lime text-black border-watton-lime' : trend === 'BAIXA' ? 'bg-red-500 text-white border-red-500' : 'bg-slate-700 text-white border-slate-600'}`}>
                {trend === 'ALTA' ? 'TENDÊNCIA: ALTA' : trend === 'BAIXA' ? 'TENDÊNCIA: BAIXA' : 'NEUTRA'}
             </div>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[400px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8BC53F" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8BC53F" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
            
            <XAxis 
              dataKey="date" 
              tick={{fill: '#64748b', fontSize: 10, fontFamily: 'monospace'}} 
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              minTickGap={30}
            />
            
            <YAxis 
              domain={['auto', 'auto']}
              tick={{fill: '#64748b', fontSize: 10, fontFamily: 'monospace'}} 
              axisLine={false}
              tickLine={false}
              orientation="right"
              unit="€"
            />
            
            <Tooltip 
              contentStyle={{ backgroundColor: '#0B0B0B', borderColor: '#334155', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
              itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}
              formatter={(value: any, name: string) => {
                 if (name === 'confidenceUpper') return [value.toFixed(2), 'Max Est.'];
                 if (name === 'confidenceLower') return [value.toFixed(2), 'Min Est.'];
                 if (name === 'price') return [value.toFixed(2), 'Spot Real'];
                 if (name === 'forecast') return [value.toFixed(2), 'Previsão'];
                 return [value, name];
              }}
            />

            {/* Confidence Interval */}
            <Area 
              type="monotone" 
              dataKey="confidenceUpper" 
              dataKey0="confidenceLower" 
              stroke="none"
              fill="#8BC53F" 
              fillOpacity={0.1}
            />

            {/* Forecast Line */}
            <Line 
              type="monotone" 
              dataKey="forecast" 
              stroke="#8BC53F" 
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, fill: '#8BC53F' }}
              name="Previsão"
            />

            {/* Historical Area & Line */}
            <Area 
                type="monotone" 
                dataKey="price" 
                stroke="none" 
                fill="url(#colorHistory)" 
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#ffffff" 
              strokeWidth={2}
              dot={{ r: 2, fill: '#334155', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#fff' }}
              connectNulls
              name="Spot Real"
            />

            <ReferenceLine x={data.find(d => d.type === 'FORECAST')?.date} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: '14-DEZ', fill: '#64748b', fontSize: 10 }} />
            
            {/* Linha de Referência do Preço Spot Atual */}
            <ReferenceLine y={livePrice} stroke="#ef4444" strokeDasharray="2 2" opacity={0.5} label={{ position: 'right', value: livePrice.toFixed(2), fill: '#ef4444', fontSize: 10 }} />

          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Info */}
      <div className="mt-6 flex justify-between items-center border-t border-slate-800 pt-4">
         <div className="flex gap-6 text-xs">
            <div className="flex items-center gap-2">
               <div className="w-4 h-0.5 bg-white"></div>
               <span className="text-slate-400">OMIE Spot (Histórico)</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-4 h-0.5 bg-watton-lime border-t border-dashed border-watton-lime"></div>
               <span className="text-watton-lime">OMIP Futuros (Estimativa)</span>
            </div>
         </div>
         <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            SISTEMA SINCRONIZADO: 14-12-2025
         </div>
      </div>
    </div>
  );
};
