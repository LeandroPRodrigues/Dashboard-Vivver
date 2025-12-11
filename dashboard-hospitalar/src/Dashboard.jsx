import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, Cell
} from 'recharts';
import { 
  Upload, FileText, Activity, Calendar, Stethoscope, AlertCircle, Filter, ChevronDown, X, Check, Search, Info, User, Clock, Table, Download, AlertTriangle, 
  FileDown, Image as ImageIcon, FileSpreadsheet, ArrowRightLeft, LayoutDashboard
} from 'lucide-react';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// --- Constantes e Helpers ---
const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Mapeamento de Códigos para Hospital (Unidade 104)
const HOSPITAL_PROCEDURE_MAP = {
  '301060096': 'Primeiro atendimento',
  '0301060096': 'Primeiro atendimento',
  '9999999984': 'Primeiro atendimento', 
  
  '301060029': 'Pacientes em observação',
  '0301060029': 'Pacientes em observação',
  '9990000096': 'Pacientes em observação'
};

// --- Função Avançada de Correção de Codificação ---
const fixEncoding = (str) => {
  if (!str) return "";
  try {
    return decodeURIComponent(escape(str));
  } catch (e) {
    return str
      .replace(/Ã©/g, "é").replace(/Ã¡/g, "á").replace(/Ã£/g, "ã").replace(/Ã³/g, "ó").replace(/Ã´/g, "ô")
      .replace(/Ãª/g, "ê").replace(/Ã§/g, "ç").replace(/Ãº/g, "ú").replace(/Ã­/g, "í").replace(/Ã\xad/g, "í") 
      .replace(/Ã /g, "à").replace(/Ã¢/g, "â").replace(/Ã¶/g, "ö")
      .replace(/Ã‰/g, "É").replace(/Ãƒ/g, "Ã").replace(/Ã…/g, "Å").replace(/Ã“/g, "Ó").replace(/Ã”/g, "Ô")
      .replace(/Ã•/g, "Õ").replace(/Ã‚/g, "Â").replace(/Ã€/g, "À").replace(/Ã /g, "À").replace(/Ã/g, "Á")
      .replace(/Ã‡/g, "Ç").replace(/Ãš/g, "Ú").replace(/ÃÍ/g, "Í");
  }
};

// --- Componentes de UI ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 nao-cortar ${className} print:shadow-none print:border-slate-300`}>
    {children}
  </div>
);

const Button = ({ children, onClick, active, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md font-medium transition-colors text-xs md:text-sm print:hidden border shadow-sm ${
      active 
        ? 'bg-blue-600 text-white border-blue-600' 
        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-blue-300'
    } ${className}`}
  >
    {children}
  </button>
);

const MultiSelect = ({ label, options, selectedValues, onChange, placeholder = "Selecione..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    const newSelected = selectedValues.includes(value) ? selectedValues.filter(v => v !== value) : [...selectedValues, value];
    onChange(newSelected);
  };
  const handleSelectAll = () => {
    if (selectedValues.length === options.length) onChange([]); else onChange(options.map(o => o.value));
  };

  return (
    <div className="relative w-full md:w-64 print:hidden" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm transition-all">
        <span className="truncate">{selectedValues.length === 0 ? placeholder : selectedValues.length === options.length ? "Todos selecionados" : `${selectedValues.length} selecionado(s)`}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {options.length > 0 && (
             <div onClick={handleSelectAll} className="px-3 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-xs font-bold text-blue-600 sticky top-0 bg-white z-10">
              {selectedValues.length === options.length ? "Desmarcar Todos" : "Marcar Todos"}
            </div>
          )}
          {options.length === 0 ? <div className="p-3 text-sm text-slate-400 text-center">Nenhuma opção disponível</div> : 
            options.map((opt) => (
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

// --- Dados de Mock ---
const generateMockData = () => {
  const mock = [];
  const specs104 = ['Médico clínico', 'Médico pediatra', 'Médico ortopedista', 'Médico cirurgião'];
  const profs104 = ['Dr. João Silva', 'Dra. Maria Oliveira', 'Dr. Pedro Santos', 'Dra. Ana Costa', 'Dr. Lucas Pereira'];
  const procs104Codes = ['301060096', '9999999984', '301060029', '9990000096']; 
  const specs51 = ['Médico cardiologista', 'Médico angiologista', 'Médico dermatologista', 'Médico oftalmologista'];
  const profs51 = ['Dr. Carlos Souza', 'Dra. Fernanda Lima', 'Dr. Roberto Almeida', 'Dra. Juliana Martins'];
  const procs51 = ['Consulta Eletiva', 'Eletrocardiograma', 'Retorno', 'Exame Fundo de Olho'];

  // Gera dados para 2024 e 2025 para testar comparação
  ['2024', '2025'].forEach(year => {
    // Unidade 104
    for(let i=0; i<300; i++) {
      const code = procs104Codes[Math.floor(Math.random() * procs104Codes.length)];
      const day = Math.floor(Math.random() * 28) + 1;
      const month = Math.floor(Math.random() * 12) + 1;
      mock.push({
        codigo_unidade: "104", nome_unidade: "HOSPITAL RAYMUNDO CAMPOS", mes: month, ano: year,
        data_atendimento: `${day < 10 ? '0'+day : day}/${month < 10 ? '0'+month : month}/${year}`,
        nome_especialidade: specs104[Math.floor(Math.random() * specs104.length)],
        nome_profissional: profs104[Math.floor(Math.random() * profs104.length)],
        codigo_procedimento: code, nome_procedimento: "PROCEDIMENTO ORIGINAL CSV", 
      });
    }
    // Unidade 51
    for(let i=0; i<200; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const month = Math.floor(Math.random() * 12) + 1;
      mock.push({
        codigo_unidade: "51", nome_unidade: "CENTRO DE ESPECIALIDADES", mes: month, ano: year,
        data_atendimento: `${day < 10 ? '0'+day : day}/${month < 10 ? '0'+month : month}/${year}`,
        nome_especialidade: specs51[Math.floor(Math.random() * specs51.length)],
        nome_profissional: profs51[Math.floor(Math.random() * profs51.length)],
        codigo_procedimento: "0000000", nome_procedimento: procs51[Math.floor(Math.random() * procs51.length)],
      });
    }
  });
  return mock;
};

// --- Export Functions ---
const exportAsImage = async (elementId, fileName) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  try {
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff' });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${fileName}.png`;
    link.click();
  } catch (error) { console.error("Erro imagem:", error); }
};

const exportAsExcel = (data, fileName) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) { console.error("Erro excel:", error); }
};

const ExportWidget = ({ targetId, fileName, dataForExcel = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImage = () => { exportAsImage(targetId, fileName); setIsOpen(false); };
  const handleExcel = () => { if (dataForExcel) exportAsExcel(dataForExcel, fileName); setIsOpen(false); };

  if (!dataForExcel) return <button onClick={handleImage} className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100"><FileDown size={18} /></button>;

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 ${isOpen ? 'text-blue-600 bg-slate-50' : ''}`}><FileDown size={18} /></button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
          <button onClick={handleImage} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><ImageIcon size={14} className="text-purple-500"/> Baixar Imagem</button>
          <button onClick={handleExcel} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FileSpreadsheet size={14} className="text-green-500"/> Baixar Excel</button>
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const [rawData, setRawData] = useState([]);
  const [activeUnit, setActiveUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoData, setIsDemoData] = useState(true);
  
  // Modos de Visualização
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  // Estados dos Filtros Dashboard
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [selectedProcs, setSelectedProcs] = useState([]);
  const [selectedProfs, setSelectedProfs] = useState([]); 

  // Estados dos Filtros Comparação
  const [compYear1, setCompYear1] = useState('');
  const [compYear2, setCompYear2] = useState('');

  useEffect(() => { setRawData(generateMockData()); }, []);

  // Detectar Unidades e Anos
  const availableUnits = useMemo(() => {
    const unitsMap = new Map();
    rawData.forEach(item => {
      let code = String(item.codigo_unidade || "").trim();
      let name = fixEncoding(item.nome_unidade || `Unidade ${code}`);
      if (code && code !== "undefined" && code !== "null" && !unitsMap.has(code)) unitsMap.set(code, name);
    });
    if (isDemoData && unitsMap.size === 0) return [{ code: '104', name: 'HOSPITAL RAYMUNDO CAMPOS' }, { code: '51', name: 'CENTRO DE ESPECIALIDADES' }];
    return Array.from(unitsMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => { if (a.code === '104') return -1; if (b.code === '104') return 1; return a.name.localeCompare(b.name); });
  }, [rawData, isDemoData]);

  const availableYears = useMemo(() => {
    const years = new Set(rawData.map(d => d.ano_final).filter(y => y !== 'N/A'));
    return Array.from(years).sort().reverse();
  }, [rawData]);

  // Setar defaults
  useEffect(() => {
    if (availableUnits.length > 0 && !availableUnits.find(u => u.code === activeUnit)) setActiveUnit(availableUnits[0].code);
  }, [availableUnits]);

  useEffect(() => {
    if (availableYears.length >= 1) {
        setSelectedYear(availableYears[0]);
        setCompYear1(availableYears[0]);
        if (availableYears.length >= 2) setCompYear2(availableYears[1]);
        else setCompYear2(availableYears[0]);
    }
  }, [availableYears]);

  // Handle Upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.readAsText(file, "ISO-8859-1");
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = text.split(/\r?\n/);
      if (rows.length < 2) { setIsLoading(false); return; }
      const firstLine = rows[0];
      const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
      const headers = rows[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
      const parsedData = [];
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const values = rows[i].split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`));
        if (values.length >= headers.length - 1) {
          const rowObj = {};
          headers.forEach((header, index) => {
            if (values[index]) {
              let val = values[index].replace(/"/g, '').trim();
              if (['nome_profissional', 'nome_especialidade', 'nome_procedimento', 'nome_unidade'].includes(header)) val = fixEncoding(val);
              rowObj[header] = val;
            }
          });
          let ano = rowObj['ano'];
          if (!ano && rowObj['data_atendimento']) { const parts = rowObj['data_atendimento'].split('/'); if (parts.length === 3) ano = parts[2]; }
          rowObj['ano_final'] = ano ? String(ano).trim() : 'N/A';
          rowObj['mes_final'] = parseInt(rowObj['mes']) || 0;
          parsedData.push(rowObj);
        }
      }
      setRawData(parsedData); setIsDemoData(false); setIsLoading(false);
    };
  };

  // --- LÓGICA DO DASHBOARD PADRÃO ---
  const unitData = useMemo(() => {
    return rawData
      .filter(item => String(item.codigo_unidade || "").trim() === activeUnit)
      .map(item => {
        const newItem = { ...item };
        const codProc = String(item.codigo_procedimento || "").trim();
        const nomeProc = (item.nome_procedimento || "").toUpperCase();
        if (activeUnit === '104') {
          if (HOSPITAL_PROCEDURE_MAP[codProc]) { newItem.display_procedure = HOSPITAL_PROCEDURE_MAP[codProc]; newItem.isValid = true; } 
          else newItem.isValid = false;
        } else {
          if (nomeProc.includes("ELETROCARDIOGRAMA")) newItem.isValid = false;
          else { newItem.display_procedure = item.nome_procedimento || "Sem Nome"; newItem.isValid = true; }
        }
        return newItem;
      }).filter(item => item.isValid); 
  }, [rawData, activeUnit]);

  const filterOptions = useMemo(() => {
    const specs = new Set(); const procs = new Set(); const profs = new Set();
    unitData.forEach(item => {
      if (item.nome_especialidade) specs.add(item.nome_especialidade);
      if (item.display_procedure) procs.add(item.display_procedure);
      if (item.nome_profissional) profs.add(item.nome_profissional);
    });
    return {
      specs: Array.from(specs).sort().map(s => ({ label: s, value: s })),
      procs: Array.from(procs).sort().map(p => ({ label: p, value: p })),
      years: availableYears.map(y => ({ label: y, value: y })),
      profs: Array.from(profs).sort().map(p => ({ label: p, value: p })),
      months: MONTH_NAMES.map((name, idx) => ({ label: name, value: String(idx + 1) }))
    };
  }, [unitData, availableYears]);

  const filteredData = useMemo(() => {
    return unitData.filter(item => {
      if (selectedYear !== 'all' && String(item.ano_final) !== selectedYear) return false;
      if (selectedMonth !== 'all' && String(item.mes_final) !== selectedMonth) return false;
      if (selectedSpecs.length > 0 && !selectedSpecs.includes(item.nome_especialidade)) return false;
      if (selectedProcs.length > 0 && !selectedProcs.includes(item.display_procedure)) return false;
      if (selectedProfs.length > 0 && !selectedProfs.includes(item.nome_profissional)) return false;
      return true;
    });
  }, [unitData, selectedYear, selectedMonth, selectedSpecs, selectedProcs, selectedProfs]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const byMonthObj = {}; const bySpecObj = {}; const byProfObj = {}; 
    for (let i = 1; i <= 12; i++) byMonthObj[i] = 0;

    filteredData.forEach(item => {
      const mes = item.mes_final;
      if (mes >= 1 && mes <= 12) byMonthObj[mes] = (byMonthObj[mes] || 0) + 1;
      const spec = item.nome_especialidade || "Não informado";
      bySpecObj[spec] = (bySpecObj[spec] || 0) + 1;
      const prof = item.nome_profissional || "Não informado";
      const procType = item.display_procedure;
      const dataAtend = item.data_atendimento; 
      
      if (!byProfObj[prof]) byProfObj[prof] = { name: prof, total: 0, days: new Set() };
      if (activeUnit === '104') byProfObj[prof][procType] = (byProfObj[prof][procType] || 0) + 1;
      byProfObj[prof].total += 1;
      if (dataAtend) byProfObj[prof].days.add(dataAtend);
    });

    const byMonth = Object.keys(byMonthObj).map(m => ({ name: MONTH_NAMES[parseInt(m)-1], index: parseInt(m), value: byMonthObj[m] })).sort((a, b) => a.index - b.index);
    const bySpec = Object.keys(bySpecObj).map(k => ({ name: k, value: bySpecObj[k] })).sort((a, b) => b.value - a.value);
    const allProfs = Object.values(byProfObj).map(p => ({ ...p, daysCount: p.days.size || 1, avgPerDay: Math.round((p.total / (p.days.size || 1)) * 10) / 10 })).sort((a, b) => b.total - a.total);
    
    // Matriz Hospitalar
    const hospitalMatrixData = [];
    if (activeUnit === '104') {
        const specsSet = new Set(Object.keys(bySpecObj));
        specsSet.forEach(spec => {
            const row = { spec };
            let totalSpec = 0;
            // Inicializa meses
            for(let i=1; i<=12; i++) row[i] = { total: 0, obs: 0 };
            
            filteredData.filter(d => (d.nome_especialidade || "Não informado") === spec).forEach(d => {
                const m = d.mes_final;
                if(m >= 1 && m <= 12) {
                    row[m].total += 1;
                    totalSpec += 1;
                    if(String(d.codigo_procedimento) === '301060029' || String(d.codigo_procedimento) === '0301060029' || String(d.codigo_procedimento) === '9990000096') {
                        row[m].obs += 1;
                    }
                }
            });
            row.totalGeral = totalSpec;
            hospitalMatrixData.push(row);
        });
        hospitalMatrixData.sort((a, b) => b.totalGeral - a.totalGeral);
    }

    const profKeys = new Set();
    allProfs.slice(0, 20).forEach(p => { Object.keys(p).forEach(k => { if (!['name', 'total', 'days', 'daysCount', 'avgPerDay'].includes(k)) profKeys.add(k); }); });

    return { total, byMonth, bySpec, byProf: allProfs.slice(0, 20), allProfs, profKeys: Array.from(profKeys), hospitalMatrixData };
  }, [filteredData, activeUnit]);


  // --- LÓGICA DE COMPARAÇÃO (NOVA) ---
  const comparisonData = useMemo(() => {
    if (!isComparisonMode || !compYear1 || !compYear2) return null;

    // Filtra dados brutos para a unidade ativa, mas sem filtro de ano/mês do dashboard
    const baseData = rawData
        .filter(item => String(item.codigo_unidade || "").trim() === activeUnit)
        .map(item => {
            // Reaproveita lógica de validação
            const newItem = { ...item };
            const codProc = String(item.codigo_procedimento || "").trim();
            const nomeProc = (item.nome_procedimento || "").toUpperCase();
            if (activeUnit === '104') {
                if (HOSPITAL_PROCEDURE_MAP[codProc]) { newItem.display_procedure = HOSPITAL_PROCEDURE_MAP[codProc]; newItem.isValid = true; } 
                else newItem.isValid = false;
            } else {
                if (nomeProc.includes("ELETROCARDIOGRAMA")) newItem.isValid = false;
                else { newItem.display_procedure = item.nome_procedimento || "Sem Nome"; newItem.isValid = true; }
            }
            return newItem;
        })
        .filter(item => item.isValid);

    const dataYear1 = baseData.filter(d => d.ano_final === compYear1);
    const dataYear2 = baseData.filter(d => d.ano_final === compYear2);

    // Comparativo Mensal
    const monthlyComp = [];
    for(let i=1; i<=12; i++) {
        monthlyComp.push({
            name: MONTH_NAMES[i-1],
            [compYear1]: dataYear1.filter(d => d.mes_final === i).length,
            [compYear2]: dataYear2.filter(d => d.mes_final === i).length,
        });
    }

    // Comparativo Especialidade
    const allSpecs = new Set([...dataYear1.map(d => d.nome_especialidade), ...dataYear2.map(d => d.nome_especialidade)]);
    const specComp = Array.from(allSpecs).map(spec => ({
        name: spec || "Não informado",
        [compYear1]: dataYear1.filter(d => d.nome_especialidade === spec).length,
        [compYear2]: dataYear2.filter(d => d.nome_especialidade === spec).length,
    })).sort((a, b) => (b[compYear1] + b[compYear2]) - (a[compYear1] + a[compYear2])).slice(0, 15); // Top 15

    return { monthlyComp, specComp };
  }, [isComparisonMode, compYear1, compYear2, activeUnit, rawData]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div id="dashboard-content" className="max-w-7xl mx-auto bg-slate-50 p-2 md:p-4 rounded-xl">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="text-blue-600" />
              Painel de Gestão Hospitalar
            </h1>
            <p className="text-slate-500 mt-1">
              Relatório de atendimentos - {availableUnits.find(u => u.code === activeUnit)?.name || `Unidade ${activeUnit}`}
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto" data-html2canvas-ignore="true">
             {/* TOGGLE MODO DE VISUALIZAÇÃO */}
            <button
                onClick={() => setIsComparisonMode(!isComparisonMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-all shadow-sm ${isComparisonMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}
            >
                {isComparisonMode ? <LayoutDashboard size={18}/> : <ArrowRightLeft size={18}/>}
                {isComparisonMode ? 'Voltar ao Painel' : 'Comparar Anos'}
            </button>

            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex flex-1 justify-center items-center gap-2 cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-md transition-colors font-medium text-sm">
                <Upload size={18} />
                {isLoading ? 'Processando...' : 'Carregar CSV'}
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              {isDemoData && <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded whitespace-nowrap"><AlertCircle size={14} /> Demo</span>}
            </div>
          </div>
        </div>

        {/* Botões de Unidade (Sempre visíveis) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col gap-4" data-html2canvas-ignore="true">
          <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
            {availableUnits.map((unit) => (
              <Button key={unit.code} active={activeUnit === unit.code} onClick={() => setActiveUnit(unit.code)} className="flex items-center gap-2">
                {unit.code === '104' ? '🏥' : '🩺'} <span className="truncate max-w-[150px] md:max-w-none" title={unit.name}>{unit.name.replace('HOSPITAL', 'Hosp.').replace('CENTRO DE ESPECIALIDADES', 'C. Esp.')} ({unit.code})</span>
              </Button>
            ))}
          </div>

          {/* --- CONTROLES: MODO COMPARAÇÃO vs MODO DASHBOARD --- */}
          {isComparisonMode ? (
            <div className="flex flex-col md:flex-row gap-4 items-center bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-800 font-bold">
                    <ArrowRightLeft size={20}/>
                    <span>Modo Comparativo</span>
                </div>
                <div className="flex gap-4">
                    <select value={compYear1} onChange={e => setCompYear1(e.target.value)} className="bg-white border border-indigo-200 rounded px-3 py-1 text-sm font-medium">
                        {filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                    </select>
                    <span className="text-indigo-400 font-bold">vs</span>
                    <select value={compYear2} onChange={e => setCompYear2(e.target.value)} className="bg-white border border-indigo-200 rounded px-3 py-1 text-sm font-medium">
                        {filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                    </select>
                </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                {/* Filtros Normais */}
                <div className="w-full md:w-32">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Ano</label>
                    <div className="relative">
                        <select className="w-full appearance-none bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                        <option value="all">Todos</option>
                        {filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div className="w-full md:w-40">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Mês</label>
                    <div className="relative">
                        <select className="w-full appearance-none bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                        <option value="all">Todos</option>
                        {filterOptions.months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <MultiSelect label="Especialidades" options={filterOptions.specs} selectedValues={selectedSpecs} onChange={setSelectedSpecs} />
                <MultiSelect label="Profissionais" options={filterOptions.profs} selectedValues={selectedProfs} onChange={setSelectedProfs} />
                <MultiSelect label="Procedimentos" options={filterOptions.procs} selectedValues={selectedProcs} onChange={setSelectedProcs} />
                {(selectedYear !== 'all' || selectedMonth !== 'all' || selectedSpecs.length > 0 || selectedProcs.length > 0 || selectedProfs.length > 0) && (
                <div className="flex items-end pb-1"><button onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); setSelectedSpecs([]); setSelectedProcs([]); setSelectedProfs([]); }} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-2 rounded hover:bg-red-50 transition-colors"><X size={16} /> Limpar</button></div>
                )}
            </div>
          )}
        </div>

        {/* --- CONTEÚDO PRINCIPAL --- */}
        {isComparisonMode ? (
            /* --- VISÃO COMPARATIVA --- */
            <div className="animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-indigo-500" /> Comparativo Mensal ({compYear1} vs {compYear2})</h3>
                            <ExportWidget targetId="comp-mensal" fileName={`comparativo_mensal_${compYear1}_${compYear2}`} />
                        </div>
                        <div id="comp-mensal" className="h-80 w-full bg-white p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={comparisonData?.monthlyComp || []} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                                    <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                                    <RechartsTooltip contentStyle={{backgroundColor:'#fff', borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend />
                                    <Line type="monotone" dataKey={compYear1} stroke="#0ea5e9" strokeWidth={3} dot={{r:4}} />
                                    <Line type="monotone" dataKey={compYear2} stroke="#f97316" strokeWidth={3} dot={{r:4}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Stethoscope size={20} className="text-indigo-500" /> Comparativo por Especialidade</h3>
                            <ExportWidget targetId="comp-specs" fileName={`comparativo_specs_${compYear1}_${compYear2}`} />
                        </div>
                        <div id="comp-specs" className="h-80 w-full bg-white p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={comparisonData?.specComp || []} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={180} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} interval={0} />
                                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{backgroundColor:'#fff', borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend />
                                    <Bar dataKey={compYear1} fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey={compYear2} fill="#f97316" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        ) : (
            /* --- VISÃO DASHBOARD NORMAL --- */
            <div className="animate-in fade-in duration-500">
                {/* Resumo e KPIs */}
                <div className="mb-6 p-3 border border-slate-200 rounded text-sm bg-blue-50/50 flex flex-wrap gap-4">
                    <span className="font-bold text-slate-700">Filtros Aplicados:</span>
                    <span>Ano: <strong>{selectedYear === 'all' ? 'Todos' : selectedYear}</strong></span>
                    <span>Mês: <strong>{selectedMonth === 'all' ? 'Todos' : MONTH_NAMES[selectedMonth-1]}</strong></span>
                    {selectedSpecs.length > 0 && <span>Especialidades: <strong>{selectedSpecs.length}</strong></span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="p-6 border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Total</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.total.toLocaleString()}</h3></div>
                            <div className="p-3 bg-blue-50 rounded-full text-blue-600"><FileText size={24} /></div>
                        </div>
                        {activeUnit === '104' ? stats.total > 0 && <p className="text-xs text-slate-400 mt-2">Filtrado por: 1º Atendimento e Obs.</p> : <p className="text-xs text-slate-400 mt-2">Excluindo Eletrocardiograma</p>}
                    </Card>
                    <Card className="p-6 border-l-4 border-l-green-500">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Especialidade</p><h3 className="text-xl font-bold text-slate-800 mt-2 truncate w-48" title={stats.bySpec[0]?.name}>{stats.bySpec[0]?.name || '-'}</h3><p className="text-sm text-green-600 font-medium">{stats.bySpec[0]?.value ? `${stats.bySpec[0].value.toLocaleString()} atendimentos` : 'N/A'}</p></div>
                            <div className="p-3 bg-green-50 rounded-full text-green-600"><Stethoscope size={24} /></div>
                        </div>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-purple-500">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pico Mensal</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.byMonth.reduce((a, b) => (a.value > b.value ? a : b), {name: '-'}).name}</h3><p className="text-sm text-purple-600 font-medium">{stats.byMonth.reduce((a, b) => (a.value > b.value ? a : b), {value: 0}).value.toLocaleString()} atendimentos</p></div>
                            <div className="p-3 bg-purple-50 rounded-full text-purple-600"><Calendar size={24} /></div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-slate-400" /> Evolução Mensal</h3><ExportWidget targetId="chart-evolucao" fileName="evolucao_mensal" /></div>
                        <div id="chart-evolucao" className="h-80 w-full bg-white p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.byMonth} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Line type="monotone" dataKey="value" name="Atendimentos" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Stethoscope size={20} className="text-slate-400" /> Volume por Especialidade</h3><ExportWidget targetId="chart-specs" fileName="volume_especialidade" /></div>
                        <div id="chart-specs" className="h-80 w-full bg-white p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={stats.bySpec.slice(0, 10)} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={180} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} interval={0} />
                                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" name="Atendimentos" radius={[0, 4, 4, 0]}>
                                        {stats.bySpec.slice(0, 10).map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
                
                {/* --- MATRIZ HOSPITALAR (NOVO RECURSO) --- */}
                {activeUnit === '104' && (
                    <Card className="p-0 border-t-4 border-t-blue-600 mb-8 overflow-hidden">
                        <div className="p-6 pb-4 bg-white flex justify-between items-center">
                            <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table size={20} className="text-slate-400" /> Matriz de Atendimentos</h3><p className="text-sm text-slate-500 mt-1">Visão detalhada por Especialidade e Mês</p></div>
                            <ExportWidget targetId="table-matriz" fileName="matriz_hospital" dataForExcel={stats.hospitalMatrixData} />
                        </div>
                        <div className="overflow-x-auto">
                            <div id="table-matriz" className="max-h-96 overflow-y-auto bg-white">
                                <table className="w-full text-xs text-left text-slate-600 border-collapse">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-bold border-b border-slate-200">Especialidade</th>
                                            {MONTH_NAMES.map(m => <th key={m} className="px-2 py-3 font-bold border-b border-slate-200 text-center">{m}</th>)}
                                            <th className="px-4 py-3 font-bold border-b border-slate-200 text-right bg-slate-200">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {stats.hospitalMatrixData.map((row, idx) => (
                                            <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-100">{row.spec}</td>
                                                {MONTH_NAMES.map((_, i) => (
                                                    <td key={i} className="px-2 py-2 text-center border-r border-slate-100">
                                                        <div className="flex flex-col">
                                                            <span className={row[i+1].total > 0 ? "font-bold text-slate-700" : "text-slate-300"}>{row[i+1].total}</span>
                                                            {row[i+1].obs > 0 && <span className="text-[10px] text-amber-600">({row[i+1].obs} obs)</span>}
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2 text-right font-bold text-slate-900 bg-slate-50">{row.totalGeral}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Card>
                )}

                {activeUnit === '104' && (
                    <Card className="p-6 mb-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><User size={20} className="text-slate-400" /> Produtividade por Profissional (Top 20)</h3>
                        <div className="h-96 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.byProf} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{fill: '#475569', fontSize: 11}} interval={0} /><YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Legend wrapperStyle={{ paddingTop: '20px' }} />{stats.profKeys.map((key, index) => (<Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={[index === stats.profKeys.length - 1 ? 4 : 0, index === stats.profKeys.length - 1 ? 4 : 0, 0, 0]} />))}</BarChart></ResponsiveContainer></div>
                    </Card>
                )}

                <Card className="p-0 border-t-4 border-t-amber-400 overflow-hidden">
                    <div className="p-6 pb-4 bg-white flex justify-between items-center">
                        <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table size={20} className="text-slate-400" /> Tabela de Produtividade</h3><p className="text-sm text-slate-500 mt-1">Detalhamento de dias trabalhados e produtividade</p></div>
                        <ExportWidget targetId="table-produtividade" fileName="tabela_produtividade" dataForExcel={stats.allProfs} />
                    </div>
                    <div className="overflow-x-auto">
                        <div id="table-produtividade" className="max-h-96 overflow-y-auto bg-white">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 font-bold border-b border-slate-200">Profissional</th>
                                        <th className="px-6 py-3 font-bold border-b border-slate-200 text-center">Dias Trab.</th>
                                        <th className="px-6 py-3 font-bold border-b border-slate-200 text-center">Média/Dia</th>
                                        {activeUnit === '104' ? (<><th className="px-6 py-3 font-bold border-b border-slate-200 text-right bg-blue-50 text-blue-800">1º Atend.</th><th className="px-6 py-3 font-bold border-b border-slate-200 text-right bg-amber-50 text-amber-800">Observação</th></>) : null}
                                        <th className="px-6 py-3 font-bold border-b border-slate-200 text-right bg-slate-200">Total Geral</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.allProfs.map((prof, index) => (
                                        <tr key={index} className="bg-white hover:bg-slate-50 transition-colors nao-cortar">
                                            <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{prof.name}</td>
                                            <td className="px-6 py-3 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold">{prof.daysCount}</span></td>
                                            <td className="px-6 py-3 text-center text-slate-500">{prof.avgPerDay.toLocaleString()}</td>
                                            {activeUnit === '104' && (<><td className="px-6 py-3 text-right font-medium text-blue-600 bg-blue-50/30">{(prof['Primeiro atendimento'] || 0).toLocaleString()}</td><td className="px-6 py-3 text-right font-medium text-amber-600 bg-amber-50/30">{(prof['Pacientes em observação'] || 0).toLocaleString()}</td></>)}
                                            <td className="px-6 py-3 text-right font-bold text-slate-800 bg-slate-50">{prof.total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {stats.allProfs.length === 0 && (<tr><td colSpan={activeUnit === '104' ? 6 : 4} className="px-6 py-8 text-center text-slate-400">Nenhum profissional encontrado com os filtros atuais.</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
                <footer className="mt-12 py-6 border-t border-slate-200 text-center"><p className="text-slate-600 font-medium">Desenvolvido por <strong className="text-blue-700">Leandro de Paula Rodrigues - Vivver Sistemas</strong></p><p className="text-xs text-slate-400 mt-1">Relatório gerado automaticamente • {new Date().toLocaleDateString()}</p></footer>
            </div>
        )}
      </div>
    </div>
  );
}