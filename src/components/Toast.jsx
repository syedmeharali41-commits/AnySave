import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Clipboard, Bell, ShieldAlert, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    color: '#10b981', // Emerald 500
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.2)',
    glow: 'rgba(16,185,129,0.25)',
    titleColor: '#d1fae5', // Emerald 100
  },
  error: {
    icon: ShieldAlert,
    color: '#ef4444', // Red 500
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.2)',
    glow: 'rgba(239,68,68,0.25)',
    titleColor: '#fee2e2', // Red 100
  },
  warning: {
    icon: AlertCircle,
    color: '#f59e0b', // Amber 500
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.2)',
    glow: 'rgba(245,158,11,0.25)',
    titleColor: '#fef3c7', // Amber 100
  },
  info: {
    icon: Sparkles,
    color: '#06b6d4', // Cyan 500
    bg: 'rgba(6,182,212,0.1)',
    border: 'rgba(6,182,212,0.2)',
    glow: 'rgba(6,182,212,0.25)',
    titleColor: '#cffafe', // Cyan 100
  },
  clip: {
    icon: Clipboard,
    color: '#a855f7', // Purple 500
    bg: 'rgba(168,85,247,0.1)',
    border: 'rgba(168,85,247,0.2)',
    glow: 'rgba(168,85,247,0.25)',
    titleColor: '#f3e8ff', // Purple 100
  },
};

const Toast = ({ toast }) => {
  const removeToast = useStore((s) => s.removeToast);
  const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;
  const duration = toast.duration || 4000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden flex items-stretch gap-4 pl-4 pr-3 py-4 rounded-2xl min-w-[320px] max-w-[420px] border border-white/[0.08]"
      style={{
        background: 'linear-gradient(135deg, rgba(15,15,20,0.92) 0%, rgba(10,10,12,0.96) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 20px ${cfg.glow}`,
        willChange: 'transform, opacity',
      }}
    >
      {/* Type-based Accent Bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ background: `linear-gradient(to bottom, ${cfg.color}, transparent)` }}
      />

      {/* Icon Section */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner relative"
          style={{ background: cfg.bg, boxShadow: `0 0 15px ${cfg.glow}, inset 0 2px 4px rgba(0,0,0,0.1)` }}
        >
          <Icon size={18} style={{ color: cfg.color }} />
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
        {toast.title && (
          <h4 className="text-[13px] font-bold leading-none tracking-tight mb-1.5" style={{ color: cfg.titleColor }}>
            {toast.title}
          </h4>
        )}
        {toast.message && (
          <p className="text-[11px] font-medium leading-relaxed text-zinc-400 line-clamp-2">
            {toast.message}
          </p>
        )}
      </div>

      {/* Action/Dismiss Section */}
      <div className="flex flex-col items-center justify-between ml-1 py-0.5">
        <button
          onClick={() => removeToast(toast.id)}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5 transition-all text-zinc-500 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress Bar Timer */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        className="absolute bottom-0 left-0 right-0 h-[3px] origin-left bg-gradient-to-r from-transparent"
        style={{ 
          backgroundColor: cfg.color,
          boxShadow: `0 0 10px ${cfg.glow}`
        }}
      />
    </motion.div>
  );
};

const ToastContainer = () => {
  const toasts = useStore((s) => s.toasts);
  
  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 items-end pointer-events-none perspective-1000">
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
