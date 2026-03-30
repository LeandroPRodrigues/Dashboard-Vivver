import React from 'react';

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 break-inside-avoid mb-6 ${className} print:shadow-none print:border-slate-300 print:mb-8`}>
    {children}
  </div>
);