
import React, { useEffect, useState } from 'react';
import { InvoiceData, VoltageLevel, TariffCycle, TimeCycleOption } from '../types';

interface DataFormProps {
  initialData: Partial<InvoiceData>;
  onCalculate: (data: InvoiceData) => void;
}

export const DataForm: React.FC<DataFormProps> = ({ initialData, onCalculate }) => {
  // Mantemos como 'any' para permitir strings temporárias durante a edição (ex: "0.")
  const [formData, setFormData] = useState<any>(initialData);
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  useEffect(() => {
    setFormData((prev: any) => ({ ...prev, ...initialData }));
  }, [initialData]);

  // Recalculate estimated invoice total whenever form data changes
  useEffect(() => {
    const p_ponta = (parseFloat(formData.consumo_ponta) || 0) * (parseFloat(formData.preco_ponta) || 0);
    const p_cheia = (parseFloat(formData.consumo_cheia) || 0) * (parseFloat(formData.preco_cheia) || 0);
    const p_vazio = (parseFloat(formData.consumo_vazio) || 0) * (parseFloat(formData.preco_vazio) || 0);
    const p_svazio = (parseFloat(formData.consumo_super_vazio) || 0) * (parseFloat(formData.preco_super_vazio) || 0);
    
    // Potencia estimate (approx 30 days)
    const p_potencia = (parseFloat(formData.preco_potencia_dia) || 0) * 30;
    
    // Sum + IVA (approx 23%)
    const subtotal = p_ponta + p_cheia + p_vazio + p_svazio + p_potencia;
    // We display subtotal mostly, but we can approx total
    setCalculatedTotal(subtotal * 1.23); 
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // CORREÇÃO CRÍTICA DE UX:
    // Se for number, guardamos a string bruta no state para permitir digitar "0." ou apagar tudo.
    // A conversão para number acontece apenas no cálculo (useEffect) ou no submit.
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitização final antes de enviar para o motor de cálculo
    const cleanData: any = { ...formData };
    
    // Lista de campos numéricos que devem ser convertidos
    const numberFields = [
        'potencia_contratada', 'preco_potencia_dia', 'total_fatura_com_iva',
        'consumo_ponta', 'consumo_cheia', 'consumo_vazio', 'consumo_super_vazio',
        'preco_ponta', 'preco_cheia', 'preco_vazio', 'preco_super_vazio'
    ];

    numberFields.forEach(field => {
        if (cleanData[field]) {
            // Substitui vírgulas por pontos para garantir parsing correto se o browser permitir vírgulas
            const strVal = String(cleanData[field]).replace(',', '.');
            cleanData[field] = parseFloat(strVal) || 0;
        } else {
            cleanData[field] = 0;
        }
    });

    onCalculate(cleanData as InvoiceData);
  };

  // UI Components helpers
  const SectionTitle = ({ title, icon }: { title: string, icon: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-6 border-b border-watton-border pb-3">
      <div className="text-watton-lime bg-watton-lime/10 p-2 rounded-lg">{icon}</div>
      <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
    </div>
  );

  const StandardInput = ({ label, name, type = "text", value, placeholder, suffix, required = false, step }: any) => (
    <div className="w-full">
      <label className="block text-xs font-bold text-watton-lime uppercase tracking-wider mb-2 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        <input
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          step={step || (type === 'number' ? "0.000001" : undefined)}
          placeholder={placeholder || "—"}
          className={`
            w-full bg-watton-black border border-watton-border rounded-lg px-4 py-3 text-white font-medium
            focus:border-watton-lime focus:ring-1 focus:ring-watton-lime focus:outline-none transition-all
            placeholder-slate-600 shadow-sm group-hover:border-slate-600
            ${suffix ? 'pr-12 text-right font-mono' : ''}
          `}
        />
        {suffix && (
          <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-500">{suffix}</span>
        )}
      </div>
    </div>
  );

  const StandardSelect = ({ label, name, value, options }: any) => (
    <div className="w-full">
      <label className="block text-xs font-bold text-watton-lime uppercase tracking-wider mb-2 ml-1">
        {label}
      </label>
      <div className="relative">
        <select 
          name={name} 
          value={value} 
          onChange={handleChange} 
          className="w-full bg-watton-black border border-watton-border rounded-lg px-4 py-3 text-white font-medium focus:border-watton-lime outline-none appearance-none cursor-pointer hover:border-slate-600 transition-all"
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-watton-lime">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );

  const voltageOptions = [
    { value: VoltageLevel.BTN, label: 'BTN - Baixa Tensão Normal (≤ 41.4 kVA)' },
    { value: VoltageLevel.BTE, label: 'BTE - Baixa Tensão Especial (> 41.4 kVA)' },
    { value: VoltageLevel.MT, label: 'MT - Média Tensão (1kV a 45kV)' },
    { value: VoltageLevel.AT, label: 'AT - Alta Tensão (> 45kV)' },
    { value: VoltageLevel.BT, label: 'BT - Baixa Tensão (Genérico)' }
  ];

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in space-y-8 max-w-6xl mx-auto pb-20">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Validação de Dados</h2>
          <p className="text-slate-400 mt-1">Confirme os valores extraídos. Os totais são calculados automaticamente para verificação.</p>
        </div>
        <button type="submit" className="hidden md:flex bg-watton-lime hover:bg-watton-limeHover text-watton-black font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(139,197,63,0.2)] transform hover:-translate-y-1 transition-all items-center gap-2">
          <span>Executar Simulação</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN - Commercial Data */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-watton-lime">
            <SectionTitle 
              title="Dados do Cliente" 
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            />
            <div className="space-y-6">
              <StandardInput label="Nome da Empresa" name="nome_cliente" value={formData.nome_cliente || ''} required />
              <StandardInput label="NIF" name="nif_cliente" value={formData.nif_cliente || ''} required />
              <StandardInput label="CPE" name="cpe" value={formData.cpe || ''} required />
              <StandardInput label="Morada Local de Consumo" name="morada_cliente" value={formData.morada_cliente || ''} />
              
              <div className="grid grid-cols-2 gap-2">
                  <StandardInput label="Total Fatura (€)" name="total_fatura_com_iva" type="number" value={formData.total_fatura_com_iva} />
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Total Calculado</label>
                    <div className={`px-4 py-3 rounded-lg border font-mono text-right ${Math.abs(calculatedTotal - (parseFloat(formData.total_fatura_com_iva)||0)) > 20 ? 'text-red-400 border-red-500/50 bg-red-500/10' : 'text-watton-lime border-watton-lime/50 bg-watton-lime/10'}`}>
                        {calculatedTotal.toFixed(2)} €
                    </div>
                  </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-watton-green">
             <SectionTitle 
              title="Perfil Técnico" 
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
            />
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <StandardSelect 
                  label="Nível de Tensão" 
                  name="tensao_fornecimento" 
                  value={formData.tensao_fornecimento || 'BTE'} 
                  options={voltageOptions} 
                />
              </div>
              
               <div className="grid grid-cols-2 gap-4">
                <StandardSelect 
                  label="Ciclo Tarifário" 
                  name="ciclo" 
                  value={formData.ciclo || 'Tetra-Horário'} 
                  options={Object.values(TariffCycle).map(c => ({ label: c, value: c }))} 
                />
                <StandardSelect 
                  label="Opção Horária" 
                  name="opcao_horaria" 
                  value={formData.opcao_horaria || 'Semanal'} 
                  options={Object.values(TimeCycleOption).map(c => ({ label: c, value: c }))} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StandardInput label="Potência" name="potencia_contratada" type="number" value={formData.potencia_contratada} suffix="kVA" />
                <StandardInput label="Preço Potência" name="preco_potencia_dia" type="number" value={formData.preco_potencia_dia} suffix="€/dia" step="0.000001" />
              </div>
              
              <div className="p-4 bg-slate-900/50 rounded-xl border border-watton-border">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">Período de Faturação</p>
                <div className="flex items-center gap-3">
                   <input type="date" name="data_inicio" value={formData.data_inicio || ''} onChange={handleChange} className="w-full bg-watton-black border border-watton-border rounded px-2 py-2 text-xs text-white focus:border-watton-lime outline-none" />
                   <span className="text-slate-500">→</span>
                   <input type="date" name="data_fim" value={formData.data_fim || ''} onChange={handleChange} className="w-full bg-watton-black border border-watton-border rounded px-2 py-2 text-xs text-white focus:border-watton-lime outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Matrix */}
        <div className="lg:col-span-8">
           <div className="glass-panel p-8 rounded-2xl h-full border-t-4 border-t-white">
              <SectionTitle 
                title="Matriz de Consumo & Custos" 
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
              />
              
              <div className="bg-watton-surface rounded-xl border border-watton-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-watton-black border-b border-watton-border">
                      <th className="py-5 px-6 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[30%]">Período</th>
                      <th className="py-5 px-6 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-[20%]">Consumo (kWh)</th>
                      <th className="py-5 px-6 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-[25%]">Preço Unitário (€)</th>
                      <th className="py-5 px-6 text-right text-xs font-bold text-watton-lime uppercase tracking-wider w-[25%]">Total Linha (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-watton-border/50">
                    {[
                      { id: 'ponta', label: 'Ponta (Peak)', desc: 'Horas de maior consumo na rede', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
                      { id: 'cheia', label: 'Cheia (Full)', desc: 'Horas intermédias', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
                      { id: 'vazio', label: 'Vazio (Valley)', desc: 'Horas noturnas económicas', color: 'text-watton-lime bg-watton-lime/10 border-watton-lime/20' },
                      { id: 'super_vazio', label: 'Super Vazio', desc: 'Horas de madrugada', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
                    ].map((p) => {
                       const keyConsumo = `consumo_${p.id}`;
                       const keyPreco = `preco_${p.id}`;
                       const consumo = parseFloat(formData[keyConsumo] || 0);
                       const preco = parseFloat(formData[keyPreco] || 0);
                       const total = consumo * preco;
                       
                       return (
                        <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                               <div className={`w-2 h-8 rounded-full ${p.color.split(' ')[1]}`}></div>
                               <div>
                                  <span className={`block font-bold text-sm ${p.color.split(' ')[0]}`}>{p.label}</span>
                                  <span className="text-[10px] text-slate-500 hidden sm:block">{p.desc}</span>
                                </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <input 
                                type="number" 
                                name={keyConsumo} 
                                value={formData[keyConsumo]} 
                                onChange={handleChange} 
                                className="w-full bg-watton-black border border-watton-border rounded-lg px-4 py-3 text-right text-white font-mono text-lg focus:border-watton-lime outline-none shadow-inner" 
                            />
                          </td>
                          <td className="py-4 px-6">
                             <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.000001" 
                                    name={keyPreco} 
                                    value={formData[keyPreco]} 
                                    onChange={handleChange} 
                                    className="w-full bg-watton-black border border-watton-border rounded-lg px-4 py-3 text-right text-white font-mono text-sm focus:border-watton-lime outline-none shadow-inner pr-10" 
                                />
                                <span className="absolute right-4 top-3.5 text-xs text-slate-500">€</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                             <span className="font-mono font-bold text-watton-lime text-lg">
                               {total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                             </span>
                             <p className="text-[10px] text-slate-500">Valor estimado</p>
                          </td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile CTA */}
              <div className="mt-8 md:hidden">
                <button type="submit" className="w-full bg-watton-lime text-watton-black font-bold py-4 rounded-xl shadow-lg uppercase tracking-wide">
                   Simular Agora
                </button>
              </div>
           </div>
        </div>
      </div>
    </form>
  );
};
