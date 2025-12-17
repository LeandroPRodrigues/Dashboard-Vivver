import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { 
  Upload, FileText, Activity, Calendar, Stethoscope, AlertCircle, Filter, ChevronDown, X, Check, Search, Info, User, Clock, Table, Download, AlertTriangle, 
  FileDown, Image as ImageIcon, FileSpreadsheet, ArrowRightLeft, LayoutDashboard, MapPin, Users, Scale
} from 'lucide-react';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO DE CORES E CONSTANTES ---
const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const HOSPITAL_PROCEDURE_MAP = {
  '301060096': 'Primeiro atendimento', '0301060096': 'Primeiro atendimento', '9999999984': 'Primeiro atendimento', 
  '301060029': 'Pacientes em observação', '0301060029': 'Pacientes em observação', '9990000096': 'Pacientes em observação'
};

const COLUMN_ALIASES = {
  unitCode: ['codigo_unidade', 'Codigo unidade', 'Cód. Unidade', 'cod_unidade'],
  unitName: ['nome_unidade', 'Nome unidade', 'Unidade', 'desc_unidade'],
  date: ['data_atendimento', 'Data atendimento', 'Data', 'dt_atend'],
  spec: ['nome_especialidade', 'Nome especialidade', 'Especialidade', 'CBO', 'cbo_descricao'],
  prof: ['nome_profissional', 'Profissional', 'Nome do Profissional', 'Medico'],
  procCode: ['codigo_procedimento', 'Codigo procedimento', 'Cód. Procedimento'],
  procName: ['nome_procedimento', 'Nome procedimento', 'Procedimento'],
  city: ['municipio', 'Municipio', 'Cidade', 'municipio_paciente', 'nome_municipio_paciente'], 
  age: ['idade', 'Idade', 'Idade atendimento paciente', 'idade_atendimento_paciente'],
  gender: ['sexo', 'Sexo', 'Genero']
};

// --- HELPERS ---
const fixEncoding = (str) => {
  if (!str) return "";
  try { return decodeURIComponent(escape(str)); } catch (e) {
    return str.replace(/Ã©/g, "é").replace(/Ã¡/g, "á").replace(/Ã£/g, "ã").replace(/Ã³/g, "ó").replace(/Ã´/g, "ô").replace(/Ãª/g, "ê").replace(/Ã§/g, "ç").replace(/Ãº/g, "ú").replace(/Ã­/g, "í").replace(/Ã\xad/g, "í").replace(/Ã /g, "à").replace(/Ã¢/g, "â").replace(/Ã¶/g, "ö").replace(/Ã‰/g, "É").replace(/Ãƒ/g, "Ã").replace(/Ã…/g, "Å").replace(/Ã“/g, "Ó").replace(/Ã”/g, "Ô").replace(/Ã•/g, "Õ").replace(/Ã‚/g, "Â").replace(/Ã€/g, "À").replace(/Ã /g, "À").replace(/Ã/g, "Á").replace(/Ã‡/g, "Ç").replace(/Ãš/g, "Ú").replace(/ÃÍ/g, "Í");
  }
};

const normalizeHeader = (header) => {
  const cleanHeader = header.trim();
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => cleanHeader.toLowerCase() === alias.toLowerCase())) return key;
  }
  return cleanHeader; 
};

// --- COMPONENTES UI ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 nao-cortar ${className} print:shadow-none print:border-slate-300`}>
    {children}
  </div>
);

const Button = ({ children, onClick, active, className = "" }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-md font-medium transition-colors text-xs md:text-sm print:hidden border shadow-sm ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-blue-300'} ${className}`}>
    {children}
  </button>
);

const MultiSelect = ({ label, options, selectedValues, onChange, placeholder = "Selecione..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const toggleOption = (value) => { const newSelected = selectedValues.includes(value) ? selectedValues.filter(v => v !== value) : [...selectedValues, value]; onChange(newSelected); };
  const handleSelectAll = () => { if (selectedValues.length === options.length) onChange([]); else onChange(options.map(o => o.value)); };

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

// --- MOCK DATA ---
const generateMockData = () => {
  const mock = [];
  const specs = ['Clínico Geral', 'Pediatria', 'Ortopedia', 'Cardiologia', 'Dermatologia'];
  const cities = ['OURO BRANCO - MG', 'CONGONHAS - MG', 'CONSELHEIRO LAFAIETE - MG', 'BELO HORIZONTE - MG', 'JECEABA - MG'];
  ['2024', '2025'].forEach(year => {
    // Gerar Ouro Branco Massivo
    for(let i=0; i<1200; i++) {
        const month = Math.floor(Math.random() * 12) + 1;
        const age = Math.floor(Math.random() * 80) + 1;
        mock.push({
          unitCode: "104", unitName: "HOSPITAL RAYMUNDO CAMPOS", mes_final: month, ano_final: year,
          date: `15/${month}/${year}`, spec: specs[Math.floor(Math.random() * specs.length)],
          prof: `Dr. ${i}`, procCode: i % 5 === 0 ? '301060029' : '301060096', 
          procName: "PROCEDIMENTO HOSPITALAR",
          city: "OURO BRANCO - MG",
          age: age,
          ageGroup: age < 12 ? 'Criança (0-12)' : age < 18 ? 'Adolescente (13-18)' : age < 60 ? 'Adulto (19-59)' : 'Idoso (60+)'
        });
    }
    // Gerar outras cidades menores
    for(let i=0; i<50; i++) {
        const month = Math.floor(Math.random() * 12) + 1;
        const age = Math.floor(Math.random() * 80) + 1;
        mock.push({
          unitCode: "104", unitName: "HOSPITAL RAYMUNDO CAMPOS", mes_final: month, ano_final: year,
          date: `15/${month}/${year}`, spec: specs[Math.floor(Math.random() * specs.length)],
          prof: `Dr. ${i}`, procCode: i % 5 === 0 ? '301060029' : '301060096', 
          procName: "PROCEDIMENTO HOSPITALAR",
          city: cities[Math.floor(Math.random() * (cities.length - 1)) + 1],
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

  if (!dataForExcel) return <button onClick={handleImage} title="Baixar Imagem" className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100"><FileDown size={18} /></button>;
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
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  
  // Filtros
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [selectedProcs, setSelectedProcs] = useState([]);
  const [selectedProfs, setSelectedProfs] = useState([]); 

  const [compYear1, setCompYear1] = useState('');
  const [compYear2, setCompYear2] = useState('');

  useEffect(() => { setRawData(generateMockData()); }, []);

  // --- DETECÇÃO INTELIGENTE DE UNIDADES ---
  const availableUnits = useMemo(() => {
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
    const years = new Set(rawData.map(d => d.ano_final).filter(y => y !== 'N/A'));
    return Array.from(years).sort().reverse();
  }, [rawData]);

  useEffect(() => { if (availableUnits.length > 0 && !availableUnits.find(u => u.code === activeUnit)) setActiveUnit(availableUnits[0].code); }, [availableUnits]);
  useEffect(() => { if (availableYears.length >= 1) { setSelectedYear(availableYears[0]); setCompYear1(availableYears[0]); setCompYear2(availableYears[1] || availableYears[0]); } }, [availableYears]);

  // --- DRILL-DOWN HANDLER ---
  const handleSpecChartClick = (data) => {
    if (data && data.name) {
      if (selectedSpecs.length === 1 && selectedSpecs.includes(data.name)) {
        setSelectedSpecs([]); // Limpa se já estiver selecionado
      } else {
        setSelectedSpecs([data.name]); // Seleciona se não estiver
      }
    }
  };

  // --- UPLOAD COM SMART MAPPING ---
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
      
      const rawHeaders = rows[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
      const headerMap = rawHeaders.map(h => normalizeHeader(h)); 

      const parsedData = [];
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const values = rows[i].split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`));
        if (values.length >= rawHeaders.length - 1) {
          const rowObj = {};
          headerMap.forEach((key, index) => {
            if (values[index]) {
              let val = values[index].replace(/"/g, '').trim();
              if (['prof', 'spec', 'procName', 'unitName', 'city'].includes(key)) val = fixEncoding(val);
              rowObj[key] = val; 
            }
          });

          let ano = 'N/A';
          let mes = 0;
          if (rowObj.date) {
             const parts = rowObj.date.split('/');
             if (parts.length === 3) { ano = parts[2]; mes = parseInt(parts[1]); }
          }
          rowObj.ano_final = ano;
          rowObj.mes_final = mes;

          if (rowObj.age) {
             const age = parseInt(rowObj.age);
             rowObj.ageGroup = age <= 12 ? 'Criança (0-12)' : age <= 18 ? 'Adolescente (13-18)' : age <= 59 ? 'Adulto (19-59)' : 'Idoso (60+)';
          }

          parsedData.push(rowObj);
        }
      }
      setRawData(parsedData); setIsDemoData(false); setIsLoading(false);
    };
  };

  // --- DADOS FILTRADOS (LÓGICA CENTRAL) ---
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

  // --- RANKING PARA CORES FIXAS ---
  // Calculamos a ordem das especialidades IGNORANDO o filtro de especialidade,
  // mas respeitando Ano e Mês. Isso garante que a cor 2 seja sempre a cor 2.
  const specRankMap = useMemo(() => {
    const counts = {};
    unitData.forEach(item => {
        // Aplica filtro de ano/mês se houver
        if (selectedYear !== 'all' && String(item.ano_final) !== selectedYear) return;
        if (selectedMonth !== 'all' && String(item.mes_final) !== selectedMonth) return;
        
        const s = item.spec || "Não informado";
        counts[s] = (counts[s] || 0) + 1;
    });
    // Retorna array de nomes ordenado por volume
    const sortedSpecs = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
    return sortedSpecs;
  }, [unitData, selectedYear, selectedMonth]);

  const getSpecColor = (specName) => {
    const idx = specRankMap.indexOf(specName);
    if (idx === -1) return '#cbd5e1'; // Cinza se não achar
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
      if (selectedMonth !== 'all' && String(item.mes_final) !== selectedMonth) return false;
      if (selectedSpecs.length > 0 && !selectedSpecs.includes(item.spec)) return false;
      if (selectedProcs.length > 0 && !selectedProcs.includes(item.display_procedure)) return false;
      if (selectedProfs.length > 0 && !selectedProfs.includes(item.prof)) return false;
      return true;
    });
  }, [unitData, selectedYear, selectedMonth, selectedSpecs, selectedProcs, selectedProfs]);

  // --- ESTATÍSTICAS ---
  const stats = useMemo(() => {
    const total = filteredData.length;
    const byMonthObj = {}; const bySpecObj = {}; const byProfObj = {}; const byCityObj = {}; const byAgeObj = {};
    for (let i = 1; i <= 12; i++) byMonthObj[i] = 0;

    filteredData.forEach(item => {
      if (item.mes_final >= 1 && item.mes_final <= 12) byMonthObj[item.mes_final] += 1;
      
      const spec = item.spec || "Não informado"; bySpecObj[spec] = (bySpecObj[spec] || 0) + 1;
      const city = item.city || "Não informado"; byCityObj[city] = (byCityObj[city] || 0) + 1;
      const ageGroup = item.ageGroup || "Não classificado"; byAgeObj[ageGroup] = (byAgeObj[ageGroup] || 0) + 1;

      const prof = item.prof || "Não informado";
      if (!byProfObj[prof]) byProfObj[prof] = { name: prof, total: 0, days: new Set() };
      if (activeUnit === '104') byProfObj[prof][item.display_procedure] = (byProfObj[prof][item.display_procedure] || 0) + 1;
      byProfObj[prof].total += 1;
      if (item.date) byProfObj[prof].days.add(item.date);
    });

    const byMonth = Object.keys(byMonthObj).map(m => ({ name: MONTH_NAMES[parseInt(m)-1], index: parseInt(m), value: byMonthObj[m] })).sort((a, b) => a.index - b.index);
    // Ordenar specs pelo valor atual, mas a cor virá do specRankMap
    const bySpec = Object.keys(bySpecObj).map(k => ({ name: k, value: bySpecObj[k] })).sort((a, b) => b.value - a.value);
    
    // Cidades (Para tabela) - Ordenadas
    const byCity = Object.keys(byCityObj).map(k => ({ name: k, value: byCityObj[k], percent: ((byCityObj[k]/total)*100).toFixed(1) })).sort((a, b) => b.value - a.value);
    
    const byAge = Object.keys(byAgeObj).map(k => ({ name: k, value: byAgeObj[k] }));
    
    const allProfs = Object.values(byProfObj).map(p => ({ ...p, daysCount: p.days.size || 1, avgPerDay: Math.round((p.total / (p.days.size || 1)) * 10) / 10 })).sort((a, b) => b.total - a.total);
    
    const hospitalMatrixData = [];
    if (activeUnit === '104') {
        new Set(Object.keys(bySpecObj)).forEach(spec => {
            const row = { spec }; let totalSpec = 0; for(let i=1; i<=12; i++) row[i] = { total: 0, obs: 0 };
            filteredData.filter(d => (d.spec || "Não informado") === spec).forEach(d => {
                if(d.mes_final >= 1 && d.mes_final <= 12) {
                    row[d.mes_final].total += 1; totalSpec += 1;
                    if(['301060029','0301060029','9990000096'].includes(String(d.procCode))) row[d.mes_final].obs += 1;
                }
            });
            row.totalGeral = totalSpec; hospitalMatrixData.push(row);
        });
        hospitalMatrixData.sort((a, b) => b.totalGeral - a.totalGeral);
    }

    const profKeys = new Set();
    allProfs.slice(0, 20).forEach(p => { Object.keys(p).forEach(k => { if (!['name', 'total', 'days', 'daysCount', 'avgPerDay'].includes(k)) profKeys.add(k); }); });

    return { total, byMonth, bySpec, byCity, byAge, byProf: allProfs.slice(0, 20), allProfs, profKeys: Array.from(profKeys), hospitalMatrixData };
  }, [filteredData, activeUnit, specRankMap]);

  // --- COMPARAÇÃO ---
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

    const d1 = baseData.filter(d => d.ano_final === compYear1);
    const d2 = baseData.filter(d => d.ano_final === compYear2);

    const total1 = d1.length;
    const total2 = d2.length;
    const growth = total1 > 0 ? ((total2 - total1) / total1) * 100 : 0;

    const monthlyComp = [];
    for(let i=1; i<=12; i++) {
        monthlyComp.push({ name: MONTH_NAMES[i-1], [compYear1]: d1.filter(d => d.mes_final === i).length, [compYear2]: d2.filter(d => d.mes_final === i).length });
    }

    const allSpecs = new Set([...d1.map(d => d.spec), ...d2.map(d => d.spec)]);
    const specDiff = Array.from(allSpecs).map(spec => {
        const v1 = d1.filter(d => d.spec === spec).length;
        const v2 = d2.filter(d => d.spec === spec).length;
        return { name: spec || "N/I", v1, v2, diff: v2 - v1 };
    }).sort((a, b) => b.diff - a.diff);

    return { monthlyComp, specDiff, total1, total2, growth };
  }, [isComparisonMode, compYear1, compYear2, activeUnit, rawData]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div id="dashboard-content" className="max-w-7xl mx-auto bg-slate-50 p-2 md:p-4 rounded-xl">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2"><Activity className="text-blue-600" /> Painel de Gestão Hospitalar</h1>
            <p className="text-slate-500 mt-1">Relatório de atendimentos - {availableUnits.find(u => u.code === activeUnit)?.name || `Unidade ${activeUnit}`}</p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto" data-html2canvas-ignore="true">
            <button onClick={() => setIsComparisonMode(!isComparisonMode)} className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-all shadow-sm ${isComparisonMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}>
                {isComparisonMode ? <LayoutDashboard size={18}/> : <ArrowRightLeft size={18}/>} {isComparisonMode ? 'Voltar ao Painel' : 'Comparar Anos'}
            </button>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex flex-1 justify-center items-center gap-2 cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-md transition-colors font-medium text-sm">
                <Upload size={18} /> {isLoading ? 'Processando...' : 'Carregar CSV'}
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              {isDemoData && <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded whitespace-nowrap"><AlertCircle size={14} /> Demo</span>}
            </div>
          </div>
        </div>

        {/* BARRA DE UNIDADES */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col gap-4" data-html2canvas-ignore="true">
          <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
            {availableUnits.map((unit) => (
              <Button key={unit.code} active={activeUnit === unit.code} onClick={() => setActiveUnit(unit.code)} className="flex items-center gap-2">
                {unit.code === '104' ? '🏥' : '🩺'} <span className="truncate max-w-[150px] md:max-w-none" title={unit.name}>{unit.name.replace('HOSPITAL', 'Hosp.').replace('CENTRO DE ESPECIALIDADES', 'C. Esp.')} ({unit.code})</span>
              </Button>
            ))}
          </div>

          {/* FILTROS */}
          {isComparisonMode ? (
            <div className="flex flex-col md:flex-row gap-4 items-center bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-800 font-bold"><ArrowRightLeft size={20}/> <span>Modo Comparativo</span></div>
                <div className="flex gap-4">
                    <select value={compYear1} onChange={e => setCompYear1(e.target.value)} className="bg-white border border-indigo-200 rounded px-3 py-1 text-sm font-medium">{filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}</select>
                    <span className="text-indigo-400 font-bold">vs</span>
                    <select value={compYear2} onChange={e => setCompYear2(e.target.value)} className="bg-white border border-indigo-200 rounded px-3 py-1 text-sm font-medium">{filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}</select>
                </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                <div className="w-full md:w-32"><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Ano</label><div className="relative"><select className="w-full appearance-none bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}><option value="all">Todos</option>{filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" /></div></div>
                <div className="w-full md:w-40"><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Mês</label><div className="relative"><select className="w-full appearance-none bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}><option value="all">Todos</option>{filterOptions.months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" /></div></div>
                <MultiSelect label="Especialidades" options={filterOptions.specs} selectedValues={selectedSpecs} onChange={setSelectedSpecs} />
                <MultiSelect label="Profissionais" options={filterOptions.profs} selectedValues={selectedProfs} onChange={setSelectedProfs} />
                <MultiSelect label="Procedimentos" options={filterOptions.procs} selectedValues={selectedProcs} onChange={setSelectedProcs} />
                {(selectedYear !== 'all' || selectedMonth !== 'all' || selectedSpecs.length > 0 || selectedProcs.length > 0 || selectedProfs.length > 0) && (<div className="flex items-end pb-1"><button onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); setSelectedSpecs([]); setSelectedProcs([]); setSelectedProfs([]); }} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-2 rounded hover:bg-red-50 transition-colors"><X size={16} /> Limpar</button></div>)}
            </div>
          )}
        </div>

        {/* --- VIEW: COMPARAÇÃO --- */}
        {isComparisonMode && comparisonData ? (
            <div className="animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card className="p-6 flex flex-col justify-center items-center text-center"><p className="text-sm font-bold text-slate-400 uppercase">Volume {compYear1}</p><h3 className="text-3xl font-bold text-slate-700">{comparisonData.total1.toLocaleString()}</h3></Card>
                    <Card className="p-6 flex flex-col justify-center items-center text-center"><p className="text-sm font-bold text-slate-400 uppercase">Volume {compYear2}</p><h3 className="text-3xl font-bold text-slate-700">{comparisonData.total2.toLocaleString()}</h3></Card>
                    <Card className={`p-6 flex flex-col justify-center items-center text-center border-l-4 ${comparisonData.growth >= 0 ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}><p className="text-sm font-bold text-slate-500 uppercase">Variação YoY</p><h3 className={`text-3xl font-bold ${comparisonData.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{comparisonData.growth >= 0 ? '+' : ''}{comparisonData.growth.toFixed(1)}%</h3><p className="text-xs text-slate-500 mt-1">Crescimento Relativo</p></Card>
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
            /* --- VIEW: DASHBOARD NORMAL --- */
            <div className="animate-in fade-in duration-500">
                <div className="mb-6 p-3 border border-slate-200 rounded text-sm bg-blue-50/50 flex flex-wrap gap-4">
                    <span className="font-bold text-slate-700">Filtros Aplicados:</span>
                    <span>Ano: <strong>{selectedYear === 'all' ? 'Todos' : selectedYear}</strong></span>
                    <span>Mês: <strong>{selectedMonth === 'all' ? 'Todos' : MONTH_NAMES[selectedMonth-1]}</strong></span>
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
                        {/* CORES CORRIGIDAS AQUI - Usando getSpecColor */}
                        <div id="chart-specs" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={stats.bySpec.slice(0, 10)} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={180} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} interval={0} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" name="Atendimentos" radius={[0, 4, 4, 0]} onClick={handleSpecChartClick} cursor="pointer">
                            {stats.bySpec.slice(0, 10).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getSpecColor(entry.name)} />
                            ))}
                        </Bar>
                        </BarChart></ResponsiveContainer></div>
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
                    {/* TABELA DE CIDADES */}
                    <Card className="p-0 border-t-4 border-t-blue-400 lg:col-span-2 overflow-hidden">
                        <div className="p-6 pb-4 bg-white flex justify-between items-center">
                            <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-slate-400" /> Atendimentos por Cidade</h3><p className="text-sm text-slate-500 mt-1">Origem dos pacientes</p></div>
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

                {/* MATRIZ HOSPITALAR */}
                {activeUnit === '104' && (
                    <Card className="p-0 border-t-4 border-t-blue-600 mb-8 overflow-hidden">
                        <div className="p-6 pb-4 bg-white flex justify-between items-center"><div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table size={20} className="text-slate-400" /> Matriz de Atendimentos</h3><p className="text-sm text-slate-500 mt-1">Visão detalhada por Especialidade e Mês</p></div><ExportWidget targetId="table-matriz" fileName="matriz_hospital" dataForExcel={stats.hospitalMatrixData} /></div>
                        <div className="overflow-x-auto"><div id="table-matriz" className="max-h-96 overflow-y-auto bg-white"><table className="w-full text-xs text-left text-slate-600 border-collapse"><thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10"><tr><th className="px-4 py-3 font-bold border-b border-slate-200">Especialidade</th>{MONTH_NAMES.map(m => <th key={m} className="px-2 py-3 font-bold border-b border-slate-200 text-center">{m}</th>)}<th className="px-4 py-3 font-bold border-b border-slate-200 text-right bg-slate-200">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{stats.hospitalMatrixData.map((row, idx) => (<tr key={idx} className="bg-white hover:bg-slate-50 transition-colors"><td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-100">{row.spec}</td>{MONTH_NAMES.map((_, i) => (<td key={i} className="px-2 py-2 text-center border-r border-slate-100"><div className="flex flex-col"><span className={row[i+1].total > 0 ? "font-bold text-slate-700" : "text-slate-300"}>{row[i+1].total}</span>{row[i+1].obs > 0 && <span className="text-[10px] text-amber-600">({row[i+1].obs} obs)</span>}</div></td>))}<td className="px-4 py-2 text-right font-bold text-slate-900 bg-slate-50">{row.totalGeral}</td></tr>))}</tbody></table></div></div>
                    </Card>
                )}
                
                {activeUnit === '104' && (
                    <Card className="p-6 mb-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><User size={20} className="text-slate-400" /> Produtividade por Profissional (Top 20)</h3>
                        <div className="h-96 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.byProf} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{fill: '#475569', fontSize: 11}} interval={0} /><YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Legend wrapperStyle={{ paddingTop: '20px' }} />{stats.profKeys.map((key, index) => (<Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={[index === stats.profKeys.length - 1 ? 4 : 0, index === stats.profKeys.length - 1 ? 4 : 0, 0, 0]} />))}</BarChart></ResponsiveContainer></div>
                    </Card>
                )}

                <Card className="p-0 border-t-4 border-t-amber-400 overflow-hidden">
                    <div className="p-6 pb-4 bg-white flex justify-between items-center"><div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table size={20} className="text-slate-400" /> Tabela de Produtividade</h3><p className="text-sm text-slate-500 mt-1">Detalhamento de dias trabalhados e produtividade</p></div><ExportWidget targetId="table-produtividade" fileName="tabela_produtividade" dataForExcel={stats.allProfs} /></div>
                    <div className="overflow-x-auto"><div id="table-produtividade" className="max-h-96 overflow-y-auto bg-white"><table className="w-full text-sm text-left text-slate-600"><thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10"><tr><th className="px-6 py-3 font-bold border-b border-slate-200">Profissional</th><th className="px-6 py-3 font-bold border-b border-slate-200 text-center">Dias Trab.</th><th className="px-6 py-3 font-bold border-b border-slate-200 text-center">Média/Dia</th>{activeUnit === '104' ? (<><th className="px-6 py-3 font-bold border-b border-slate-200 text-right bg-blue-50 text-blue-800">1º Atend.</th><th className="px-6 py-3 font-bold border-b border-slate-200 text-right bg-amber-50 text-amber-800">Observação</th></>) : null}<th className="px-6 py-3 font-bold border-b border-slate-200 text-right bg-slate-200">Total Geral</th></tr></thead><tbody className="divide-y divide-slate-100">{stats.allProfs.map((prof, index) => (<tr key={index} className="bg-white hover:bg-slate-50 transition-colors nao-cortar"><td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{prof.name}</td><td className="px-6 py-3 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold">{prof.daysCount}</span></td><td className="px-6 py-3 text-center text-slate-500">{prof.avgPerDay.toLocaleString()}</td>{activeUnit === '104' && (<><td className="px-6 py-3 text-right font-medium text-blue-600 bg-blue-50/30">{(prof['Primeiro atendimento'] || 0).toLocaleString()}</td><td className="px-6 py-3 text-right font-medium text-amber-600 bg-amber-50/30">{(prof['Pacientes em observação'] || 0).toLocaleString()}</td></>)}<td className="px-6 py-3 text-right font-bold text-slate-800 bg-slate-50">{prof.total.toLocaleString()}</td></tr>))}{stats.allProfs.length === 0 && (<tr><td colSpan={activeUnit === '104' ? 6 : 4} className="px-6 py-8 text-center text-slate-400">Nenhum profissional encontrado com os filtros atuais.</td></tr>)}</tbody></table></div></div>
                </Card>
                <footer className="mt-12 py-6 border-t border-slate-200 text-center"><p className="text-slate-600 font-medium">Desenvolvido por <strong className="text-blue-700">Leandro de Paula Rodrigues - Vivver Sistemas</strong></p><p className="text-xs text-slate-400 mt-1">Relatório gerado automaticamente • {new Date().toLocaleDateString()}</p></footer>
            </div>
        )}
      </div>
    </div>
  );
}