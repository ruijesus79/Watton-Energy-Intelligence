
import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { SimulationResult, InvoiceData, AutoSwitchConfig, StrategicAnalysis } from '../types';
import { OmipChart } from './OmipChart';
import { StrategyPanel } from './StrategyPanel';

interface DashboardProps {
  simulation: SimulationResult;
  data: InvoiceData;
  onGenerateReport: () => void;
  onSave: () => void;
  onUpdateSimulation?: (overrides: any) => void;
  onUpdateClientData?: (updates: Partial<InvoiceData>) => void;
}

// --- COMPONENTE AUXILIAR PARA EDIÇÃO ROBUSTA ---
interface EditableCellProps {
  value: number;
  onChange: (val: string) => void;
  className?: string;
  isMargin?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({ value, onChange, className, isMargin }) => {
  const [localValue, setLocalValue] = useState(value.toFixed(6));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value.toFixed(6));
    }
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    if (raw === '' || raw === '-' || raw.endsWith(',') || raw.endsWith('.')) {
        return; 
    }
    onChange(raw);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(localValue.replace(',', '.'));
    if (!isNaN(num)) {
        setLocalValue(num.toFixed(6));
    } else {
        setLocalValue(value.toFixed(6));
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onChange={handleChange}
        className={`w-full bg-transparent border-b border-transparent focus:border-white focus:outline-none transition-all font-mono text-sm px-1 py-1
          ${isMargin ? 'text-watton-lime font-bold' : 'text-slate-300'}
          hover:bg-white/5 focus:bg-slate-800
          text-right
        `}
      />
      <span className="absolute right-0 bottom-0 w-2 h-2 border-r border-b border-slate-600 opacity-0 group-hover:opacity-100 pointer-events-none"></span>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ simulation, data, onGenerateReport, onSave, onUpdateSimulation, onUpdateClientData }) => {
  const [activeTab, setActiveTab] = useState<'analise' | 'mercado' | 'financeiro'>('analise');
  
  const [autoSwitchState, setAutoSwitchState] = useState<AutoSwitchConfig>(
    simulation.autoSwitch || { isEnabled: false, status: 'idle' }
  );

  useEffect(() => {
    if (simulation.autoSwitch) {
      setAutoSwitchState(simulation.autoSwitch);
    }
  }, [simulation.autoSwitch]);

  const toggleAutoSwitch = () => {
    const newState = !autoSwitchState.isEnabled;
    const newConfig: AutoSwitchConfig = { 
        isEnabled: newState, 
        status: newState ? 'scanning' : 'idle',
        lastCheck: newState ? undefined : autoSwitchState.lastCheck 
    };
    
    setAutoSwitchState(newConfig);
    if (onUpdateSimulation) onUpdateSimulation({ autoSwitch: newConfig });

    if (newState) {
        setTimeout(() => {
            const foundConfig: AutoSwitchConfig = {
                isEnabled: true,
                status: 'found',
                potentialExtraSavings: 2.4,
                lastCheck: new Date().toISOString()
            };
            setAutoSwitchState(foundConfig);
            if (onUpdateSimulation) onUpdateSimulation({ autoSwitch: foundConfig });
        }, 2500);
    }
  };

  const applyAutoSwitchSavings = () => {
      if (!onUpdateSimulation) return;
      const appliedConfig: AutoSwitchConfig = { ...autoSwitchState, status: 'applied' };
      onUpdateSimulation({
          autoSwitch: appliedConfig,
          margin_ponta: Math.max(0.001, simulation.margin_ponta - 0.002),
          margin_cheia: Math.max(0.001, simulation.margin_cheia - 0.001),
          margin_vazio: Math.max(0.001, simulation.margin_vazio - 0.0005)
      });
  };

  const handleStrategyGenerated = (insight: StrategicAnalysis) => {
    if (onUpdateSimulation) {
        onUpdateSimulation({ aiInsights: insight });
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  const formatPrice = (val: number) => val.toFixed(6);

  // --- CHART DATA PREPARATION ---
  const totalConsumption = (data.consumo_ponta + data.consumo_cheia + data.consumo_vazio + data.consumo_super_vazio) || 1;
  const consumptionData = [
    { name: 'Ponta (Caro)', value: data.consumo_ponta, color: '#ef4444' }, 
    { name: 'Cheia', value: data.consumo_cheia, color: '#f97316' }, 
    { name: 'Vazio (Econ)', value: data.consumo_vazio, color: '#8BC53F' }, 
    { name: 'S. Vazio', value: data.consumo_super_vazio, color: '#2E5A27' }, 
  ].filter(d => d.value > 0).map(d => ({
      ...d,
      percent: (d.value / totalConsumption) * 100
  }));

  const costStructureData = [
    {
      name: 'Cliente Atual',
      Energia: (simulation.currentAnnual * 0.6), 
      Redes: (simulation.currentAnnual * 0.4),
      total: simulation.currentAnnual
    },
    {
      name: 'Watton Otimizado',
      Energia: (simulation.wattonAnnual * 0.5), 
      Redes: (simulation.wattonAnnual * 0.4), 
      total: simulation.wattonAnnual
    }
  ];

  const parseVal = (val: string) => parseFloat(val.replace(',', '.'));

  const handleUpdate = (field: string, val: string) => {
    if (!onUpdateSimulation) return;
    const numVal = parseVal(val);
    if (!isNaN(numVal)) onUpdateSimulation({ [field]: numVal });
  };

  const handleFinalPriceUpdate = (marginField: string, baseValue: number, newFinalPriceStr: string) => {
    if (!onUpdateSimulation) return;
    const newFinalPrice = parseVal(newFinalPriceStr);
    
    if (!isNaN(newFinalPrice)) {
       const calculatedMargin = newFinalPrice - baseValue;
       onUpdateSimulation({ [marginField]: parseFloat(calculatedMargin.toFixed(6)) });
    }
  };

  const handleClientUpdate = (field: string, val: string) => {
    if (!onUpdateClientData) return;
    const numVal = parseVal(val);
    if (!isNaN(numVal)) onUpdateClientData({ [field]: numVal });
  };

  return (
    <div className="space-y-8 animate-slide-up max-w-7xl mx-auto pb-20">
      
      {/* --- TOP NAV --- */}
      <div className="flex border-b border-slate-700/50 sticky top-0 bg-watton-black/90 backdrop-blur z-20 pt-2">
        {[
          { id: 'analise', label: 'SmartBill Analyzer', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { id: 'financeiro', label: 'Matriz de Preços', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { id: 'mercado', label: 'Market Radar', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'border-watton-lime text-watton-lime bg-watton-lime/5' 
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- CONTENT --- */}

      {/* TAB 1: SMARTBILL ANALYZER (XAI) */}
      {activeTab === 'analise' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Executive KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* Box 1: Custo Atual */}
             <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-slate-500 relative overflow-hidden">
               <div className="relative z-10">
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Custo Anual Atual</p>
                 <p className="text-3xl font-bold text-white mt-2">{formatCurrency(simulation.currentAnnual)}</p>
                 <p className="text-xs text-slate-500 mt-1">Baseado na fatura carregada</p>
               </div>
             </div>
             
             {/* Box 2: Poupança (Split View) */}
             <div className="glass-panel p-0 rounded-2xl border-l-4 border-l-watton-lime bg-gradient-to-br from-watton-lime/10 to-transparent relative overflow-hidden shadow-[0_0_30px_rgba(139,197,63,0.1)] flex">
               <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><svg className="w-24 h-24 text-watton-lime" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg></div>
               
               {/* Left: Monthly */}
               <div className="flex-1 p-5 border-r border-white/10 flex flex-col justify-center">
                  <p className="text-watton-lime text-[10px] font-bold uppercase tracking-wider mb-1">Poupança Mensal</p>
                  <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(simulation.savingsMonthly)}</p>
                  <p className="text-[9px] text-slate-400 mt-1">Impacto Cash-Flow</p>
               </div>

               {/* Right: Annual */}
               <div className="flex-1 p-5 flex flex-col justify-center">
                  <p className="text-watton-lime text-[10px] font-bold uppercase tracking-wider mb-1">Poupança Anual</p>
                  <div className="flex items-baseline gap-2">
                     <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(simulation.savingsAnnual)}</p>
                  </div>
                  <div className="mt-1">
                     <span className="text-[10px] font-bold text-black bg-watton-lime px-1.5 py-0.5 rounded">-{simulation.savingsPercent.toFixed(1)}%</span>
                  </div>
               </div>
             </div>

             {/* Box 3: AutoSwitch */}
             <div className={`glass-panel p-6 rounded-2xl border-l-4 transition-all duration-500 ${autoSwitchState.isEnabled ? 'border-l-blue-500 bg-blue-500/5' : 'border-l-slate-700'}`}>
                <div className="flex justify-between items-start">
                   <div>
                     <p className={`text-xs font-bold uppercase tracking-wider ${autoSwitchState.isEnabled ? 'text-blue-400' : 'text-slate-400'}`}>Watton AutoSwitch™</p>
                     <p className="text-sm text-white mt-2 font-medium">
                        {autoSwitchState.isEnabled ? 'Monitorização Ativa' : 'Monitorização Inativa'}
                     </p>
                     <p className="text-xs text-slate-500 mt-1 leading-snug max-w-[200px]">
                        {autoSwitchState.status === 'scanning' ? 'IA a analisar 34 comercializadores...' : 
                         autoSwitchState.status === 'found' ? 'Oportunidade encontrada!' :
                         'A nossa IA vigia o mercado e troca de tarifa se o preço baixar.'}
                     </p>
                   </div>
                   <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                      <input 
                        type="checkbox" 
                        name="toggle" 
                        id="toggle" 
                        checked={autoSwitchState.isEnabled}
                        onChange={toggleAutoSwitch}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"
                        style={{ right: autoSwitchState.isEnabled ? '0' : '50%', borderColor: autoSwitchState.isEnabled ? '#3b82f6' : '#334155' }}
                      />
                      <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer border transition-colors ${autoSwitchState.isEnabled ? 'bg-blue-500 border-blue-500' : 'bg-slate-700 border-slate-700'}`}></label>
                   </div>
                </div>
                
                {autoSwitchState.status === 'found' && (
                    <div className="mt-4 bg-emerald-900/30 p-3 rounded border border-emerald-500/40 animate-pulse">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-bold text-emerald-400 uppercase">Oferta Flash</span>
                             <span className="text-xs font-bold text-white bg-emerald-600 px-1 rounded">-{autoSwitchState.potentialExtraSavings}%</span>
                        </div>
                        <button onClick={applyAutoSwitchSavings} className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded shadow-lg transition-colors">
                            Aplicar Desconto
                        </button>
                    </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                   <svg className="w-5 h-5 text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                   Perfil de Consumo (Eficiência)
                </h3>
                <div className="h-64 flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={consumptionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {consumptionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                        itemStyle={{ color: '#fff' }} 
                        formatter={(val: number, name: string, props: any) => [
                            `${val.toLocaleString()} kWh (${props.payload.percent.toFixed(1)}%)`, 
                            name.split(' ')[0]
                        ]} 
                      />
                      <Legend 
                        verticalAlign="middle" 
                        align="right" 
                        layout="vertical" 
                        iconType="circle" 
                        formatter={(value, entry: any) => {
                            const percent = entry.payload.percent.toFixed(0);
                            return <span className="text-slate-300 ml-2">{value} <span className="text-xs font-bold text-slate-500 ml-1">({percent}%)</span></span>
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                   <svg className="w-5 h-5 text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                   Estrutura de Custos (Anual)
                </h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costStructureData} layout="vertical" margin={{ left: 20 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" width={100} tick={{fill: '#94a3b8', fontSize: 12}} />
                         <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} formatter={(val: number) => formatCurrency(val)} />
                         <Bar dataKey="Redes" stackId="a" fill="#334155" radius={[0,0,0,0]} name="Acesso Redes (Regulado)" />
                         <Bar dataKey="Energia" stackId="a" fill="#8BC53F" radius={[0,4,4,0]} name="Energia (Otimizável)" />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>

          <StrategyPanel data={data} simulation={simulation} onInsightGenerated={handleStrategyGenerated} />
        </div>
      )}

      {/* TAB 2: MARKET RADAR */}
      {activeTab === 'mercado' && <OmipChart />}

      {/* TAB 3: MATRIX & EDITING */}
      {activeTab === 'financeiro' && (
         <div className="space-y-6 animate-fade-in">
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700">
               <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     Matriz de Preços & Margens (Edição Avançada)
                  </h3>
                  <div className="flex gap-2">
                     <button onClick={onSave} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-watton-lime border border-watton-lime rounded hover:bg-watton-lime hover:text-black transition-colors">Guardar</button>
                     <button onClick={onGenerateReport} className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white text-black rounded hover:bg-gray-200 transition-colors">Gerar PDF</button>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="bg-black/40 text-slate-400 uppercase text-xs tracking-wider">
                     <th className="py-3 px-4 text-left font-bold">Período</th>
                     <th className="py-3 px-4 text-right bg-slate-800/30 border-x border-slate-700/50 w-32">Custo Base (ZUG)</th>
                     <th className="py-3 px-4 text-right bg-watton-green/10 border-r border-slate-700/50 text-watton-lime font-bold w-32">Margem</th>
                     <th className="py-3 px-4 text-right font-bold text-white bg-slate-800/40 w-32">Preço Final (Proposta)</th>
                     <th className="py-3 px-4 text-right text-slate-300 bg-slate-800/20 w-32">Preço Atual (Cliente)</th>
                     <th className="py-3 px-4 text-right font-bold w-28">Delta</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                   {[
                     { label: 'Ponta', baseKey: 'base_ponta', marginKey: 'margin_ponta', clientKey: 'preco_ponta', base: simulation.base_ponta, margin: simulation.margin_ponta, final: simulation.proposed_ponta, client: data.preco_ponta, id: 'Ponta' },
                     { label: 'Cheia', baseKey: 'base_cheia', marginKey: 'margin_cheia', clientKey: 'preco_cheia', base: simulation.base_cheia, margin: simulation.margin_cheia, final: simulation.proposed_cheia, client: data.preco_cheia, id: 'Cheia' },
                     { label: 'Vazio', baseKey: 'base_vazio', marginKey: 'margin_vazio', clientKey: 'preco_vazio', base: simulation.base_vazio, margin: simulation.margin_vazio, final: simulation.proposed_vazio, client: data.preco_vazio, id: 'Vazio' },
                     { label: 'S. Vazio', baseKey: 'base_super_vazio', marginKey: 'margin_super_vazio', clientKey: 'preco_super_vazio', base: simulation.base_super_vazio, margin: simulation.margin_super_vazio, final: simulation.proposed_super_vazio, client: data.preco_super_vazio, id: 'S. Vazio' },
                   ].map((row) => (
                     <tr key={row.label} className="hover:bg-white/5 transition-colors">
                       <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                         {row.label}
                         {simulation.bestMarginOpportunity === row.id && (
                           <span className="w-2 h-2 rounded-full bg-watton-lime animate-pulse" title="Melhor oportunidade"></span>
                         )}
                       </td>
                       <td className="py-2 px-4 text-right bg-slate-800/20 border-x border-slate-700/50">
                          <EditableCell 
                            value={row.base} 
                            onChange={(v) => handleUpdate(row.baseKey, v)} 
                          />
                       </td>
                       <td className="py-2 px-4 text-right bg-watton-green/5 border-r border-slate-700/50">
                          <EditableCell 
                            value={row.margin} 
                            onChange={(v) => handleUpdate(row.marginKey, v)} 
                            isMargin
                          />
                       </td>
                       <td className="py-3 px-4 text-right bg-slate-800/40 border-r border-slate-700/50">
                          <EditableCell 
                             value={row.final}
                             onChange={(v) => handleFinalPriceUpdate(row.marginKey, row.base, v)}
                             className="text-white font-bold"
                          />
                       </td>
                       <td className="py-3 px-4 text-right bg-slate-800/20">
                          <EditableCell 
                             value={row.client}
                             onChange={(v) => handleClientUpdate(row.clientKey, v)}
                          />
                       </td>
                       <td className="py-3 px-4 text-right font-mono text-sm">
                          <span className={(row.client - row.final) >= 0 ? 'text-watton-lime' : 'text-red-500'}>
                             {((row.client - row.final) >= 0 ? '-' : '+')}{formatPrice(Math.abs(row.client - row.final))}
                          </span>
                       </td>
                     </tr>
                   ))}
                    {/* Potencia Row */}
                   <tr className="bg-slate-900/50">
                      <td className="py-3 px-4 font-bold text-slate-400 text-xs uppercase">Potência/Dia</td>
                      <td className="py-2 px-4 text-right border-x border-slate-700/50">
                          <EditableCell 
                              value={simulation.base_potencia_dia}
                              onChange={(v) => handleUpdate('base_potencia_dia', v)}
                          />
                      </td>
                      <td className="py-2 px-4 text-right border-r border-slate-700/50 bg-watton-green/5">
                          <EditableCell 
                              value={simulation.margin_potencia_dia}
                              onChange={(v) => handleUpdate('margin_potencia_dia', v)}
                              isMargin
                          />
                      </td>
                      <td className="py-3 px-4 text-right bg-slate-800/40">
                         <EditableCell 
                              value={simulation.proposed_potencia_dia}
                              onChange={(v) => handleFinalPriceUpdate('margin_potencia_dia', simulation.base_potencia_dia, v)}
                              className="text-white font-bold"
                          />
                      </td>
                      <td className="py-3 px-4 text-right bg-slate-800/20">
                           <EditableCell 
                              value={data.preco_potencia_dia}
                              onChange={(v) => handleClientUpdate('preco_potencia_dia', v)}
                          />
                      </td>
                       <td className="py-3 px-4 text-right font-mono text-sm">
                          <span className={(data.preco_potencia_dia - simulation.proposed_potencia_dia) >= 0 ? 'text-watton-lime' : 'text-red-500'}>
                             {((data.preco_potencia_dia - simulation.proposed_potencia_dia) >= 0 ? '-' : '+')}{formatPrice(Math.abs(data.preco_potencia_dia - simulation.proposed_potencia_dia))}
                          </span>
                       </td>
                   </tr>
                 </tbody>
               </table>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
