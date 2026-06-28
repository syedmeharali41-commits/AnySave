import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
  return (
    <div className="titlebar border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        {/* Hex icon */}
        <div className="relative w-6 h-6 flex-shrink-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
              boxShadow: '0 0 10px rgba(6,182,212,0.5)',
            }}
          >
            <span className="text-[9px] font-black text-black tracking-tight">AS</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[11px] font-black tracking-[0.18em] uppercase"
            style={{ color: '#ffffff' }}
          >
            AnySave
          </span>
          <span 
            className="text-[8px] tracking-widest uppercase ml-1 opacity-60"
            style={{ color: '#a1a1aa' }}
          >
            by Syed Mehar Ali
          </span>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="titlebar-button"
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.electronAPI?.close()}
          className="titlebar-button"
          title="Close"
          style={{}}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '';
            e.currentTarget.style.color = '';
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
