import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  Upload, FileText, Activity, Calendar, Stethoscope, AlertCircle, X, Table, 
  ArrowRightLeft, LayoutDashboard, MapPin, Users, Watch, Printer, List, Clock, Sun, Moon, Trash2, ClipboardPlus
} from 'lucide-react';

// --- IMPORTAÇÕES MODULARIZADAS ---
import { Card } from './components/Card.jsx';
import { Button } from './components/Button.jsx';
import { MultiSelect } from './components/MultiSelect.jsx';
import { ExportWidget } from './components/ExportWidget.jsx';

import { 
  COLORS, YEAR_COLORS, MONTH_NAMES, WEEK_DAYS, PERIOD_PRESETS, 
  HOSPITAL_PROCEDURE_MAP, OBS_CODES, ATEND_CODES 
} from './utils/constants.js';

import { getShift, fixEncoding } from './utils/helpers.js';
import { processFiles } from './utils/dataProcessor.js';

const generateMockData = () => {
  const mock = [];
  const specs = ['Clínico Geral', 'Pediatria', 'Ortopedia', 'Cardiologia', 'Dermatologia'];
  ['2024', '2025', '2026'].forEach(year => {
    for(let i=0; i<600; i++) {
        const month = Math.floor(Math.random() * 12) + 1;
        const age = Math.floor(Math.random() * 80) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const hour = Math.floor(Math.random() * (23 - 0 + 1)) + 0; 
        const min = Math.random() > 0.5 ? '30' : '00';
        const dateObj = new Date(Number(year), month - 1, day);
        
        mock.push({
          unitCode: "104", unitName: "HOSPITAL RAYMUNDO CAMPOS", mes_final: month, ano_final: year,
          date: `${day < 10 ? '0'+day : day}/${month < 10 ? '0'+month : month}/${year}`, 
          dateObj: dateObj, time: `${hour < 10 ? '0'+hour : hour}:${min}`,
          spec: specs[Math.floor(Math.random() * specs.length)],
          prof: `Dr. Mock ${i}`, procCode: i % 5 === 0 ? '301060029' : '301060096', 
          procName: "PROCEDIMENTO HOSPITALAR", city: "OURO BRANCO - MG", age: age,
          hasEvolucao: Math.random() > 0.7, 
          ageGroup: age < 12 ? 'Criança (0-12)' : age < 18 ? 'Adolescente (13-18)' : age < 60 ? 'Adulto (19-59)' : 'Idoso (60+)'
        });
    }
  });
  return mock;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('atendimentos');
  const [reportTitle, setReportTitle] = useState('Painel de Gestão Hospitalar');

  const [rawData, setRawData] = useState([]);
  const [activeUnit, setActiveUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoData, setIsDemoData] = useState(true);
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [selectedProcs, setSelectedProcs] = useState([]);
  const [selectedProfs, setSelectedProfs] = useState([]); 
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [compYears, setCompYears] = useState([]);
  const [demandData, setDemandData] = useState([]);
  const [demandFilters, setDemandFilters] = useState({ services: [], procedures: [], year: 'all', months: [] });

  useEffect(() => { 
      try { setRawData(generateMockData()); } catch (e) { console.error("Erro ao gerar dados:", e); }
  }, []);

  const handlePrint = () => { window.print(); };

  const availableUnits = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const unitsMap = new Map();
    rawData.forEach(item => {
      let code = String(item.unitCode || "").trim();
      let name = fixEncoding(item.unitName || `Unidade ${code}`);
      if (code && code !== "undefined" && code !== "null" && !unitsMap.has(code)) unitsMap.set(code, name);
    });
    if (isDemoData && unitsMap.size === 0) return [{ code: '104', name: 'HOSPITAL RAYMUNDO CAMPOS' }];
    return Array.from(unitsMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => { if (a.code === '104') return -1; if (b.code === '104') return 1; return a.name.localeCompare(b.name); });
  }, [rawData, isDemoData]);

  const availableYears = useMemo(() => {
    if (!rawData) return [];
    const years = new Set(rawData.map(d => String(d.ano_final)).filter(y => y !== 'N/A' && y !== 'undefined'));
    return Array.from(years).sort().reverse();
  }, [rawData]);

  useEffect(() => { if (availableUnits.length > 0 && !availableUnits.find(u => u.code === activeUnit)) setActiveUnit(availableUnits[0].code); }, [availableUnits, activeUnit]);
  useEffect(() => { 
      if (availableYears.length >= 1) { 
          setSelectedYear(availableYears[0]);
          setCompYears(availableYears.slice(0, Math.min(4, availableYears.length))); 
      } 
  }, [availableYears]);

  const handleClearData = () => {
      if(window.confirm("Tem certeza que deseja limpar todos os dados carregados?")) {
          setRawData([]); setDemandData([]); setIsDemoData(true);
          setReportTitle('Painel de Gestão Hospitalar');
          try { setRawData(generateMockData()); } catch (e) {}
      }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    setIsLoading(true);

    try {
        const { newAtendimentos, newDemanda, fileReportTitle } = await processFiles(files);

        if (newAtendimentos.length > 0) {
            setRawData(prev => {
                const base = isDemoData ? [] : prev;
                return [...base, ...newAtendimentos];
            });
            setIsDemoData(false);
            if(!reportTitle.includes('Demanda')) setReportTitle('Painel de Gestão Hospitalar (Consolidado)');
            setActiveTab('atendimentos');
        }
        
        if (newDemanda.length > 0) {
            setDemandData(prev => [...prev, ...newDemanda]);
            if(newAtendimentos.length === 0) {
                 setActiveTab('demanda');
                 setReportTitle(`Painel de Demanda Reprimida - ${fileReportTitle || 'Importado'}`);
            }
        }
        
        if (newAtendimentos.length === 0 && newDemanda.length === 0) {
            alert("Nenhum dado válido encontrado. Verifique se o formato do ficheiro está correto.");
        }
    } catch (error) {
        console.error("Erro no processamento:", error);
        alert("Erro ao ler o ficheiro. Certifique-se de que é um formato válido.");
    }

    setIsLoading(false);
    event.target.value = '';
  };

  const unitData = useMemo(() => {
    return rawData
      .filter(item => String(item.unitCode || "").trim() === activeUnit)
      .map(item => {
        const newItem = { ...item };
        const codProc = String(item.procCode || "").trim();
        const nomeProc = (item.procName || "PROCEDIMENTO NÃO INFORMADO").toUpperCase();
        
        if (activeUnit === '104') {
          // ==========================================
          // FILTRO SUPER RIGOROSO PARA A UNIDADE 104
          // ==========================================
          if (OBS_CODES.includes(codProc)) {
              newItem.display_procedure = 'Pacientes em observação';
              newItem.isValid = true;
          } else if (ATEND_CODES.includes(codProc)) {
              newItem.display_procedure = 'Primeiro atendimento';
              newItem.isValid = true;
          } else {
              // Descarta procedimentos secundários que inflam os números
              newItem.isValid = false; 
          }
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
    let totalEvolucoes = 0; 
    
    const byMonthObj = {}; const bySpecObj = {}; const byProfObj = {}; const byCityObj = {}; const byAgeObj = {};
    const byWeekDayObj = {}; const byHourObj = {};
    const matrixMap = new Map(); 

    for (let i = 1; i <= 12; i++) byMonthObj[i] = 0;
    WEEK_DAYS.forEach(d => byWeekDayObj[d] = 0);
    for (let h = 0; h < 24; h++) byHourObj[h] = 0;

    filteredData.forEach(item => {
      if (item.hasEvolucao) totalEvolucoes++; 

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
      
      const isObs = OBS_CODES.includes(String(item.procCode).trim());

      if (activeUnit === '104') {
        const specName = item.spec || "Não informado";
        if (!matrixMap.has(specName)) {
            const monthData = {};
            for (let i = 1; i <= 12; i++) monthData[i] = { total: 0, obs: 0 };
            matrixMap.set(specName, { spec: specName, months: monthData, totalGeral: 0 });
        }
        const specData = matrixMap.get(specName);
        const m = item.mes_final;
        if (m >= 1 && m <= 12) {
            specData.months[m].total += 1;
            specData.totalGeral += 1;
            if (isObs) specData.months[m].obs += 1;
        }
      }

      const prof = item.prof || "Não informado";
      if (!byProfObj[prof]) {
          byProfObj[prof] = { name: prof, total: 0, days: new Set(), diurno_atend: 0, diurno_obs: 0, noturno_atend: 0, noturno_obs: 0 };
      }
      if (activeUnit === '104') byProfObj[prof][item.display_procedure] = (byProfObj[prof][item.display_procedure] || 0) + 1;
      byProfObj[prof].total += 1;
      
      if (item.date) byProfObj[prof].days.add(item.date);

      const shift = getShift(item.time);
      if (shift === 'Diurno') { isObs ? byProfObj[prof].diurno_obs++ : byProfObj[prof].diurno_atend++; } 
      else if (shift === 'Noturno') { isObs ? byProfObj[prof].noturno_obs++ : byProfObj[prof].noturno_atend++; }
    });

    const byMonth = Object.keys(byMonthObj).map(m => ({ name: MONTH_NAMES[parseInt(m)-1], index: parseInt(m), value: byMonthObj[m] })).sort((a, b) => a.index - b.index);
    const bySpec = Object.keys(bySpecObj).map(k => ({ name: k, value: bySpecObj[k] })).sort((a, b) => b.value - a.value);
    const byCity = Object.keys(byCityObj).map(k => ({ name: k, value: byCityObj[k], percent: total > 0 ? ((byCityObj[k]/total)*100).toFixed(1) : 0 })).sort((a, b) => b.value - a.value);
    const byAge = Object.keys(byAgeObj).map(k => ({ name: k, value: byAgeObj[k] }));
    const allProfs = Object.values(byProfObj).map(p => ({ ...p, daysCount: p.days.size || 1, avgPerDay: Math.round((p.total / (p.days.size || 1)) * 10) / 10 })).sort((a, b) => b.total - a.total);
    const byWeekDay = WEEK_DAYS.map(d => ({ name: d, value: byWeekDayObj[d] }));
    const byHour = Object.keys(byHourObj).map(h => ({ name: `${h}h`, value: byHourObj[h] }));

    const hospitalMatrixData = Array.from(matrixMap.values()).map(item => {
        const row = { spec: item.spec, totalGeral: item.totalGeral };
        Object.entries(item.months).forEach(([monthIdx, data]) => row[monthIdx] = data);
        return row;
    }).sort((a, b) => b.totalGeral - a.totalGeral);

    const profKeys = new Set();
    allProfs.slice(0, 20).forEach(p => { Object.keys(p).forEach(k => { if (!['name', 'total', 'days', 'daysCount', 'avgPerDay', 'diurno_atend', 'diurno_obs', 'noturno_atend', 'noturno_obs'].includes(k)) profKeys.add(k); }); });

    return { total, totalEvolucoes, byMonth, bySpec, byCity, byAge, byWeekDay, byHour, byProf: allProfs.slice(0, 20), allProfs, profKeys: Array.from(profKeys), hospitalMatrixData };
  }, [filteredData, activeUnit, specRankMap]);

  const isSpecializedSelected = useMemo(() => demandFilters.services.some(s => s && s.toLowerCase().includes("especializada")), [demandFilters.services]);
  const demandOptions = useMemo(() => {
     const services = new Set(); const procedures = new Set(); const years = new Set();
     demandData.forEach(d => { if (d.service) services.add(d.service); if (d.procedure) procedures.add(d.procedure); if (d.ano) years.add(d.ano); });
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
      const byService = {}; const byCbo = {}; const byUnit = {}; const byProcedure = {}; 

      filteredDemand.forEach(item => {
          if (item.waitDays) { totalWait += item.waitDays; countWait++; }
          const s = item.service || 'Outros'; const cbo = item.cboName || 'Não Informado';
          byService[s] = (byService[s] || 0) + 1; byCbo[cbo] = (byCbo[cbo] || 0) + 1;
          const pCode = item.procCode || 'N/A'; const pName = item.procedure || 'Outros';
          const pKey = isSpecializedSelected ? `${pCode}|${pName}|${cbo}` : `${pCode}|${pName}`;
          if (!byProcedure[pKey]) byProcedure[pKey] = { code: pCode, name: pName, cbo: cbo, count: 0 };
          byProcedure[pKey].count++;
          const u = item.unitRef || 'Não Informado'; byUnit[u] = (byUnit[u] || 0) + 1;
      });

      const avgWait = countWait > 0 ? Math.round(totalWait / countWait) : 0;
      const serviceChart = Object.keys(byService).map(k => ({ name: k, value: byService[k] })).sort((a,b) => b.value - a.value);
      const cboChart = Object.keys(byCbo).map(k => ({ name: k, value: byCbo[k] })).sort((a,b) => b.value - a.value);
      const unitChart = Object.keys(byUnit).map(k => ({ name: k, value: byUnit[k] })).sort((a,b) => b.value - a.value);
      const procedureTable = Object.values(byProcedure).sort((a,b) => b.count - a.count);
      const mainChart = isSpecializedSelected ? cboChart : serviceChart;

      return { total, avgWait, mainChart, unitChart, procedureTable };
  }, [filteredDemand, isSpecializedSelected]);

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
            
            {!isDemoData && (
                <button onClick={handleClearData} title="Limpar todos os dados" className="flex items-center gap-2 px-3 py-2 rounded-md font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all shadow-sm border border-red-200">
                    <Trash2 size={18}/> Limpar
                </button>
            )}

            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex flex-1 justify-center items-center gap-2 cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-md transition-colors font-medium text-sm">
                <Upload size={18} /> {isLoading ? 'Lendo...' : 'Carregar XLS/CSV'}
                <input type="file" accept=".csv, .xls, .xlsx" multiple onChange={handleFileUpload} className="hidden" />
              </label>
              {isDemoData && activeTab === 'atendimentos' && <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded whitespace-nowrap"><AlertCircle size={14} /> Demo</span>}
            </div>
          </div>
        </div>

        {/* TABS DE NAVEGAÇÃO */}
        <div className="flex gap-1 mb-6 border-b border-slate-200" data-html2canvas-ignore="true">
            <button onClick={() => setActiveTab('atendimentos')} className={`px-6 py-3 font-bold text-sm rounded-t-lg border-t border-l border-r transition-all ${activeTab === 'atendimentos' ? 'bg-white text-blue-600 border-slate-200 -mb-px shadow-sm' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'}`}>Atendimentos</button>
            <button onClick={() => setActiveTab('demanda')} className={`px-6 py-3 font-bold text-sm rounded-t-lg border-t border-l border-r transition-all ${activeTab === 'demanda' ? 'bg-white text-blue-600 border-slate-200 -mb-px shadow-sm' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'}`}>Demanda Reprimida</button>
        </div>

        {/* --- CONTEÚDO: ATENDIMENTOS --- */}
        {activeTab === 'atendimentos' && (
           <div className="animate-in fade-in duration-500">
           
           {/* FILTROS */}
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col gap-4 print:hidden" data-html2canvas-ignore="true">
             <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
               {availableUnits.map((unit) => (
                 <Button key={unit.code} active={activeUnit === unit.code} onClick={() => setActiveUnit(unit.code)} className="flex items-center gap-2">
                   {unit.code === '104' ? '🏥' : '🩺'} <span className="truncate max-w-[150px] md:max-w-none" title={unit.name}>{unit.name.replace('HOSPITAL', 'Hosp.').replace('CENTRO DE ESPECIALIDADES', 'C. Esp.')} ({unit.code})</span>
                 </Button>
               ))}
             </div>

             <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                 <div className="w-full md:w-32"><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Ano</label><div className="relative"><select className="w-full appearance-none bg-white border border-slate-300 hover:border-blue-400 px-3 py-2 rounded-md text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}><option value="all">Todos</option>{filterOptions.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}</select></div></div>
                 <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                        {Object.entries(PERIOD_PRESETS).map(([label, months]) => (
                            <button key={label} onClick={() => setSelectedMonths(months)} className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-blue-100 text-slate-600 rounded border border-slate-200 transition-colors">{label}</button>
                        ))}
                    </div>
                    <MultiSelect label="Meses / Período" options={filterOptions.months} selectedValues={selectedMonths} onChange={setSelectedMonths} placeholder="Todos os meses" />
                 </div>
                 <MultiSelect label="Especialidades" options={filterOptions.specs} selectedValues={selectedSpecs} onChange={setSelectedSpecs} />
                 <MultiSelect label="Profissionais" options={filterOptions.profs} selectedValues={selectedProfs} onChange={setSelectedProfs} />
                 <MultiSelect label="Procedimentos" options={filterOptions.procs} selectedValues={selectedProcs} onChange={setSelectedProcs} />
                 <div className="flex flex-col">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Datas</label>
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

           <div className="mb-6 p-3 border border-slate-200 rounded text-sm bg-blue-50/50 flex flex-wrap gap-4 print:hidden">
               <span className="font-bold text-slate-700">Filtros Aplicados:</span>
               <span>Ano: <strong>{selectedYear === 'all' ? 'Todos' : selectedYear}</strong></span>
               <span>Período: <strong>{selectedMonths.length === 0 ? 'Todos' : selectedMonths.length === 12 ? 'Ano Completo' : `${selectedMonths.length} meses selecionados`}</strong></span>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
               <Card className="p-6 border-l-4 border-l-blue-500">
                   <div className="flex justify-between items-start">
                       <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Total</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.total.toLocaleString()}</h3></div>
                       <div className="p-3 bg-blue-50 rounded-full text-blue-600"><FileText size={24} /></div>
                   </div>
               </Card>
               
               {activeUnit === '104' && (
                   <Card className="p-6 border-l-4 border-l-emerald-500">
                       <div className="flex justify-between items-start">
                           <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evoluções Registradas</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.totalEvolucoes.toLocaleString()}</h3></div>
                           <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><ClipboardPlus size={24} /></div>
                       </div>
                   </Card>
               )}

               <Card className="p-6 border-l-4 border-l-green-500">
                   <div className="flex justify-between items-start">
                       <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Especialidade</p><h3 className="text-xl font-bold text-slate-800 mt-2 truncate w-32" title={stats.bySpec[0]?.name}>{stats.bySpec[0]?.name || '-'}</h3><p className="text-sm text-green-600 font-medium">{stats.bySpec[0]?.value ? `${stats.bySpec[0].value.toLocaleString()} atends.` : 'N/A'}</p></div>
                       <div className="p-3 bg-green-50 rounded-full text-green-600"><Stethoscope size={24} /></div>
                   </div>
               </Card>

               <Card className="p-6 border-l-4 border-l-purple-500">
                   <div className="flex justify-between items-start">
                       <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pico Mensal</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.byMonth.reduce((a, b) => (a.value > b.value ? a : b), {name: '-'}).name}</h3><p className="text-sm text-purple-600 font-medium">{stats.byMonth.reduce((a, b) => (a.value > b.value ? a : b), {value: 0}).value.toLocaleString()} atends.</p></div>
                       <div className="p-3 bg-purple-50 rounded-full text-purple-600"><Calendar size={24} /></div>
                   </div>
               </Card>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
               <Card className="p-6">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-slate-400" /> Evolução Mensal</h3><ExportWidget targetId="chart-evolucao" fileName="evolucao_mensal" /></div>
                   <div id="chart-evolucao" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.byMonth} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} /><YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} /><RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Line type="monotone" dataKey="value" name="Atendimentos" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div>
               </Card>
               <Card className="p-6">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Stethoscope size={20} className="text-slate-400" /> Volume por Especialidade</h3><ExportWidget targetId="chart-specs" fileName="volume_especialidade" /></div>
                   <div id="chart-specs" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={stats.bySpec.slice(0, 10)} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={180} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} interval={0} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Bar dataKey="value" name="Atendimentos" radius={[0, 4, 4, 0]}>{stats.bySpec.slice(0, 10).map((entry, index) => <Cell key={`cell-${index}`} fill={getSpecColor(entry.name)} />)}</Bar></BarChart></ResponsiveContainer></div>
               </Card>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
               <Card className="p-6">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-slate-400" /> Dia da Semana</h3><ExportWidget targetId="chart-weekday" fileName="dias_semana" /></div>
                   <div id="chart-weekday" className="h-64 w-full bg-white p-2">
                       <ResponsiveContainer width="100%" height="100%"><BarChart data={stats.byWeekDay} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} /><YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} /><RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} /><Bar dataKey="value" name="Atendimentos" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                   </div>
               </Card>
               <Card className="p-6">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Watch size={20} className="text-slate-400" /> Horários</h3><ExportWidget targetId="chart-hours" fileName="horarios_pico" /></div>
                   <div id="chart-hours" className="h-64 w-full bg-white p-2">
                       <ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.byHour} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} interval={2} /><YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} /><RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} /><Area type="monotone" dataKey="value" name="Atendimentos" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} /></AreaChart></ResponsiveContainer>
                   </div>
               </Card>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
               <Card className="p-6 lg:col-span-1">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-slate-400" /> Faixa Etária</h3><ExportWidget targetId="chart-age" fileName="faixa_etaria" /></div>
                   <div id="chart-age" className="h-64 w-full bg-white p-2">
                       <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.byAge} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} fill="#8884d8" label={false}>{stats.byAge.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip formatter={(value, name, props) => [`${value} (${(props.payload.percent * 100).toFixed(0)}%)`, name]} /><Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/></PieChart></ResponsiveContainer>
                   </div>
               </Card>
               <Card className="p-0 border-t-4 border-t-blue-400 lg:col-span-2 overflow-hidden">
                   <div className="p-6 pb-4 bg-white flex justify-between items-center">
                       <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-slate-400" /> Atendimentos por Cidade</h3></div>
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

           {/* --- TABELA DE PRODUTIVIDADE --- */}
           <Card className="p-0 border-t-4 border-t-amber-400 overflow-hidden">
               <div className="p-6 pb-4 bg-white flex justify-between items-center">
                   <div>
                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Table size={20} className="text-slate-400" /> Tabela de Produtividade</h3>
                       <p className="text-sm text-slate-500 mt-1">Detalhamento por turno</p>
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
                                               <div className="flex items-center justify-center gap-1"><Sun size={14}/> Diurno</div>
                                           </th>
                                           <th colSpan="2" className="px-4 py-2 font-bold border-b border-r border-slate-200 text-center bg-indigo-50 text-indigo-800">
                                               <div className="flex items-center justify-center gap-1"><Moon size={14}/> Noturno</div>
                                           </th>
                                       </>
                                   )}
                                   <th rowSpan="2" className="px-6 py-3 font-bold border-b border-slate-200 text-right align-middle bg-slate-200">Total</th>
                               </tr>
                               {activeUnit === '104' && (
                                   <tr>
                                       <th className="px-4 py-2 font-bold border-b border-r border-slate-200 text-right bg-sky-50/50 text-xs">Atend.</th>
                                       <th className="px-4 py-2 font-bold border-b border-r border-slate-200 text-right bg-sky-50/50 text-xs">Obs.</th>
                                       <th className="px-4 py-2 font-bold border-b border-r border-slate-200 text-right bg-indigo-50/50 text-xs">Atend.</th>
                                       <th className="px-4 py-2 font-bold border-b border-r border-slate-200 text-right bg-indigo-50/50 text-xs">Obs.</th>
                                   </tr>
                               )}
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {stats.allProfs.map((prof, index) => (
                                   <tr key={index} className="bg-white hover:bg-slate-50 transition-colors">
                                       <td className="px-6 py-3 font-medium text-slate-900 border-r border-slate-100 text-left">{prof.name}</td>
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
                           </tbody>
                       </table>
                   </div>
               </div>
           </Card>

           <footer className="mt-12 py-6 border-t border-slate-200 flex flex-col items-center gap-4 text-center">
             <div>
               <p className="text-slate-600 font-medium">Desenvolvido por <strong className="text-blue-700">Leandro de Paula Rodrigues - Vivver Sistemas</strong></p>
               <p className="text-xs text-slate-400 mt-1">Relatório gerado automaticamente</p>
             </div>
           </footer>
       </div>
       )}
     </div>
   </div>
 );
}