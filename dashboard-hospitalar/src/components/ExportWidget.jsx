import React, { useState, useEffect, useRef } from 'react';
import { FileDown, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { exportAsImage, exportAsExcel } from '../utils/helpers';

export const ExportWidget = ({ targetId, fileName, dataForExcel = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => { 
        if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false); 
    };
    document.addEventListener("mousedown", handleClickOutside); 
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleImage = () => { exportAsImage(targetId, fileName); setIsOpen(false); };
  const handleExcel = () => { if (dataForExcel) exportAsExcel(dataForExcel, fileName); setIsOpen(false); };
  
  if (!dataForExcel) {
      return (
          <button onClick={handleImage} title="Baixar Imagem" className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 print:hidden">
              <FileDown size={18} />
          </button>
      );
  }
  
  return (
    <div className="relative inline-block print:hidden" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 ${isOpen ? 'text-blue-600 bg-slate-50' : ''}`}>
          <FileDown size={18} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
          <button onClick={handleImage} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <ImageIcon size={14} className="text-purple-500"/> Baixar Imagem
          </button>
          <button onClick={handleExcel} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <FileSpreadsheet size={14} className="text-green-500"/> Baixar Excel
          </button>
        </div>
      )}
    </div>
  );
};