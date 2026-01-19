import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  Upload, FileText, Activity, Calendar, Stethoscope, AlertCircle, ChevronDown, X, Check, Table, 
  FileDown, Image as ImageIcon, FileSpreadsheet, ArrowRightLeft, LayoutDashboard, MapPin, Users, Scale, Watch, Printer, List, Clock, AlertTriangle, Search, Sun, Moon
} from 'lucide-react';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO DE CORES E CONSTANTES ---
const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEK_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PERIOD_PRESETS = {
  '1º Tri': ['1','2','3'],
  '2º Tri': ['4','5','6'],
  '3º Tri': ['7','8','9'],
  '4º Tri': ['10','11','12'],
  '1º Sem': ['1','2','3','4','5','6'],
  '2º Sem': ['7','8','9','10','11','12']
};

const HOSPITAL_PROCEDURE_MAP = {
  '301060096': 'Primeiro atendimento', '0301060096': 'Primeiro atendimento', '9999999984': 'Primeiro atendimento', 
  '301060029': 'Pacientes em observação', '0301060029': 'Pacientes em observação', '9990000096': 'Pacientes em observação'
};

const OBS_CODES = ['301060029', '0301060029', '9990000096']; // Códigos considerados observação

const COLUMN_ALIASES = {
  unitCode: ['codigo_unidade', 'Codigo unidade', 'Cód. Unidade', 'cod_unidade'],
  unitName: ['nome_unidade', 'Nome unidade', 'Unidade', 'desc_unidade'],
  date: ['data_atendimento', 'Data atendimento', 'Data', 'dt_atend'],
  time: ['hora_atendimento', 'Hora atendimento', 'Hora', 'hr_atend'], 
  spec: ['nome_especialidade', 'Nome especialidade', 'Especialidade', 'CBO', 'cbo_descricao'],
  prof: ['nome_profissional', 'Profissional', 'Nome do Profissional', 'Medico'],
  procCode: ['codigo_procedimento', 'Codigo procedimento', 'Cód. Procedimento'],
  procName: ['nome_procedimento', 'Nome procedimento', 'Procedimento'],
  city: ['municipio', 'Municipio', 'Cidade', 'municipio_paciente', 'nome_municipio_paciente'], 
  age: ['idade', 'Idade', 'Idade atendimento paciente', 'idade_atendimento_paciente'],
  gender: ['sexo', 'Sexo', 'Genero']
};

const DEMAND_ALIASES = {
  reqDate: ['data_solicitacao', 'Data solicitacao'],
  service: ['nome', 'Nome', 'tipo_servico'],
  procedure: ['nome_procedimento', 'Procedimento'],
  procCode: ['codigo_procedimento', 'cod_procedimento'],
  unitRef: ['nom_und_ref', 'Unidade Referencia', 'codunidaderef'],
  priority: ['nome_prioridade', 'Prioridade'],
  patientId: ['numprontuario', 'Prontuario'],
  cboName: ['nome_cbo_executante', 'CBO Executante', 'cbo_executante'],
  age: ['idade', 'dt_nascimento', 'data_nascimento']
};

// --- HELPERS DE TEXTO (V3) ---
const fixEncoding = (str) => {
  if (str === null || str === undefined) return "";
  let newStr = String(str);
  
  const visualSpecifics = [
      { find: /Á%‰/g, replace: "É" },
      { find: /Á“/g, replace: "Ó" },
      { find: /clÁnico/gi, replace: "clínico" },
      { find: /REGULAÁ‡ÁO/g, replace: "REGULAÇÃO" },
      { find: /REGULAÃ‡ÃƒO/g, replace: "REGULAÇÃO" },
      { find: /ATENÁ‡ÁO/g, replace: "ATENÇÃO" },
      { find: /AVALIAÁ‡ÁO/g, replace: "AVALIAÇÃO" },
      { find: /COERÁŠNCIA/g, replace: "COERÊNCIA" }
  ];

  visualSpecifics.forEach(({ find, replace }) => {
     newStr = newStr.replace(find, replace);
  });

  const standardReplacements = {
    'Ã©': 'é', 'Ã¡': 'á', 'Ã£': 'ã', 'Ã³': 'ó', 'Ã´': 'ô', 'Ãª': 'ê',
    'Ã§': 'ç', 'Ãº': 'ú', 'Ã­': 'í', 'Ã\xad': 'í', 'Ã ': 'à', 'Ã¢': 'â',
    'Ã¶': 'ö', 'Ã‰': 'É', 'Ãƒ': 'Ã', 'Ã…': 'Å', 'Ã“': 'Ó', 'Ã”': 'Ô',
    'Ã•': 'Õ', 'Ã‚': 'Â', 'Ã€': 'À', 'Ã': 'Á', 'Ã‡': 'Ç', 'Ãš': 'Ú',
    'ÃÍ': 'Í', 'Ã‘': 'Ñ', 'Âº': 'º', 'Â°': '°',
    'Á‡': 'Ç', 'ÁŠ': 'Ê', 'Á+': 'Ã'
  };

  for (const [key, value] of Object.entries(standardReplacements)) {
     if (newStr.includes(key)) {
         newStr = newStr.split(key).join(value);
     }
  }
  return newStr.trim();
};

const normalizeHeader = (header, aliasMap = COLUMN_ALIASES) => {
  if (!header) return "";
  const cleanHeader = header.trim();
  for (const [key, aliases] of Object.entries(aliasMap)) {
    if (aliases.some(alias => cleanHeader.toLowerCase() === alias.toLowerCase())) return key;
  }
  return cleanHeader; 
};

// --- FUNÇÃO DE PLANTÃO ---
const getShift = (timeStr) => {
    if (!timeStr) return 'Indefinido';
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (isNaN(hour)) return 'Indefinido';
    // Diurno: 07:00 as 18:59 (>= 7 e <= 18)
    if (hour >= 7 && hour <= 18) return 'Diurno';
    // Noturno: 19:00 as 06:59
    return 'Noturno';
};

// --- COMPONENTES UI ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 break-inside-avoid mb-6 ${className} print:shadow-none print:border-slate-300 print:mb-8`}>
    {children}
  </div>
);

const Button = ({ children, onClick, active, className = "" }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-md font-medium transition-colors text-xs md:text-sm print:hidden border shadow-sm ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-blue-300'} ${className}`}>
    {children}
  </button>
);

const MultiSelect = ({ label, options = [], selectedValues = [], onChange, placeholder = "Selecione..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => { if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => { const newSelected = selectedValues.includes(value) ? selectedValues.filter(v => v !== value) : [...selectedValues, value]; onChange(newSelected); };
  const handleSelectAll = () => { if (selectedValues.length === options.length) onChange([]); else onChange(options.map(o => o.value)); };
  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative w-full md:w-64 print:hidden" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm transition-all">
        <span className="truncate">{selectedValues.length === 0 ? placeholder : selectedValues.length === options.length ? "Todos selecionados" : `${selectedValues.length} selecionado(s)`}</span>
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

// --- MOCK DATA ---
const generateMockData = () => {
  const mock = [];
  const specs = ['Clínico Geral', 'Pediatria', 'Ortopedia', 'Cardiologia', 'Dermatologia'];
  ['2024', '2025'].forEach(year => {
    for(let i=0; i<600; i++) {
        const month = Math.floor(Math.random() * 12) + 1;
        const age = Math.floor(Math.random() * 80) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const hour = Math.floor(Math.random() * (23 - 0 + 1)) + 0; // 00h as 23h
        const min = Math.random() > 0.5 ? '30' : '00';
        const dateObj = new Date(Number(year), month - 1, day);
        
        mock.push({
          unitCode: "104", unitName: "HOSPITAL RAYMUNDO CAMPOS", mes_final: month, ano_final: year,
          date: `${day < 10 ? '0'+day : day}/${month < 10 ? '0'+month : month}/${year}`, 
          dateObj: dateObj,
          time: `${hour < 10 ? '0'+hour : hour}:${min}`,
          spec: specs[Math.floor(Math.random() * specs.length)],
          prof: `Dr. Mock ${i}`, procCode: i % 5 === 0 ? '301060029' : '301060096', 
          procName: "PROCEDIMENTO HOSPITALAR",
          city: "OURO BRANCO - MG",
          age: age,
          ageGroup: age < 12 ? 'Criança (0-12)' : age < 18 ? 'Adolescente (13-18)' : age < 60 ? 'Adulto (19-59)' : 'Idoso (60+)'
        });
    }
  });
  return mock;
};

// --- EXPORT FUNCTIONS ---
const exportAsImage = async (elementId, fileName) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  try {
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff' });
    const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `${fileName}.png`; link.click();
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
  if (!dataForExcel) return <button onClick={handleImage} title="Baixar Imagem" className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 print:hidden"><FileDown size={18} /></button>;
  return (
    <div className="relative inline-block print:hidden" ref={menuRef}>
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
  const [activeTab, setActiveTab] = useState('atendimentos');
  const [reportTitle, setReportTitle] = useState('Painel de Gestão Hospitalar');

  const [rawData, setRawData] = useState([]);
  const [activeUnit, setActiveUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoData, setIsDemoData] = useState(true);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isLogScale, setIsLogScale] = useState(false);

  // --- STATES ATENDIMENTOS ---
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [selectedProcs, setSelectedProcs] = useState([]);
  const [selectedProfs, setSelectedProfs] = useState([]); 
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [compYear1, setCompYear1] = useState('');
  const [compYear2, setCompYear2] = useState('');

  // --- STATES DEMANDA REPRIMIDA ---
  const [demandData, setDemandData] = useState([]);
  const [demandFilters, setDemandFilters] = useState({ services: [], procedures: [], year: 'all', months: [] });

  useEffect(() => { 
      try { setRawData(generateMockData()); } catch (e) { console.error("Erro ao gerar dados:", e); }
  }, []);

  const handlePrint = () => { window.print(); };

  // --- LOGICA DE DATA COMPARACAO ---
  const handleCompYear1Change = (e) => {
    const val = e.target.value;
    setCompYear1(val);
    if (val > compYear2) setCompYear2(val);
  };
  const handleCompYear2Change = (e) => {
    const val = e.target.value;
    setCompYear2(val);
    if (val < compYear1) setCompYear1(val);
  };

  // --- MAPPING ATENDIMENTOS ---
  const availableUnits = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const unitsMap = new Map();
    rawData.forEach(item => {
      let code = String(item.unitCode || "").trim();
      let name = fixEncoding(item.unitName || `Unidade ${code}`);
      if (code && code !== "undefined" && code !== "null" && !unitsMap.has(code)) unitsMap.set(code, name);
    });
    if (isDemoData && unitsMap.size === 0) return [{ code: '104', name: 'HOSPITAL RAYMUNDO CAMPOS' }, { code: '51', name: 'CENTRO DE ESPECIALIDADES' }];
    return Array.from(unitsMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => { if (a.code === '104') return -1; if (b.code === '104') return 1; return a.name.localeCompare(b.name); });
  }, [rawData, isDemoData]);

  const availableYears = useMemo(() => {
    if (!rawData) return [];
    const years = new Set(rawData.map(d => d.ano_final).filter(y => y !== 'N/A'));
    return Array.from(years).sort().reverse();
  }, [rawData]);

  useEffect(() => { if (availableUnits.length > 0 && !availableUnits.find(u => u.code === activeUnit)) setActiveUnit(availableUnits[0].code); }, [availableUnits, activeUnit]);
  useEffect(() => { if (availableYears.length >= 1) { setSelectedYear(availableYears[0]); setCompYear1(availableYears[availableYears.length - 1]); setCompYear2(availableYears[0]); } }, [availableYears]);

  // --- UPLOAD CSV ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const fileName = file.name;

    const reader = new FileReader();
    reader.readAsText(file, "ISO-8859-1");
    reader.onload = (e) => {
      const text = e.target.result;
      if (!text) { setIsLoading(false); return; }
      const rows = text.split(/\r?\n/);
      if (rows.length < 2) { setIsLoading(false); return; }
      
      const firstLine = rows[0];
      const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
      const rawHeaders = rows[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
      
      const isDemanda = rawHeaders.some(h => normalizeHeader(h, DEMAND_ALIASES) === 'reqDate') || 
                        rawHeaders.some(h => normalizeHeader(h, DEMAND_ALIASES) === 'unitRef');

      if (isDemanda) {
          const headerMap = rawHeaders.map(h => normalizeHeader(h, DEMAND_ALIASES));
          const parsed = [];
          const now = new Date();
          for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            const values = rows[i].split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`));
            if (values.length >= rawHeaders.length - 1) {
               const rowObj = {};
               headerMap.forEach((key, index) => {
                   if (values[index]) rowObj[key] = fixEncoding(values[index].replace(/"/g, '').trim());
               });
               if (rowObj.reqDate) {
                  const parts = rowObj.reqDate.split('/');
                  if (parts.length === 3) {
                      let year = parseInt(parts[2]);
                      if (year === 1900) year = 2025;
                      const month = parseInt(parts[1]);
                      const day = parseInt(parts[0]);
                      const dt = new Date(year, month - 1, day);
                      rowObj.dateObj = dt;
                      rowObj.ano = String(year);
                      rowObj.mes = month;
                      const diffTime = Math.abs(now - dt);
                      rowObj.waitDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                  }
               }
               parsed.push(rowObj);
            }
          }
          setDemandData(parsed);
          setActiveTab('demanda');
          setReportTitle(`Painel de Demanda Reprimida - ${fileName.replace('.csv', '').replace(/_/g, ' ')}`);
          setIsLoading(false);
      } else {
          const headerMap = rawHeaders.map(h => normalizeHeader(h, COLUMN_ALIASES)); 
          const parsedData = [];
          for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            const values = rows[i].split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`));
            if (values.length >= rawHeaders.length - 1) {
              const rowObj = {};
              headerMap.forEach((key, index) => {
                if (values[index]) {
                  let val = values[index].replace(/"/g, '').trim();
                  if (['prof', 'spec', 'procName', 'unitName', 'city', 'nome_paciente'].includes(key)) val = fixEncoding(val);
                  if (key === 'time' && val.includes(' ')) {
                      const parts = val.split(' ');
                      if (parts[1] && parts[1].includes(':')) val = parts[1];
                      else if (parts[0] && parts[0].includes(':')) val = parts[0];
                  }
                  rowObj[key] = val; 
                }
              });
              let ano = 'N/A';
              let mes = 0;
              let dt = null;
              if (rowObj.date) {
                  const parts = rowObj.date.split('/');
                  if (parts.length === 3) { 
                    ano = parts[2]; mes = parseInt(parts[1]); dt = new Date(parts[2], parts[1]-1, parts[0]);
                  }
              }
              rowObj.ano_final = ano; rowObj.mes_final = mes; rowObj.dateObj = dt;
              if (rowObj.age) {
                  const age = parseInt(rowObj.age);
                  rowObj.ageGroup = age <= 12 ? 'Criança (0-12)' : age <= 18 ? 'Adolescente (13-18)' : age <= 59 ? 'Adulto (19-59)' : 'Idoso (60+)';
              }
              parsedData.push(rowObj);
            }
          }
          setRawData(parsedData); setIsDemoData(false); setReportTitle('Painel de Gestão Hospitalar'); setActiveTab('atendimentos'); setIsLoading(false);
      }
    };
  };

  // --- STATS ATENDIMENTOS ---
  const unitData = useMemo(() => {
    return rawData
      .filter(item => String(item.unitCode || "").trim() === activeUnit)
      .map(item => {
        const newItem = { ...item };
        const codProc = String(item.procCode || "").trim();
        const nomeProc = (item.procName || "").toUpperCase();
        if (activeUnit === '104') {
          if (HOSPITAL_PROCEDURE_MAP[codProc]) { newItem.display_procedure = HOSPITAL_PROCEDURE_MAP[codProc]; newItem.isValid = true; } 
          else newItem.isValid = false;
        } else {
          if (nomeProc.includes("ELETROCARDIOGRAMA")) newItem.isValid = false;
          else { newItem.display_procedure = item.procName || "Sem Nome"; newItem.isValid = true; }
        }
        return newItem;
      }).filter(item => item.isValid); 
  }, [rawData, activeUnit]);

  const specRankMap = useMemo(() => {
    const counts = {};
    unitData.forEach(item => {
        if (selectedYear !== 'all' && String(item.ano_final) !== selectedYear) return;
        if (selectedMonths.length > 0 && !selectedMonths.includes(String(item.mes_final))) return;
        const s = item.spec || "Não informado";
        counts[s] = (counts[s] || 0) + 1;
    });
    return Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
  }, [unitData, selectedYear, selectedMonths]);

  const getSpecColor = (specName) => {
    const idx = specRankMap.indexOf(specName);
    if (idx === -1) return '#cbd5e1'; 
    return COLORS[idx % COLORS.length];
  };

  const filterOptions = useMemo(() => {
    const specs = new Set(); const procs = new Set(); const profs = new Set();
    unitData.forEach(item => {
      if (item.spec) specs.add(item.spec);
      if (item.display_procedure) procs.add(item.display_procedure);
      if (item.prof) profs.add(item.prof);
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
      if (selectedMonths.length > 0 && !selectedMonths.includes(String(item.mes_final))) return false;
      if (selectedSpecs.length > 0 && !selectedSpecs.includes(item.spec)) return false;
      if (selectedProcs.length > 0 && !selectedProcs.includes(item.display_procedure)) return false;
      if (selectedProfs.length > 0 && !selectedProfs.includes(item.prof)) return false;
      if (dateRange.start && item.dateObj && item.dateObj < new Date(dateRange.start)) return false;
      if (dateRange.end && item.dateObj && item.dateObj > new Date(dateRange.end)) return false;
      return true;
    });
  }, [unitData, selectedYear, selectedMonths, selectedSpecs, selectedProcs, selectedProfs, dateRange]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const byMonthObj = {}; const bySpecObj = {}; const byProfObj = {}; const byCityObj = {}; const byAgeObj = {};
    const byWeekDayObj = {}; const byHourObj = {};
    const matrixMap = new Map(); // Mapa para a Matriz de Atendimentos (CORREÇÃO AQUI)

    for (let i = 1; i <= 12; i++) byMonthObj[i] = 0;
    WEEK_DAYS.forEach(d => byWeekDayObj[d] = 0);
    for (let h = 0; h < 24; h++) byHourObj[h] = 0;

    filteredData.forEach(item => {
      // --- Contadores Básicos ---
      if (item.mes_final >= 1 && item.mes_final <= 12) byMonthObj[item.mes_final] += 1;
      if (item.dateObj && !isNaN(item.dateObj)) {
          const dayName = WEEK_DAYS[item.dateObj.getDay()];
          if (dayName) byWeekDayObj[dayName] = (byWeekDayObj[dayName] || 0) + 1;
      }
      if (item.time) {
          const hour = parseInt(item.time.split(':')[0]);
          if (!isNaN(hour) && hour >= 0 && hour <= 23) byHourObj[hour] = (byHourObj[hour] || 0) + 1;
      }
      const spec = item.spec || "Não informado"; bySpecObj[spec] = (bySpecObj[spec] || 0) + 1;
      const city = item.city || "Não informado"; byCityObj[city] = (byCityObj[city] || 0) + 1;
      const ageGroup = item.ageGroup || "Não classificado"; byAgeObj[ageGroup] = (byAgeObj[ageGroup] || 0) + 1;
      
      // --- Lógica da Matriz de Atendimentos (RESTAURADA) ---
      if (activeUnit === '104') {
        const specName = item.spec || "Não informado";
        if (!matrixMap.has(specName)) {
            // Inicializa os 12 meses para esta especialidade
            const monthData = {};
            for (let i = 1; i <= 12; i++) monthData[i] = { total: 0, obs: 0 };
            matrixMap.set(specName, { spec: specName, months: monthData, totalGeral: 0 });
        }
        
        const specData = matrixMap.get(specName);
        const m = item.mes_final;
        if (m >= 1 && m <= 12) {
            specData.months[m].total += 1;
            specData.totalGeral += 1;
            if (OBS_CODES.includes(String(item.procCode))) {
                specData.months[m].obs += 1;
            }
        }
      }
      // ----------------------------------------------------

      // --- Lógica de Profissionais e Plantão ---
      const prof = item.prof || "Não informado";
      if (!byProfObj[prof]) {
          byProfObj[prof] = { name: prof, total: 0, days: new Set(), diurno_atend: 0, diurno_obs: 0, noturno_atend: 0, noturno_obs: 0 };
      }
      if (activeUnit === '104') byProfObj[prof][item.display_procedure] = (byProfObj[prof][item.display_procedure] || 0) + 1;
      byProfObj[prof].total += 1;
      if (item.date) byProfObj[prof].days.add(item.date);

      const shift = getShift(item.time);
      const isObs = OBS_CODES.includes(String(item.procCode));
      if (shift === 'Diurno') { isObs ? byProfObj[prof].diurno_obs++ : byProfObj[prof].diurno_atend++; } 
      else if (shift === 'Noturno') { isObs ? byProfObj[prof].noturno_obs++ : byProfObj[prof].noturno_atend++; }
    });

    // --- Formatação Final dos Dados ---
    const byMonth = Object.keys(byMonthObj).map(m => ({ name: MONTH_NAMES[parseInt(m)-1], index: parseInt(m), value: byMonthObj[m] })).sort((a, b) => a.index - b.index);
    const bySpec = Object.keys(bySpecObj).map(k => ({ name: k, value: bySpecObj[k] })).sort((a, b) => b.value - a.value);
    const byCity = Object.keys(byCityObj).map(k => ({ name: k, value: byCityObj[k], percent: total > 0 ? ((byCityObj[k]/total)*100).toFixed(1) : 0 })).sort((a, b) => b.value - a.value);
    const byAge = Object.keys(byAgeObj).map(k => ({ name: k, value: byAgeObj[k] }));
    const allProfs = Object.values(byProfObj).map(p => ({ ...p, daysCount: p.days.size || 1, avgPerDay: Math.round((p.total / (p.days.size || 1)) * 10) / 10 })).sort((a, b) => b.total - a.total);
    const byWeekDay = WEEK_DAYS.map(d => ({ name: d, value: byWeekDayObj[d] }));
    const byHour = Object.keys(byHourObj).map(h => ({ name: `${h}h`, value: byHourObj[h] }));

    // --- Finaliza os dados da Matriz (CORREÇÃO AQUI) ---
    const hospitalMatrixData = Array.from(matrixMap.values()).map(item => {
        const row = { spec: item.spec, totalGeral: item.totalGeral };
        // Achata o objeto months para dentro da linha (ex: row[1], row[2]...)
        Object.entries(item.months).forEach(([monthIdx, data]) => {
            row[monthIdx] = data;
        });
        return row;
    }).sort((a, b) => b.totalGeral - a.totalGeral);
    // ----------------------------------------------------

    const profKeys = new Set();
    allProfs.slice(0, 20).forEach(p => { Object.keys(p).forEach(k => { if (!['name', 'total', 'days', 'daysCount', 'avgPerDay', 'diurno_atend', 'diurno_obs', 'noturno_atend', 'noturno_obs'].includes(k)) profKeys.add(k); }); });

    return { total, byMonth, bySpec, byCity, byAge, byWeekDay, byHour, byProf: allProfs.slice(0, 20), allProfs, profKeys: Array.from(profKeys), hospitalMatrixData };
  }, [filteredData, activeUnit, specRankMap]);

  const comparisonData = useMemo(() => {
    if (!isComparisonMode || !compYear1 || !compYear2) return null;
    const baseData = rawData
        .filter(item => String(item.unitCode || "").trim() === activeUnit)
        .map(item => {
            const newItem = { ...item }; const codProc = String(item.procCode || "").trim(); const nomeProc = (item.procName || "").toUpperCase();
            if (activeUnit === '104') { if (HOSPITAL_PROCEDURE_MAP[codProc]) newItem.isValid = true; else newItem.isValid = false; } 
            else { if (nomeProc.includes("ELETROCARDIOGRAMA")) newItem.isValid = false; else newItem.isValid = true; }
            return newItem;
        }).filter(item => item.isValid);

    const filterByMonth = (d) => selectedMonths.length === 0 || selectedMonths.includes(String(d.mes_final));
    const d1 = baseData.filter(d => d.ano_final === compYear1 && filterByMonth(d));
    const d2 = baseData.filter(d => d.ano_final === compYear2 && filterByMonth(d));
    const total1 = d1.length;
    const total2 = d2.length;
    const growth = total1 > 0 ? ((total2 - total1) / total1) * 100 : 0;

    const monthlyComp = [];
    for(let i=1; i<=12; i++) {
        if (selectedMonths.length > 0 && !selectedMonths.includes(String(i))) continue;
        monthlyComp.push({ name: MONTH_NAMES[i-1], [compYear1]: d1.filter(d => d.mes_final === i).length, [compYear2]: d2.filter(d => d.mes_final === i).length });
    }
    const allSpecs = new Set([...d1.map(d => d.spec), ...d2.map(d => d.spec)]);
    const specDiff = Array.from(allSpecs).map(spec => {
        const v1 = d1.filter(d => d.spec === spec).length;
        const v2 = d2.filter(d => d.spec === spec).length;
        return { name: spec || "N/I", v1, v2, diff: v2 - v1 };
    }).sort((a, b) => b.diff - a.diff);
    return { monthlyComp, specDiff, total1, total2, growth };
  }, [isComparisonMode, compYear1, compYear2, activeUnit, rawData, selectedMonths]);

  // --- LOGICA DEMANDA REPRIMIDA ---
  const isSpecializedSelected = useMemo(() => {
      return demandFilters.services.some(s => s && s.toLowerCase().includes("especializada"));
  }, [demandFilters.services]);

  const demandOptions = useMemo(() => {
     const services = new Set();
     const procedures = new Set();
     const years = new Set();
     demandData.forEach(d => {
         if (d.service) services.add(d.service);
         if (d.procedure) procedures.add(d.procedure);
         if (d.ano) years.add(d.ano);
     });
     return {
         services: Array.from(services).sort().map(s => ({label: s, value: s})),
         procedures: Array.from(procedures).sort().map(p => ({label: p, value: p})),
         years: Array.from(years).sort().reverse().map(y => ({label: y, value: y})),
         months: MONTH_NAMES.map((name, idx) => ({ label: name, value: idx + 1 }))
     };
  }, [demandData]);

  const filteredDemand = useMemo(() => {
      return demandData.filter(item => {
          if (demandFilters.year !== 'all' && item.ano !== demandFilters.year) return false;
          if (demandFilters.services.length > 0 && !demandFilters.services.includes(item.service)) return false;
          if (demandFilters.procedures.length > 0 && !demandFilters.procedures.includes(item.procedure)) return false;
          if (demandFilters.months.length > 0 && !demandFilters.months.includes(item.mes)) return false;
          return true;
      });
  }, [demandData, demandFilters]);

  const demandStats = useMemo(() => {
      const total = filteredDemand.length;
      let totalWait = 0; let countWait = 0;
      const byService = {}; const byCbo = {}; const byUnit = {}; 
      const byProcedure = {}; 

      filteredDemand.forEach(item => {
          if (item.waitDays) { totalWait += item.waitDays; countWait++; }
          
          const s = item.service || 'Outros';
          const cbo = item.cboName || 'Não Informado';
          
          byService[s] = (byService[s] || 0) + 1;
          byCbo[cbo] = (byCbo[cbo] || 0) + 1;
          
          const pCode = item.procCode || 'N/A';
          const pName = item.procedure || 'Outros';
          const pKey = isSpecializedSelected ? `${pCode}|${pName}|${cbo}` : `${pCode}|${pName}`;
          
          if (!byProcedure[pKey]) {
              byProcedure[pKey] = { code: pCode, name: pName, cbo: cbo, count: 0 };
          }
          byProcedure[pKey].count++;

          const u = item.unitRef || 'Não Informado';
          byUnit[u] = (byUnit[u] || 0) + 1;
      });

      const avgWait = countWait > 0 ? Math.round(totalWait / countWait) : 0;
      const serviceChart = Object.keys(byService).map(k => ({ name: k, value: byService[k] })).sort((a,b) => b.value - a.value);
      const cboChart = Object.keys(byCbo).map(k => ({ name: k, value: byCbo[k] })).sort((a,b) => b.value - a.value);
      const unitChart = Object.keys(byUnit).map(k => ({ name: k, value: byUnit[k] })).sort((a,b) => b.value - a.value);
      const procedureTable = Object.values(byProcedure).sort((a,b) => b.count - a.count);
      const mainChart = isSpecializedSelected ? cboChart : serviceChart;

      return { total, avgWait, mainChart, unitChart, procedureTable };
  }, [filteredDemand, isSpecializedSelected]);

  const handleSpecChartClick = (data) => {
    if (data && data.name) {
      if (selectedSpecs.length === 1 && selectedSpecs.includes(data.name)) { setSelectedSpecs([]); } else { setSelectedSpecs([data.name]); }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div id="dashboard-content" className="max-w-7xl mx-auto bg-slate-50 p-2 md:p-4 rounded-xl">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2"><Activity className="text-blue-600" /> {reportTitle}</h1>
            <p className="text-slate-500 mt-1">
                {activeTab === 'atendimentos' 
                  ? `Relatório de atendimentos - ${availableUnits.find(u => u.code === activeUnit)?.name || `Unidade ${activeUnit}`}`
                  : 'Análise de fila de espera e demanda reprimida'
                }
            </p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto" data-html2canvas-ignore="true">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-md font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-all shadow-sm">
                <Printer size={18}/> Salvar PDF
            </button>
            
            {activeTab === 'atendimentos' && (
                <button onClick={() => setIsComparisonMode(!isComparisonMode)} className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-all shadow-sm ${isComparisonMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}>
                    {isComparisonMode ? <LayoutDashboard size={18}/> : <ArrowRightLeft size={18}/>} {isComparisonMode ? 'Voltar' : 'Comparar'}
                </button>
            )}

            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex flex-1 justify-center items-center gap-2 cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-md transition-colors font-medium text-sm">
                <Upload size={18} /> {isLoading ? 'Lendo...' : 'Carregar CSV'}
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              {isDemoData && activeTab === 'atendimentos' && <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded whitespace-nowrap"><AlertCircle size={14} /> Demo</span>}
            </div>
          </div>
        </div>

        {/* TABS DE NAVEGAÇÃO */}
        <div className="flex gap-1 mb-6 border-b border-slate-200" data-html2canvas-ignore="true">
            <button onClick={() => setActiveTab('atendimentos')} className={`px-6 py-3 font-bold text-sm rounded-t-lg border-t border-l border-r transition-all ${activeTab === 'atendimentos' ? 'bg-white text-blue-600 border-slate-200 -mb-px shadow-sm' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'}`}>Atendimentos</button>
            <button onClick={() => setActiveTab('demanda')} className={`px-6 py-3 font-bold text-sm rounded-t-lg border-t border-l border-r transition-all ${activeTab === 'demanda' ? 'bg-white text-blue-600 border-slate-200 -mb-px shadow-sm' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'}`}>Análise de Demanda Reprimida</button>
        </div>

        {/* --- CONTEÚDO: DEMANDA REPRIMIDA --- */}
        {activeTab === 'demanda' && (
            <div className="animate-in fade-in duration-500">
                {/* FILTROS DEMANDA */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col gap-4 print:hidden">
                    <div className="flex flex-wrap gap-4">
                        <div className="w-full md:w-32">
                             <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Ano Solic.</label>
                             <select value={demandFilters.year} onChange={e => setDemandFilters({...demandFilters, year: e.target.value})} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm">
                                 <option value="all">Todos</option>
                                 {demandOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                             </select>
                        </div>
                        <div className="flex flex-col gap-1">
                             <MultiSelect label="Meses" options={demandOptions.months} selectedValues={demandFilters.months} onChange={(v) => setDemandFilters({...demandFilters, months: v})} />
                        </div>
                        <MultiSelect label="Serviços" options={demandOptions.services} selectedValues={demandFilters.services} onChange={(v) => setDemandFilters({...demandFilters, services: v})} />
                        <MultiSelect label="Procedimentos" options={demandOptions.procedures} selectedValues={demandFilters.procedures} onChange={(v) => setDemandFilters({...demandFilters, procedures: v})} />
                        
                        <div className="flex items-end pb-1">
                            <button onClick={() => setDemandFilters({ services: [], procedures: [], year: 'all', months: [] })} className="text-sm text-red-500 font-medium flex items-center gap-1 hover:bg-red-50 px-3 py-2 rounded">
                                <X size={16} /> Limpar
                            </button>
                        </div>
                    </div>
                </div>

                {demandData.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                        <FileSpreadsheet size={48} className="mx-auto text-slate-300 mb-4"/>
                        <p className="text-slate-500 font-medium">Nenhum dado de demanda carregado.</p>
                        <p className="text-sm text-slate-400">Faça upload de uma planilha do tipo "Demanda Reprimida" para visualizar.</p>
                    </div>
                ) : (
                    <>
                    {/* KPIS DEMANDA */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="p-6 border-l-4 border-l-orange-500">
                             <div className="flex justify-between items-start">
                                 <div><p className="text-xs font-bold text-slate-400 uppercase">Fila Total</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{demandStats.total.toLocaleString()}</h3></div>
                                 <div className="p-3 bg-orange-50 rounded-full text-orange-600"><List size={24} /></div>
                             </div>
                             <p className="text-xs text-slate-400 mt-2">Procedimentos aguardando</p>
                        </Card>
                        <Card className="p-6 border-l-4 border-l-red-500">
                             <div className="flex justify-between items-start">
                                 <div><p className="text-xs font-bold text-slate-400 uppercase">Tempo Médio Espera</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{demandStats.avgWait} <span className="text-base font-normal text-slate-500">dias</span></h3></div>
                                 <div className="p-3 bg-red-50 rounded-full text-red-600"><Clock size={24} /></div>
                             </div>
                             <p className="text-xs text-slate-400 mt-2">Desde a solicitação até hoje</p>
                        </Card>
                        <Card className="p-6 border-l-4 border-l-blue-500">
                             <div className="flex justify-between items-start">
                                 <div><p className="text-xs font-bold text-slate-400 uppercase">{isSpecializedSelected ? "Maior CBO Demanda" : "Maior Serviço"}</p><h3 className="text-lg font-bold text-slate-800 mt-2 truncate w-48" title={demandStats.mainChart?.[0]?.name}>{demandStats.mainChart?.[0]?.name || '-'}</h3></div>
                                 <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Activity size={24} /></div>
                             </div>
                             <p className="text-sm text-blue-600 font-medium">{demandStats.mainChart?.[0]?.value || 0} solicitações</p>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <Card className="p-6">
                             <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><List size={20} className="text-orange-500" /> {isSpecializedSelected ? "Demanda por CBO Executante" : "Demanda por Serviço"}</h3><ExportWidget targetId="chart-servico" fileName="demanda_por_servico" /></div>
                             <div id="chart-servico" className="h-80 w-full bg-white p-2">
                                 <ResponsiveContainer width="100%" height="100%">
                                     <BarChart layout="vertical" data={(demandStats.mainChart || []).slice(0, 15)} margin={{top:5, right:30, left:80, bottom:5}}>
                                         <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                         <XAxis type="number" hide />
                                         <YAxis dataKey="name" type="category" width={180} tick={{fontSize:11}} interval={0} />
                                         <RechartsTooltip cursor={{fill:'#f8fafc'}} />
                                         <Bar dataKey="value" fill="#f97316" radius={[0,4,4,0]} name="Solicitações">
                                             {(demandStats.mainChart || []).slice(0,15).map((e,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                         </Bar>
                                     </BarChart>
                                 </ResponsiveContainer>
                             </div>
                        </Card>

                        <Card className="p-6">
                             <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-blue-500" /> Solicitações por Unidade de Referência</h3><ExportWidget targetId="chart-unidade-ref" fileName="demanda_por_unidade" dataForExcel={demandStats.unitChart} /></div>
                             <div className="overflow-x-auto">
                                <div id="chart-unidade-ref" className="max-h-80 overflow-y-auto bg-white px-2">
                                   <table className="w-full text-sm text-left text-slate-600">
                                       <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10">
                                            <tr><th className="px-4 py-3 font-bold border-b">Unidade</th><th className="px-4 py-3 font-bold border-b text-right">Solicitações</th></tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                            {demandStats.unitChart.map((unit, index) => (
                                                <tr key={index} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2 font-medium">{unit.name}</td>
                                                    <td className="px-4 py-2 text-right">{unit.value.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                       </tbody>
                                   </table>
                                </div>
                             </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-6 mb-6">
                        <Card className="p-0 border-t-4 border-t-purple-500 overflow-hidden">
                            <div className="p-6 pb-4 bg-white flex justify-between items-center"><div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><List size={20} className="text-slate-400" /> Procedimentos na Fila</h3></div><ExportWidget targetId="table-procs-demanda" fileName="tabela_procedimentos_demanda" dataForExcel={demandStats.procedureTable} /></div>
                            <div className="overflow-x-auto"><div id="table-procs-demanda" className="max-h-96 overflow-y-auto bg-white">
                                <table className="w-full text-sm text-left text-slate-600">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 font-bold border-b border-slate-200">Código</th>
                                            <th className="px-6 py-3 font-bold border-b border-slate-200">Procedimento</th>
                                            {isSpecializedSelected && <th className="px-6 py-3 font-bold border-b border-slate-200">CBO Executante</th>}
                                            <th className="px-6 py-3 font-bold border-b border-slate-200 text-right">Qtd.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {demandStats.procedureTable.map((proc, index) => (
                                            <tr key={index} className="bg-white hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3 text-slate-500 font-mono text-xs">{proc.code}</td>
                                                <td className="px-6 py-3 font-medium text-slate-900">{proc.name}</td>
                                                {isSpecializedSelected && <td className="px-6 py-3 text-slate-600 text-xs">{proc.cbo}</td>}
                                                <td className="px-6 py-3 text-right font-bold text-slate-700">{proc.count.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div></div>
                        </Card>
                    </div>
                    
                    <div className="mb-6">
                        <Card className="p-6 bg-blue-50 border-blue-100">
                             <h3 className="text-sm font-bold text-blue-800 mb-2">Resumo da Análise</h3>
                             <ul className="text-sm text-blue-700 space-y-2">
                                 <li>• Total de <strong>{demandStats.total}</strong> solicitações pendentes.</li>
                                 <li>• Tempo médio geral de espera: <strong>{demandStats.avgWait} dias</strong>.</li>
                                 <li>• Serviço mais requisitado: <strong>{demandStats.mainChart?.[0]?.name || '-'}</strong>.</li>
                                 <li>• Unidade com maior fila: <strong>{demandStats.unitChart?.[0]?.name || '-'}</strong>.</li>
                             </ul>
                        </Card>
                    </div>
                    </>
                )}
            </div>
        )}

        {/* --- VIEW: ATENDIMENTOS (ANTIGO) --- */}
        {activeTab === 'atendimentos' && (
           <div className="animate-in fade-in duration-500">
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col gap-4 print:hidden" data-html2canvas-ignore="true">
             <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
               {availableUnits.map((unit) => (
                 <Button key={unit.code} active={activeUnit === unit.code} onClick={() => setActiveUnit(unit.code)} className="flex items-center gap-2">
                   {unit.code === '104' ? '🏥' : '🩺'} <span className="truncate max-w-[150px] md:max-w-none" title={unit.name}>{unit.name.replace('HOSPITAL', 'Hosp.').replace('CENTRO DE ESPECIALIDADES', 'C. Esp.')} ({unit.code})</span>
                 </Button>
               ))}
             </div>

             <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                 {isComparisonMode ? (
                    <div className="flex gap-2 items-center bg-indigo-50 p-2 rounded border border-indigo-100">
                        <span className="text-xs font-bold text-indigo-700 uppercase">Comparar:</span>
                        <select value={compYear1} onChange={handleCompYear1Change} className="bg-white border border-indigo-200 rounded px-2 py-1 text-sm">{filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}</select>
                        <span className="text-indigo-400 font-bold">vs</span>
                        <select value={compYear2} onChange={handleCompYear2Change} className="bg-white border border-indigo-200 rounded px-2 py-1 text-sm">{filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}</select>
                    </div>
                 ) : (
                    <div className="w-full md:w-32"><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Ano</label><div className="relative"><select className="w-full appearance-none bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}><option value="all">Todos</option>{filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" /></div></div>
                 )}

                 <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                        {Object.entries(PERIOD_PRESETS).map(([label, months]) => (
                            <button key={label} onClick={() => setSelectedMonths(months)} className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-blue-100 text-slate-600 rounded border border-slate-200 transition-colors">{label}</button>
                        ))}
                    </div>
                    <MultiSelect label="Meses / Período" options={filterOptions.months} selectedValues={selectedMonths} onChange={setSelectedMonths} placeholder="Todos os meses" />
                 </div>

                 <MultiSelect label="Especialidades" options={filterOptions.specs} selectedValues={selectedSpecs} onChange={setSelectedSpecs} />
                 
                 {!isComparisonMode && (
                   <>
                       <MultiSelect label="Profissionais" options={filterOptions.profs} selectedValues={selectedProfs} onChange={setSelectedProfs} />
                       <MultiSelect label="Procedimentos" options={filterOptions.procs} selectedValues={selectedProcs} onChange={setSelectedProcs} />
                   </>
                 )}

                 <div className="flex flex-col">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Intervalo de Datas</label>
                    <div className="flex gap-2">
                        <input type="date" className="border border-slate-300 rounded px-2 py-1 text-sm" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                        <span className="text-slate-400">-</span>
                        <input type="date" className="border border-slate-300 rounded px-2 py-1 text-sm" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                    </div>
                 </div>

                 <div className="flex items-end pb-1">
                    <button onClick={() => { setSelectedYear('all'); setSelectedMonths([]); setSelectedSpecs([]); setSelectedProcs([]); setSelectedProfs([]); setDateRange({start:'', end:''}); }} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-2 rounded hover:bg-red-50 transition-colors"><X size={16} /> Limpar</button>
                 </div>
             </div>
           </div>

           {/* --- VIEW: COMPARAÇÃO --- */}
           {isComparisonMode && comparisonData ? (
               <div className="animate-in fade-in duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                       <Card className="p-6 flex flex-col justify-center items-center text-center"><p className="text-sm font-bold text-slate-400 uppercase">Volume {compYear1}</p><h3 className="text-3xl font-bold text-slate-700">{comparisonData.total1.toLocaleString()}</h3></Card>
                       <Card className="p-6 flex flex-col justify-center items-center text-center"><p className="text-sm font-bold text-slate-400 uppercase">Volume {compYear2}</p><h3 className="text-3xl font-bold text-slate-700">{comparisonData.total2.toLocaleString()}</h3></Card>
                       <Card className={`p-6 flex flex-col justify-center items-center text-center border-l-4 ${comparisonData.growth >= 0 ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                           <p className="text-sm font-bold text-slate-500 uppercase">Crescimento no Período</p>
                           <h3 className={`text-3xl font-bold ${comparisonData.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{comparisonData.growth >= 0 ? '+' : ''}{comparisonData.growth.toFixed(1)}%</h3>
                           <p className="text-xs text-slate-500 mt-1">Comparação entre os anos selecionados</p>
                       </Card>
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                       <Card className="p-6">
                           <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-indigo-500" /> Comparativo Mensal</h3><ExportWidget targetId="comp-mensal" fileName={`comparativo_mensal_${compYear1}_${compYear2}`} /></div>
                           <div id="comp-mensal" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><LineChart data={comparisonData.monthlyComp} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} /><YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} /><RechartsTooltip contentStyle={{backgroundColor:'#fff', borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} /><Legend /><Line type="monotone" dataKey={compYear1} stroke="#94a3b8" strokeWidth={3} dot={{r:4}} /><Line type="monotone" dataKey={compYear2} stroke="#4f46e5" strokeWidth={3} dot={{r:4}} /></LineChart></ResponsiveContainer></div>
                       </Card>
                       <Card className="p-6">
                           <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity size={20} className="text-indigo-500" /> Variação por Especialidade (Top 10)</h3><ExportWidget targetId="comp-diff" fileName={`variacao_especialidade_${compYear1}_${compYear2}`} /></div>
                           <div id="comp-diff" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={comparisonData.specDiff.slice(0, 10)} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={180} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} interval={0} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{backgroundColor:'#fff', borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} /><Legend /><Bar dataKey="diff" name="Variação Absoluta" fill="#8b5cf6" radius={[0, 4, 4, 0]}>{comparisonData.specDiff.slice(0, 10).map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.diff >= 0 ? '#22c55e' : '#ef4444'} />))}</Bar></BarChart></ResponsiveContainer></div>
                       </Card>
                   </div>
               </div>
           ) : (
               <div className="animate-in fade-in duration-500">
                   <div className="mb-6 p-3 border border-slate-200 rounded text-sm bg-blue-50/50 flex flex-wrap gap-4 print:hidden">
                       <span className="font-bold text-slate-700">Filtros Aplicados:</span>
                       <span>Ano: <strong>{selectedYear === 'all' ? 'Todos' : selectedYear}</strong></span>
                       <span>Período: <strong>{selectedMonths.length === 0 ? 'Todos' : selectedMonths.length === 12 ? 'Ano Completo' : `${selectedMonths.length} meses selecionados`}</strong></span>
                       {selectedSpecs.length > 0 && <span>Especialidades: <strong>{selectedSpecs.length}</strong></span>}
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                       <Card className="p-6 border-l-4 border-l-blue-500"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Total</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.total.toLocaleString()}</h3></div><div className="p-3 bg-blue-50 rounded-full text-blue-600"><FileText size={24} /></div></div>{activeUnit === '104' ? stats.total > 0 && <p className="text-xs text-slate-400 mt-2">Filtrado por: 1º Atendimento e Obs.</p> : <p className="text-xs text-slate-400 mt-2">Excluindo Eletrocardiograma</p>}</Card>
                       <Card className="p-6 border-l-4 border-l-green-500"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Especialidade</p><h3 className="text-xl font-bold text-slate-800 mt-2 truncate w-48" title={stats.bySpec[0]?.name}>{stats.bySpec[0]?.name || '-'}</h3><p className="text-sm text-green-600 font-medium">{stats.bySpec[0]?.value ? `${stats.bySpec[0].value.toLocaleString()} atendimentos` : 'N/A'}</p></div><div className="p-3 bg-green-50 rounded-full text-green-600"><Stethoscope size={24} /></div></div></Card>
                       <Card className="p-6 border-l-4 border-l-purple-500"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pico Mensal</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.byMonth.reduce((a, b) => (a.value > b.value ? a : b), {name: '-'}).name}</h3><p className="text-sm text-purple-600 font-medium">{stats.byMonth.reduce((a, b) => (a.value > b.value ? a : b), {value: 0}).value.toLocaleString()} atendimentos</p></div><div className="p-3 bg-purple-50 rounded-full text-purple-600"><Calendar size={24} /></div></div></Card>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                       <Card className="p-6">
                           <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-slate-400" /> Evolução Mensal</h3><ExportWidget targetId="chart-evolucao" fileName="evolucao_mensal" /></div>
                           <div id="chart-evolucao" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.byMonth} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} /><YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} /><RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Line type="monotone" dataKey="value" name="Atendimentos" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div>
                       </Card>
                       <Card className="p-6">
                           <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Stethoscope size={20} className="text-slate-400" /> Volume por Especialidade (Clique para Filtrar)</h3><ExportWidget targetId="chart-specs" fileName="volume_especialidade" /></div>
                           <div id="chart-specs" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={stats.bySpec.slice(0, 10)} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={180} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} interval={0} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                           <Bar dataKey="value" name="Atendimentos" radius={[0, 4, 4, 0]} onClick={handleSpecChartClick} cursor="pointer">
                               {stats.bySpec.slice(0, 10).map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={getSpecColor(entry.name)} />
                               ))}
                           </Bar>
                           </BarChart></ResponsiveContainer></div>
                       </Card>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                       <Card className="p-6">
                           <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-slate-400" /> Movimento por Dia da Semana</h3><ExportWidget targetId="chart-weekday" fileName="dias_semana" /></div>
                           <div id="chart-weekday" className="h-64 w-full bg-white p-2">
                               <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={stats.byWeekDay} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                       <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} />
                                       <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} />
                                       <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                                       <Bar dataKey="value" name="Atendimentos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                   </BarChart>
                               </ResponsiveContainer>
                           </div>
                       </Card>
                       <Card className="p-6">
                           <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Watch size={20} className="text-slate-400" /> Horários de Pico</h3><ExportWidget targetId="chart-hours" fileName="horarios_pico" /></div>
                           <div id="chart-hours" className="h-64 w-full bg-white p-2">
                               <ResponsiveContainer width="100%" height="100%">
                                   <AreaChart data={stats.byHour} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                       <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} interval={2} />
                                       <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} />
                                       <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                                       <Area type="monotone" dataKey="value" name="Atendimentos" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
                                   </AreaChart>
                               </ResponsiveContainer>
                           </div>
                       </Card>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                       <Card className="p-6 lg:col-span-1">
                           <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-slate-400" /> Faixa Etária</h3><ExportWidget targetId="chart-age" fileName="faixa_etaria" /></div>
                           <div id="chart-age" className="h-64 w-full bg-white p-2">
                               <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                       <Pie data={stats.byAge} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} fill="#8884d8" label={false}>
                                           {stats.byAge.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                       </Pie>
                                       <RechartsTooltip formatter={(value, name, props) => [`${value} (${(props.payload.percent * 100).toFixed(0)}%)`, name]} />
                                       <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                                   </PieChart>
                               </ResponsiveContainer>
                           </div>
                       </Card>
                       <Card className="p-0 border-t-4 border-t-blue-400 lg:col-span-2 overflow-hidden">
                           <div className="p-6 pb-4 bg-white flex justify-between items-center">
                               <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-slate-400" /> Atendimentos por Cidade</h3><div className="flex items-center gap-2 mt-1"><p className="text-sm text-slate-500">Origem dos pacientes</p><button onClick={() => setIsLogScale(!isLogScale)} className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border ${isLogScale ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-slate-500 border-slate-200'}`} title="Usar escala logarítmica para ver valores pequenos"><Scale size={12}/> {isLogScale ? 'Log' : 'Linear'}</button></div></div>
                               <ExportWidget targetId="table-city" fileName="tabela_cidades" dataForExcel={stats.byCity} />
                           </div>
                           <div className="overflow-x-auto">
                               <div id="table-city" className="max-h-64 overflow-y-auto bg-white px-4 pb-4">
                                   <table className="w-full text-sm text-left text-slate-600">
                                       <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10">
                                           <tr><th className="px-4 py-3 font-bold border-b">Cidade</th><th className="px-4 py-3 font-bold border-b text-right">Pacientes</th><th className="px-4 py-3 font-bold border-b text-right">%</th></tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                           {stats.byCity.map((city, index) => (
                                               <tr key={index} className="hover:bg-slate-50">
                                                   <td className="px-4 py-2 font-medium truncate max-w-xs" title={city.name}>{city.name}</td>
                                                   <td className="px-4 py-2 text-right">{city.value.toLocaleString()}</td>
                                                   <td className="px-4 py-2 text-right text-slate-400 text-xs">{city.percent}%</td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                           </div>
                       </Card>
                   </div>

                   {/* --- MATRIZ DE ATENDIMENTOS (CORRIGIDA) --- */}
                   {activeUnit === '104' && (
                       <Card className="p-0 border-t-4 border-t-blue-600 mb-8 overflow-hidden">
                           <div className="p-6 pb-4 bg-white flex justify-between items-center"><div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table size={20} className="text-slate-400" /> Matriz de Atendimentos</h3><p className="text-sm text-slate-500 mt-1">Visão detalhada por Especialidade e Mês</p></div><ExportWidget targetId="table-matriz" fileName="matriz_hospital" dataForExcel={stats.hospitalMatrixData} /></div>
                           <div className="overflow-x-auto">
                               <div id="table-matriz" className="max-h-96 overflow-y-auto bg-white">
                                   <table className="w-full text-xs text-left text-slate-600 border-collapse">
                                       <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10">
                                           <tr>
                                               <th className="px-4 py-3 font-bold border-b border-slate-200 text-left">Especialidade</th>
                                               {MONTH_NAMES.map(m => <th key={m} className="px-2 py-3 font-bold border-b border-slate-200 text-center">{m}</th>)}
                                               <th className="px-4 py-3 font-bold border-b border-slate-200 text-right bg-slate-200">Total</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                           {stats.hospitalMatrixData.map((row, idx) => (
                                               <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                                   <td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-100 text-left">{row.spec}</td>
                                                   {MONTH_NAMES.map((_, i) => (
                                                       <td key={i} className="px-2 py-2 text-center border-r border-slate-100">
                                                           <div className="flex flex-col items-center justify-center">
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
                           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Users size={20} className="text-slate-400" /> Produtividade por Profissional (Top 20)</h3>
                           <div className="h-96 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.byProf} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{fill: '#475569', fontSize: 11}} interval={0} /><YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Legend wrapperStyle={{ paddingTop: '20px' }} />{stats.profKeys.map((key, index) => (<Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={[index === stats.profKeys.length - 1 ? 4 : 0, index === stats.profKeys.length - 1 ? 4 : 0, 0, 0]} />))}</BarChart></ResponsiveContainer></div>
                       </Card>
                   )}

                   {/* --- TABELA DE PRODUTIVIDADE (CORRIGIDA) --- */}
                   <Card className="p-0 border-t-4 border-t-amber-400 overflow-hidden">
                       <div className="p-6 pb-4 bg-white flex justify-between items-center">
                           <div>
                               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table size={20} className="text-slate-400" /> Tabela de Produtividade</h3>
                               <p className="text-sm text-slate-500 mt-1">Detalhamento por turno (Diurno: 07h-18h59 | Noturno: 19h-06h59)</p>
                           </div>
                           <ExportWidget targetId="table-produtividade" fileName="tabela_produtividade" dataForExcel={stats.allProfs} />
                       </div>
                       <div className="overflow-x-auto">
                           <div id="table-produtividade" className="max-h-96 overflow-y-auto bg-white">
                               <table className="w-full text-sm text-left text-slate-600 border-collapse">
                                   <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10">
                                       <tr>
                                           <th rowSpan="2" className="px-6 py-3 font-bold border-b border-r border-slate-200 align-middle text-left">Profissional</th>
                                           <th rowSpan="2" className="px-4 py-3 font-bold border-b border-r border-slate-200 text-center align-middle">Dias</th>
                                           <th rowSpan="2" className="px-4 py-3 font-bold border-b border-r border-slate-200 text-center align-middle">Média/Dia</th>
                                           
                                           {activeUnit === '104' && (
                                               <>
                                                   <th colSpan="2" className="px-4 py-2 font-bold border-b border-r border-slate-200 text-center bg-sky-50 text-sky-800">
                                                       <div className="flex items-center justify-center gap-1"><Sun size={14}/> Plantão Diurno</div>
                                                   </th>
                                                   <th colSpan="2" className="px-4 py-2 font-bold border-b border-r border-slate-200 text-center bg-indigo-50 text-indigo-800">
                                                       <div className="flex items-center justify-center gap-1"><Moon size={14}/> Plantão Noturno</div>
                                                   </th>
                                               </>
                                           )}
                                           
                                           <th rowSpan="2" className="px-6 py-3 font-bold border-b border-slate-200 text-right align-middle bg-slate-200">Total Geral</th>
                                       </tr>
                                       {activeUnit === '104' && (
                                           <tr>
                                               <th className="px-4 py-2 font-bold border-b border-r border-slate-200 text-right bg-sky-50/50 text-xs">1º Atend.</th>
                                               <th className="px-4 py-2 font-bold border-b border-r border-slate-200 text-right bg-sky-50/50 text-xs">Obs.</th>
                                               
                                               <th className="px-4 py-2 font-bold border-b border-r border-slate-200 text-right bg-indigo-50/50 text-xs">1º Atend.</th>
                                               <th className="px-4 py-2 font-bold border-b border-r border-slate-200 text-right bg-indigo-50/50 text-xs">Obs.</th>
                                           </tr>
                                       )}
                                   </thead>
                                   <tbody className="divide-y divide-slate-100">
                                       {stats.allProfs.map((prof, index) => (
                                           <tr key={index} className="bg-white hover:bg-slate-50 transition-colors nao-cortar">
                                               <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap border-r border-slate-100 text-left">{prof.name}</td>
                                               <td className="px-4 py-3 text-center border-r border-slate-100"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold">{prof.daysCount}</span></td>
                                               <td className="px-4 py-3 text-center text-slate-500 border-r border-slate-100">{prof.avgPerDay.toLocaleString()}</td>
                                               
                                               {activeUnit === '104' && (
                                                   <>
                                                       <td className="px-4 py-3 text-right font-medium text-sky-700 bg-sky-50/20 border-r border-sky-100">{prof.diurno_atend > 0 ? prof.diurno_atend : '-'}</td>
                                                       <td className="px-4 py-3 text-right font-medium text-amber-600 bg-sky-50/20 border-r border-slate-200">{prof.diurno_obs > 0 ? prof.diurno_obs : '-'}</td>
                                                       
                                                       <td className="px-4 py-3 text-right font-medium text-indigo-700 bg-indigo-50/20 border-r border-indigo-100">{prof.noturno_atend > 0 ? prof.noturno_atend : '-'}</td>
                                                       <td className="px-4 py-3 text-right font-medium text-amber-600 bg-indigo-50/20 border-r border-slate-200">{prof.noturno_obs > 0 ? prof.noturno_obs : '-'}</td>
                                                   </>
                                               )}
                                               
                                               <td className="px-6 py-3 text-right font-bold text-slate-800 bg-slate-50">{prof.total.toLocaleString()}</td>
                                           </tr>
                                       ))}
                                       {stats.allProfs.length === 0 && (
                                           <tr><td colSpan={activeUnit === '104' ? 8 : 4} className="px-6 py-8 text-center text-slate-400">Nenhum profissional encontrado com os filtros atuais.</td></tr>
                                       )}
                                   </tbody>
                               </table>
                           </div>
                       </div>
                   </Card>
               </div>
           )}

           <footer className="mt-12 py-6 border-t border-slate-200 flex flex-col items-center gap-4 text-center">
             <div>
               <p className="text-slate-600 font-medium">Desenvolvido por <strong className="text-blue-700">Leandro de Paula Rodrigues - Vivver Sistemas</strong></p>
               <p className="text-xs text-slate-400 mt-1">Relatório gerado automaticamente • {new Date().toLocaleDateString()}</p>
             </div>
           </footer>
       </div>
       )}
     </div>
   </div>
 );
}