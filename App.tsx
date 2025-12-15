
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { InvoiceUpload } from './components/InvoiceUpload';
import { DataForm } from './components/DataForm';
import { Dashboard } from './components/Dashboard';
import { ReportPreview } from './components/ReportPreview';
import { ClientHistory } from './components/ClientHistory';
import { GlobalDashboard } from './components/GlobalDashboard';
import { InvoiceData, SimulationResult, ClientRecord } from './types';
import { DEFAULT_INVOICE } from './constants';
import { calculateSimulation, recalculateWithOverrides } from './services/calculator';
import { saveSimulation } from './services/firebase';

const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState('Simulacao');
  
  // Simulation Flow State
  const [step, setStep] = useState<'upload' | 'edit' | 'dashboard' | 'report'>('upload');
  
  // Data State
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(DEFAULT_INVOICE);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const handleDataExtracted = (data: Partial<InvoiceData>) => {
    setInvoiceData(prev => ({ ...prev, ...data }));
    setStep('edit');
  };

  const handleCalculate = (data: InvoiceData) => {
    setInvoiceData(data);
    const result = calculateSimulation(data);
    setSimulation(result);
    setStep('dashboard');
  };

  const handleSimulationUpdate = (overrides: any) => {
    if (!simulation) return;
    const recalculated = recalculateWithOverrides(invoiceData, simulation, overrides);
    setSimulation(recalculated);
  };

  const handleClientDataUpdate = (updates: Partial<InvoiceData>) => {
    if (!simulation) return;
    const newInvoiceData = { ...invoiceData, ...updates };
    setInvoiceData(newInvoiceData);
    
    // Preserve current overrides/margins
    const currentOverrides = {
      base_ponta: simulation.base_ponta,
      base_cheia: simulation.base_cheia,
      base_vazio: simulation.base_vazio,
      base_super_vazio: simulation.base_super_vazio,
      base_potencia_dia: simulation.base_potencia_dia,
      margin_ponta: simulation.margin_ponta,
      margin_cheia: simulation.margin_cheia,
      margin_vazio: simulation.margin_vazio,
      margin_super_vazio: simulation.margin_super_vazio,
      margin_potencia_dia: simulation.margin_potencia_dia
    };

    const recalculated = recalculateWithOverrides(newInvoiceData, simulation, currentOverrides);
    setSimulation(recalculated);
  };

  const handleSave = async () => {
    if (simulation) {
      const recordToSave = {
          data: invoiceData,
          simulation: simulation,
          id: invoiceData.id || Date.now().toString() 
      };
      
      const result = await saveSimulation('consultant_01', recordToSave);
      
      if (result.success) {
         alert(`✅ Sucesso: Cliente ${invoiceData.nome_cliente} guardado no Portfólio.`);
      } else {
         alert(`⚠️ Atenção: ${result.message}`);
      }
    }
  };

  const handleLoadClient = (record: ClientRecord, directToReport: boolean = false) => {
    setInvoiceData(record.data);
    setSimulation(record.simulation);
    
    setActiveTab('Simulacao');
    
    if (directToReport) {
        setStep('report');
    } else {
        setStep('dashboard');
    }
  };

  // If in Report mode within Simulation tab, render full screen report
  if (activeTab === 'Simulacao' && step === 'report' && simulation) {
    return <ReportPreview data={invoiceData} simulation={simulation} onBack={() => setStep('dashboard')} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); if(tab === 'Simulacao') setStep('upload'); }}>
      
      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'Dashboard' && (
         <GlobalDashboard />
      )}

      {/* --- PORTFOLIO TAB --- */}
      {activeTab === 'Portfolio' && (
        <ClientHistory onLoadClient={handleLoadClient} />
      )}

      {/* --- RELATORIOS TAB --- */}
      {activeTab === 'Relatorios' && (
         <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500 space-y-6 animate-fade-in">
             <div className="w-20 h-20 rounded-full bg-watton-surface border border-watton-border flex items-center justify-center text-watton-lime shadow-xl">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Arquivo de Relatórios</h2>
              <p className="max-w-md mx-auto text-sm">Acesso centralizado a todas as propostas geradas, contratos e análises de risco históricas.</p>
            </div>
         </div>
      )}

      {/* --- SIMULACAO TAB (Core App) --- */}
      {activeTab === 'Simulacao' && (
        <div className="w-full">
           {/* Simulation Header */}
           <div className="mb-8 flex justify-between items-end">
             <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Nova Simulação</h2>
                <p className="text-watton-muted mt-2">Fluxo de análise e otimização de faturas energéticas.</p>
             </div>
           </div>
          
           {/* Progress Stepper */}
           <div className="flex items-center mb-10 text-sm font-medium text-slate-500 border-b border-watton-border pb-6">
             <div className={`flex items-center gap-2 transition-colors duration-300 ${step === 'upload' ? 'text-watton-lime' : 'text-slate-300'}`}>
               <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step === 'upload' ? 'border-watton-lime bg-watton-lime/10' : 'border-slate-600'}`}>1</span> 
               Upload
             </div>
             <div className="w-16 h-px bg-slate-700 mx-4"></div>
             <div className={`flex items-center gap-2 transition-colors duration-300 ${step === 'edit' ? 'text-watton-lime' : step === 'dashboard' ? 'text-watton-lime' : 'text-slate-600'}`}>
               <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step === 'edit' ? 'border-watton-lime bg-watton-lime/10' : step === 'dashboard' ? 'border-watton-lime text-watton-lime' : 'border-slate-700'}`}>2</span> 
               Validar
             </div>
             <div className="w-16 h-px bg-slate-700 mx-4"></div>
             <div className={`flex items-center gap-2 transition-colors duration-300 ${step === 'dashboard' ? 'text-watton-lime' : 'text-slate-600'}`}>
               <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step === 'dashboard' ? 'border-watton-lime bg-watton-lime/10' : 'border-slate-700'}`}>3</span> 
               Resultados
             </div>
          </div>

          {step === 'upload' && <InvoiceUpload onDataExtracted={handleDataExtracted} />}
          
          {step === 'edit' && (
            <DataForm initialData={invoiceData} onCalculate={handleCalculate} />
          )}

          {step === 'dashboard' && simulation && (
            <Dashboard 
              simulation={simulation} 
              data={invoiceData} 
              onGenerateReport={() => setStep('report')} 
              onSave={handleSave}
              onUpdateSimulation={handleSimulationUpdate}
              onUpdateClientData={handleClientDataUpdate}
            />
          )}
        </div>
      )}

    </Layout>
  );
};

export default App;
