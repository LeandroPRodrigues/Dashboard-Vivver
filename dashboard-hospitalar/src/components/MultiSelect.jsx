import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export const MultiSelect = ({ label, options = [], selectedValues = [], onChange, placeholder = "Selecione..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => { 
        if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false); 
    };
    document.addEventListener("mousedown", handleClickOutside); 
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => { 
      const newSelected = selectedValues.includes(value) 
        ? selectedValues.filter(v => v !== value) 
        : [...selectedValues, value]; 
      onChange(newSelected); 
  };
  
  const handleSelectAll = () => { 
      if (selectedValues.length === options.length) onChange([]); 
      else onChange(options.map(o => o.value)); 
  };
  
  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative w-full md:w-64 print:hidden" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm transition-all">
        <span className="truncate">
            {selectedValues.length === 0 ? placeholder : selectedValues.length === options.length ? "Todos selecionados" : `${selectedValues.length} selecionado(s)`}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-20">
             <div className="relative">
                <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-400" placeholder="Buscar..." />
             </div>
          </div>
          {filteredOptions.length > 0 && (
             <div onClick={handleSelectAll} className="px-3 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-xs font-bold text-blue-600 bg-slate-50">
              {selectedValues.length === options.length ? "Desmarcar Todos" : "Marcar Todos (Visíveis)"}
            </div>
          )}
          {filteredOptions.length === 0 ? <div className="p-3 text-sm text-slate-400 text-center">Nenhuma opção encontrada</div> : 
            filteredOptions.map((opt) => (
              <div key={opt.value} onClick={() => toggleOption(opt.value)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 text-sm text-slate-700 border-b border-slate-50 last:border-0">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedValues.includes(opt.value) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                  {selectedValues.includes(opt.value) && <Check size={12} className="text-white" />}
                </div>
                <span className="truncate">{opt.label}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};