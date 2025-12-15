
import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/firebase';
import { ClientRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid } from 'recharts';
import { OmipChart } from './OmipChart';

export const GlobalDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalEnergyGWh: 0,
    totalSavings: 0,
    projectedRevenue: 0,
    riskDistribution: [] as any[],
    topSavings: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const history = await getHistory('consultant_01');
      
      // 1. Aggregations
      let energySum = 0;
      let savingsSum = 0;
      let revenueSum = 0;
      
      const riskCounts = { 'BAIXO': 0, 'MÉDIO': 0, 'ELEVADO': 0, 'CRÍTICO': 0 };

      history.forEach((rec: ClientRecord) => {
        const totalKwh = (rec.data.consumo_ponta + rec.data.consumo_cheia + rec.data.consumo_vazio + rec.data.consumo_super_vazio);
        energySum += totalKwh;
        savingsSum += rec.simulation.savingsTotal;
        revenueSum += rec.simulation.wattonMarginTotal;
        
        const risk = rec.simulation.vulnerabilityLabel || 'MÉDIO';
        if (riskCounts[risk] !== undefined) riskCounts[risk]++;
      });

      // 2. Chart Data Prep
      const riskData = Object.keys(riskCounts).map(key => ({
        name: key,
        value: riskCounts[key as keyof typeof riskCounts],
        color: key === 'BAIXO' ? '#2E5A27' : key === 'MÉDIO' ? '#8BC53F' : key === 'ELEVADO' ? '#f59e0b' : '#ef4444'
      })).filter(d => d.value > 0);

      const topClients = [...history]
        .sort((a, b) => b.simulation.savingsTotal - a.simulation.savingsTotal)
        .slice(0, 5)
        .map(rec => ({
          name: rec.data.nome_cliente.split(' ')[0], // Short name
          value: rec.simulation.savingsTotal,
          fullValue: rec.simulation.savingsTotal
        }));

      setStats({
        totalClients: history.length,
        totalEnergyGWh: energySum / 1000000, // Convert kWh to GWh
        totalSavings: savingsSum,
        projectedRevenue: revenueSum,
        riskDistribution: riskData,
        topSavings: topClients
      });
      setLoading(false);
    };

    fetchData();
  }, []);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-watton-lime animate-pulse">
            <svg className="w-12 h-12 mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            <span className="font-mono text-sm tracking-widest">A CONSOLIDAR DADOS DO PORTFÓLIO...</span>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-20">
       
       {/* Header */}
       <div className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Centro de Comando</h2>
            <p className="text-slate-400 mt-1">Visão global da performance da carteira e exposição ao mercado.</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] uppercase font-bold text-slate-500">Última Atualização</p>
            <p className="text-watton-lime font-mono text-sm">{new Date().toLocaleString('pt-PT')}</p>
          </div>
       </div>

       {/* KPI Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             </div>
             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Clientes</p>
             <p className="text-3xl font-bold text-white mt-1">{stats.totalClients}</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-16 h-16 text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volume Gerido</p>
             <div className="flex items-baseline gap-1 mt-1">
                <p className="text-3xl font-bold text-white">{stats.totalEnergyGWh.toFixed(2)}</p>
                <span className="text-sm font-bold text-watton-lime">GWh</span>
             </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group border-b-4 border-b-watton-lime">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-16 h-16 text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <p className="text-[10px] uppercase font-bold text-watton-lime tracking-wider">Poupança Identificada</p>
             <p className="text-3xl font-bold text-white mt-1">{formatCurrency(stats.totalSavings)}</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group border-b-4 border-b-emerald-500">
             <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </div>
             <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Pipeline Receita (Ano)</p>
             <p className="text-3xl font-bold text-white mt-1">{formatCurrency(stats.projectedRevenue)}</p>
          </div>
       </div>

       {/* Analytics Row */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Risk Distribution */}
          <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                 <svg className="w-5 h-5 text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                 Saúde da Carteira (Risco)
              </h3>
              <div className="h-64 flex items-center">
                 {stats.totalClients > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.riskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="w-full text-center text-slate-500 text-sm">Sem dados suficientes</div>
                 )}
                 <div className="ml-4 max-w-[200px] text-xs text-slate-400">
                    <p>Clientes classificados como <span className="text-red-500 font-bold">CRÍTICO</span> ou <span className="text-amber-500 font-bold">ELEVADO</span> têm prioridade para renegociação imediata devido à volatilidade de mercado detetada.</p>
                 </div>
              </div>
          </div>

          {/* Top Opportunities */}
          <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                 <svg className="w-5 h-5 text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                 Top 5 Oportunidades (Poupança)
              </h3>
              <div className="h-64">
                 {stats.totalClients > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.topSavings} layout="vertical" margin={{ left: 10, right: 30 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" width={80} tick={{fill: '#94a3b8', fontSize: 11}} />
                         <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            formatter={(val: number) => formatCurrency(val)}
                         />
                         <Bar dataKey="value" fill="#8BC53F" radius={[0,4,4,0]} barSize={20}>
                            {stats.topSavings.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={`rgba(139, 197, 63, ${1 - (index * 0.15)})`} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Sem dados suficientes</div>
                 )}
              </div>
          </div>

       </div>

       {/* Market Radar Integration */}
       <div>
          <OmipChart />
       </div>

    </div>
  );
};
