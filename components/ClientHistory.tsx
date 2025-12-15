
import React, { useEffect, useState } from 'react';
import { getHistory, deleteSimulation } from '../services/firebase';
import { ClientRecord } from '../types';

interface ClientHistoryProps {
  onLoadClient: (record: ClientRecord, directToReport?: boolean) => void;
}

export const ClientHistory: React.FC<ClientHistoryProps> = ({ onLoadClient }) => {
  const [history, setHistory] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<ClientRecord | null>(null);

  const fetchHistory = () => {
    setLoading(true);
    getHistory('consultant_01').then(data => {
      setHistory(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("⚠️ AÇÃO IRREVERSÍVEL\n\nTem a certeza que deseja eliminar este cliente? Todos os dados da simulação serão perdidos.")) {
      await deleteSimulation('consultant_01', id);
      fetchHistory(); // Forçar refresh imediato da lista
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 animate-pulse">
            <svg className="w-10 h-10 mb-2 animate-spin text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            <p>A sincronizar portfólio...</p>
        </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 glass-panel rounded-2xl text-slate-500 animate-fade-in max-w-7xl mx-auto">
        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-xl font-bold text-white mb-2">Portfólio Vazio</p>
        <p className="text-sm max-w-md text-center">Ainda não existem clientes guardados. Realize uma simulação e clique em "Guardar" para construir a sua carteira.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
       <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Portfólio de Clientes</h2>
            <p className="text-slate-400 text-sm mt-1">Gestão de carteira e histórico de simulações.</p>
          </div>
          <span className="text-xs font-bold text-watton-lime bg-watton-lime/10 px-4 py-1.5 rounded-full border border-watton-lime/20">{history.length} ATIVOS</span>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map((record, idx) => (
          <div 
            key={record.id || idx} 
            className="glass-panel p-6 rounded-2xl flex flex-col justify-between group transition-all duration-300 hover:border-watton-lime/30 relative overflow-hidden shadow-lg hover:shadow-watton-lime/5"
          >
            {/* Header / Info Area */}
            <div className="cursor-pointer" onClick={() => onLoadClient(record, false)}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-watton-lime transition-colors line-clamp-1">
                      {record.data.nome_cliente || 'Cliente Sem Nome'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">NIF: {record.data.nif_cliente}</span>
                         <span className="text-[10px] text-slate-500">{new Date(record.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     <div className="w-8 h-8 rounded-full bg-slate-900/50 flex items-center justify-center text-slate-400 border border-slate-700" title="Tensão">
                        <span className="text-[10px] font-bold">{record.data.tensao_fornecimento}</span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-700/30 my-2">
                  <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Poupança Total</p>
                      <p className="text-watton-lime font-bold text-xl">
                        {record.simulation.savingsTotal.toLocaleString('pt-PT', {style:'currency', currency:'EUR', maximumFractionDigits: 0})}
                      </p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Custo Atual</p>
                      <p className="text-white font-bold text-sm">
                        {record.simulation.currentAnnualCost.toLocaleString('pt-PT', {style:'currency', currency:'EUR', maximumFractionDigits: 0})}
                      </p>
                  </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="grid grid-cols-4 gap-2 pt-4 mt-2">
                 {/* Delete Button */}
                 <button 
                    onClick={(e) => handleDelete(e, record.id)}
                    className="col-span-1 py-2 rounded-lg bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-900/20 hover:border-red-500 flex items-center justify-center"
                    title="Eliminar Cliente"
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>

                 {/* View Invoice Button */}
                 <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedInvoice(record); }}
                    className={`col-span-1 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${record.data.originalFileBase64 ? 'bg-blue-600/10 text-blue-400 border-blue-600/30 hover:bg-blue-600 hover:text-white' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                    title={record.data.originalFileBase64 ? "Ver Fatura Original (PDF)" : "Ver Dados Extraídos"}
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 </button>
                  
                  {/* View Report Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onLoadClient(record, true); }}
                    className="col-span-2 py-2 rounded-lg bg-watton-lime text-black hover:bg-watton-limeHover text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-lg shadow-watton-lime/10"
                  >
                    Ver Proposta
                  </button>
            </div>
          </div>
        ))}
      </div>

      {/* INVOICE DATA MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" onClick={() => setSelectedInvoice(null)}>
            <div className="bg-watton-surface border border-slate-700 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 px-6 py-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <svg className="w-5 h-5 text-watton-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Fatura Digital: {selectedInvoice.data.nome_cliente}
                    </h3>
                    <div className="flex gap-4">
                        {selectedInvoice.data.originalFileBase64 && (
                            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-bold uppercase tracking-wider">
                                {selectedInvoice.data.originalMimeType?.includes('pdf') ? 'PDF Original' : 'Imagem Original'}
                            </span>
                        )}
                        <button onClick={() => setSelectedInvoice(null)} className="text-slate-500 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* LEFT PANEL: DATA */}
                    <div className="w-full md:w-1/3 p-6 bg-slate-50 overflow-y-auto text-slate-800 border-r border-slate-200">
                        <h4 className="font-bold text-sm uppercase text-slate-400 mb-4 tracking-wider">Dados Extraídos (OCR)</h4>
                        
                        <div className="space-y-4 text-xs font-mono">
                            <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                <p className="font-bold text-slate-900 text-sm mb-1">{selectedInvoice.data.nome_cliente}</p>
                                <p>NIF: {selectedInvoice.data.nif_cliente}</p>
                                <p>CPE: {selectedInvoice.data.cpe}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                    <p className="text-slate-400 text-[10px] uppercase font-bold">Total</p>
                                    <p className="font-bold text-lg text-emerald-600">{selectedInvoice.data.total_fatura_com_iva.toFixed(2)} €</p>
                                </div>
                                <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                    <p className="text-slate-400 text-[10px] uppercase font-bold">Potência</p>
                                    <p className="font-bold">{selectedInvoice.data.potencia_contratada} kVA</p>
                                </div>
                            </div>

                            <table className="w-full bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                                <thead className="bg-slate-100 text-slate-500 font-bold">
                                    <tr>
                                        <th className="text-left py-2 px-2">Período</th>
                                        <th className="text-right py-2 px-2">kWh</th>
                                        <th className="text-right py-2 px-2">Preço</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { l: 'Ponta', q: selectedInvoice.data.consumo_ponta, p: selectedInvoice.data.preco_ponta },
                                        { l: 'Cheia', q: selectedInvoice.data.consumo_cheia, p: selectedInvoice.data.preco_cheia },
                                        { l: 'Vazio', q: selectedInvoice.data.consumo_vazio, p: selectedInvoice.data.preco_vazio },
                                        { l: 'S.Vazio', q: selectedInvoice.data.consumo_super_vazio, p: selectedInvoice.data.preco_super_vazio },
                                    ].filter(r => r.q > 0).map((r, idx) => (
                                        <tr key={idx} className="border-t border-slate-100">
                                            <td className="py-2 px-2 font-bold">{r.l}</td>
                                            <td className="py-2 px-2 text-right">{r.q}</td>
                                            <td className="py-2 px-2 text-right">{r.p.toFixed(4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded border border-blue-100">
                                <p className="font-bold mb-1">Raw Text:</p>
                                <p className="line-clamp-6 opacity-70">{selectedInvoice.data.raw_text || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: ORIGINAL FILE */}
                    <div className="w-full md:w-2/3 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                        {selectedInvoice.data.originalFileBase64 ? (
                            selectedInvoice.data.originalMimeType === 'application/pdf' ? (
                                <embed 
                                    src={`data:application/pdf;base64,${selectedInvoice.data.originalFileBase64}`} 
                                    className="w-full h-full" 
                                    type="application/pdf"
                                />
                            ) : (
                                <img 
                                    src={`data:${selectedInvoice.data.originalMimeType};base64,${selectedInvoice.data.originalFileBase64}`} 
                                    className="max-w-full max-h-full object-contain shadow-2xl" 
                                    alt="Fatura Original" 
                                />
                            )
                        ) : (
                            <div className="text-center text-slate-500">
                                <svg className="w-20 h-20 mx-auto mb-4 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                <p className="text-lg font-bold">Ficheiro Original Não Disponível</p>
                                <p className="text-sm">Apenas os metadados foram preservados para este registo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
