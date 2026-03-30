import React from 'react';

export const Button = ({ children, onClick, active, className = "" }) => (
  <button 
    onClick={onClick} 
    className={`px-3 py-1.5 rounded-md font-medium transition-colors text-xs md:text-sm print:hidden border shadow-sm ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-blue-300'} ${className}`}
  >
    {children}
  </button>
);