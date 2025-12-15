
import React, { useState, useCallback } from 'react';
import { processInvoiceDocument } from '../services/gemini';
import { InvoiceData } from '../types';

interface InvoiceUploadProps {
  onDataExtracted: (data: Partial<InvoiceData>) => void;
}

export const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ onDataExtracted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError("Formato inválido. Use PDF ou Imagem (JPG/PNG).");
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        const mimeType = file.type;
        const geminiData = await processInvoiceDocument(base64, mimeType);
        
        // Merge Gemini data with original file data
        const finalData: Partial<InvoiceData> = {
            ...geminiData,
            originalFileBase64: base64,
            originalFileName: file.name,
            originalMimeType: mimeType
        };

        onDataExtracted(finalData);
      } catch (err) {
        setError("Erro na leitura OCR. Tente um ficheiro com melhor resolução.");
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 perspective-1000">
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          relative overflow-hidden rounded-3xl transition-all duration-500 min-h-[400px] flex flex-col items-center justify-center text-center
          border border-dashed
          ${isDragging 
            ? 'border-watton-lime bg-watton-lime/10 scale-105 shadow-2xl shadow-watton-lime/20' 
            : 'border-slate-600 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60'}
          ${isProcessing ? 'border-none bg-black/50' : ''}
        `}
      >
        {isProcessing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20">
            {/* Scanner Animation */}
            <div className="relative w-64 h-64 border-2 border-watton-lime/30 rounded-lg overflow-hidden mb-8">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-watton-lime/20 to-transparent w-full h-full animate-scan"></div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-watton-lime"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-watton-lime"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-watton-lime"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-watton-lime"></div>
              <div className="flex items-center justify-center h-full">
                <svg className="w-16 h-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white animate-pulse">Gemini 3.0 OCR</h3>
            <p className="text-watton-lime font-mono text-sm mt-2">Extraindo dados de consumo...</p>
          </div>
        ) : (
          <div className="z-10 p-10">
            <div className={`
              w-24 h-24 rounded-2xl mx-auto mb-8 flex items-center justify-center transition-transform duration-300
              ${isDragging ? 'bg-watton-lime text-watton-dark scale-110 rotate-3' : 'bg-gradient-to-br from-slate-700 to-slate-800 text-watton-lime shadow-xl'}
            `}>
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>

            <h3 className="text-3xl font-bold text-white mb-3">Arraste a sua fatura</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
              Suportamos ficheiros <span className="text-slate-300 font-semibold">PDF</span> e imagens. 
              A nossa IA identificará automaticamente o seu perfil de consumo.
            </p>
            
            <label className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-watton-green font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></div>
              <span className="relative flex items-center gap-2">
                Selecionar Ficheiro
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </span>
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
            
            <div className="mt-10">
               <button onClick={() => onDataExtracted({})} className="text-xs text-slate-500 hover:text-white transition-colors border-b border-transparent hover:border-slate-500 pb-0.5">
                 Introduzir dados manualmente
               </button>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
