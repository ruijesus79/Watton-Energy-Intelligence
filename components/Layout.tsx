
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'Simulacao', label: 'Simulação', icon: 'M12 4v16m8-8H4' },
    { id: 'Portfolio', label: 'Portfólio', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'Relatorios', label: 'Relatórios', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  return (
    <div className="min-h-screen bg-watton-black flex font-sans selection:bg-watton-lime selection:text-watton-black text-watton-text">
      
      {/* Sidebar Navigation - Fixed Left */}
      <aside className="w-64 fixed h-full bg-watton-surface border-r border-watton-border z-40 hidden md:flex flex-col no-print">
        
        {/* Brand Header */}
        <div className="h-24 flex items-center px-8 border-b border-watton-border bg-watton-surface">
           <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-white tracking-tighter leading-none">
                WATTON<span className="text-watton-lime">.</span>
              </h1>
              <p className="text-[10px] text-watton-muted tracking-[0.3em] uppercase mt-1">Energy Intelligent</p>
           </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                activeTab === item.id
                  ? 'bg-watton-green/10 text-watton-lime border border-watton-green/20 shadow-[0_0_15px_rgba(139,197,63,0.1)]'
                  : 'text-watton-muted hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {activeTab === item.id && (
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-watton-lime"></div>
              )}
              <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-watton-lime' : 'text-watton-muted group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User / Status */}
        <div className="p-6 border-t border-watton-border bg-watton-surface/50">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-watton-border to-watton-surface flex items-center justify-center text-xs font-bold text-white ring-1 ring-watton-border shadow-lg">
                WC
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-bold text-white truncate">Watton Consult</p>
               <div className="flex items-center gap-1.5 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-watton-lime animate-pulse"></div>
                 <p className="text-[10px] text-watton-muted uppercase tracking-wider">Online</p>
               </div>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen bg-watton-black w-full relative">
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-watton-surface border-b border-watton-border flex items-center justify-between px-4 sticky top-0 z-30 no-print">
           <span className="font-bold text-white text-lg tracking-tighter">WATTON<span className="text-watton-lime">.</span></span>
           <button onClick={() => {/* Mobile menu toggle logic */}} className="text-white p-2">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
        </div>

        <div className="p-6 md:p-10 max-w-[1600px] mx-auto animate-fade-in">
           {children}
        </div>
      </main>
    </div>
  );
};
