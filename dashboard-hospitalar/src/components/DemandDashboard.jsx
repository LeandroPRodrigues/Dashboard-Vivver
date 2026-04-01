import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  Activity, Calendar, MapPin, Users, List, Clock, AlertTriangle, Stethoscope, X, BriefcaseMedical
} from 'lucide-react';

import { Card } from './Card.jsx';
import { MultiSelect } from './MultiSelect.jsx';
import { ExportWidget } from './ExportWidget.jsx';
import { COLORS, MONTH_NAMES } from '../utils/constants.js';

export const DemandDashboard = ({ demandData }) => {
  // --- STATES DE FILTROS ---
  const [filters, setFilters] = useState({ 
    year: 'all', months: [], services: [], procedures: [], priorities: [], reqUnits: [] 
  });

  // --- OPÇÕES DE FILTROS ---
  const options = useMemo(() => {
     const services = new Set(); const years = new Set();
     const priorities = new Set(); const reqUnits = new Set();
     const procedures = new Set();
     
     demandData.forEach(d => { 
         if (d.serviceType) services.add(d.serviceType); 
         if (d.ano) years.add(d.ano); 
         if (d.priority) priorities.add(d.priority);
         if (d.reqUnit) reqUnits.add(d.reqUnit);

         if (filters.services.length === 0 || filters.services.includes(d.serviceType)) {
             if (d.procedure) procedures.add(d.procedure);
         }
     });
     
     return {
         services: Array.from(services).sort().map(s => ({label: s, value: s})),
         procedures: Array.from(procedures).sort().map(p => ({label: p, value: p})),
         years: Array.from(years).sort().reverse().map(y => ({label: y, value: y})),
         priorities: Array.from(priorities).sort().map(p => ({label: p, value: p})),
         reqUnits: Array.from(reqUnits).sort().map(u => ({label: u, value: u})),
         months: MONTH_NAMES.map((name, idx) => ({ label: name, value: idx + 1 }))
     };
  }, [demandData, filters.services]);

  // --- DADOS FILTRADOS ---
  const filteredDemand = useMemo(() => {
      return demandData.filter(item => {
          if (filters.year !== 'all' && String(item.ano) !== String(filters.year)) return false;
          if (filters.months.length > 0 && !filters.months.includes(item.mes)) return false;
          if (filters.services.length > 0 && !filters.services.includes(item.serviceType)) return false;
          if (filters.procedures.length > 0 && !filters.procedures.includes(item.procedure)) return false;
          if (filters.priorities.length > 0 && !filters.priorities.includes(item.priority)) return false;
          if (filters.reqUnits.length > 0 && !filters.reqUnits.includes(item.reqUnit)) return false;
          return true;
      });
  }, [demandData, filters]);

  // --- CÁLCULO DAS MÉTRICAS ---
  const stats = useMemo(() => {
      const totalRequests = filteredDemand.length;
      let totalWait = 0; 
      let priorityCount = 0;
      
      const uniquePatients = new Set();
      const byMonth = {}; const byPriority = {}; const byProcedure = {}; const bySpecialty = {};
      const byService = {}; const byReqUnit = {}; const patientMap = {}; 
      const byAgeCategory = { '0 a 30 dias': 0, '31 a 90 dias': 0, '91 a 365 dias': 0, 'Mais de 1 ano': 0 };

      filteredDemand.forEach(item => {
          if (item.waitDays !== undefined) totalWait += item.waitDays;
          if (item.patientId) uniquePatients.add(item.patientId);
          
          const rawPrio = String(item.priority || '').trim().toUpperCase();
          let prioGroup = 'Outras priorizações';
          
          if (rawPrio === 'P1') prioGroup = 'P1';
          else if (rawPrio === 'P2') prioGroup = 'P2';
          else if (rawPrio === 'SP') prioGroup = 'SP';
          
          if (prioGroup !== 'Outras priorizações') priorityCount++;
          byPriority[prioGroup] = (byPriority[prioGroup] || 0) + 1;

          const my = item.ano && item.mes ? `${item.ano}-${String(item.mes).padStart(2, '0')}` : 'N/A';
          byMonth[my] = (byMonth[my] || 0) + 1;

          const proc = item.procedure || 'Não Informado'; byProcedure[proc] = (byProcedure[proc] || 0) + 1;
          const spec = item.execSpecialty || 'Não Informado'; bySpecialty[spec] = (bySpecialty[spec] || 0) + 1;
          const serv = item.serviceType || 'Não Informado'; byService[serv] = (byService[serv] || 0) + 1;
          const reqU = item.reqUnit || 'Não Informada'; byReqUnit[reqU] = (byReqUnit[reqU] || 0) + 1;
          
          if (item.ageCategory) byAgeCategory[item.ageCategory]++;

          if (item.patientId) {
              if (!patientMap[item.patientId]) patientMap[item.patientId] = { name: item.patientName || 'Sem Nome', count: 0 };
              patientMap[item.patientId].count++;
          }
      });

      const avgWait = totalRequests > 0 ? Math.round(totalWait / totalRequests) : 0;
      const percPriority = totalRequests > 0 ? ((priorityCount / totalRequests) * 100).toFixed(1) : 0;

      const sortChart = (obj) => Object.keys(obj).map(k => ({ name: k, value: obj[k] })).sort((a,b) => b.value - a.value);
      
      const evolutionChart = Object.keys(byMonth).filter(k => k !== 'N/A').sort().map(k => {
          const [y, m] = k.split('-');
          return { name: `${MONTH_NAMES[parseInt(m)-1]}/${y.slice(2)}`, value: byMonth[k] };
      });

      const priorityOrder = ['P1', 'P2', 'SP', 'Outras priorizações'];
      const priorityChart = Object.keys(byPriority)
          .map(k => ({ name: k, value: byPriority[k] }))
          .sort((a, b) => priorityOrder.indexOf(a.name) - priorityOrder.indexOf(b.name));

      const multiplePatientsChart = Object.values(patientMap).filter(p => p.count > 1).sort((a,b) => b.count - a.count).slice(0, 20);
      const agingChart = Object.keys(byAgeCategory).map(k => ({ name: k, value: byAgeCategory[k] }));

      return { 
          totalRequests, totalPatients: uniquePatients.size, avgWait, percPriority,
          priorityChart, evolutionChart, topProcedures: sortChart(byProcedure).slice(0, 10),
          specialtyChart: sortChart(bySpecialty).slice(0, 10),
          // Adicionado o cálculo de percentagem na Tabela de Serviços
          serviceChart: sortChart(byService).map(item => ({ ...item, percent: totalRequests > 0 ? ((item.value / totalRequests) * 100).toFixed(1) : 0 })), 
          reqUnitChart: sortChart(byReqUnit).slice(0, 15),
          multiplePatientsChart, agingChart, rawTable: filteredDemand.slice(0, 100) 
      };
  }, [filteredDemand]);

  if (demandData.length === 0) return null;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      
      {/* --- BARRA DE FILTROS --- */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 print:hidden">
         <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full md:w-32">
                 <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Ano Solic.</label>
                 <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm">
                     <option value="all">Todos</option>
                     {options.years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                 </select>
            </div>
            <MultiSelect label="Meses" options={options.months} selectedValues={filters.months} onChange={v => setFilters({...filters, months: v})} />
            <MultiSelect label="Tipos de Serviço" options={options.services} selectedValues={filters.services} onChange={v => setFilters({...filters, services: v})} />
            <MultiSelect label="Procedimentos" options={options.procedures} selectedValues={filters.procedures} onChange={v => setFilters({...filters, procedures: v})} />
            <MultiSelect label="Unid. Solicitante" options={options.reqUnits} selectedValues={filters.reqUnits} onChange={v => setFilters({...filters, reqUnits: v})} />
            
            <button onClick={() => setFilters({ year: 'all', months: [], services: [], procedures: [], priorities: [], reqUnits: [] })} className="text-sm text-red-500 font-medium flex items-center gap-1 hover:bg-red-50 px-3 py-2 rounded mb-1">
                <X size={16} /> Limpar
            </button>
         </div>
      </div>

      {/* ========================================== */}
      {/* 1. PAINEL EXECUTIVO (Visão Geral) */}
      {/* ========================================== */}
      <section>
          <div className="flex items-center gap-2 mb-4 border-b pb-2"><BriefcaseMedical className="text-blue-600"/><h2 className="text-xl font-bold text-slate-800">Painel Executivo</h2></div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-6 border-l-4 border-l-blue-500"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-400 uppercase">Pacientes na Fila</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.totalPatients.toLocaleString()}</h3></div><div className="p-3 bg-blue-50 rounded-full text-blue-600"><Users size={24} /></div></div><p className="text-xs text-slate-400 mt-2">Prontuários Únicos</p></Card>
              <Card className="p-6 border-l-4 border-l-orange-500"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-400 uppercase">Total de Solicitações</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.totalRequests.toLocaleString()}</h3></div><div className="p-3 bg-orange-50 rounded-full text-orange-600"><List size={24} /></div></div><p className="text-xs text-slate-400 mt-2">Procedimentos pendentes</p></Card>
              <Card className="p-6 border-l-4 border-l-red-500"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-400 uppercase">Tempo Médio Espera</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.avgWait} <span className="text-sm font-normal text-slate-500">dias</span></h3></div><div className="p-3 bg-red-50 rounded-full text-red-600"><Clock size={24} /></div></div><p className="text-xs text-slate-400 mt-2">Desde a data do pedido</p></Card>
              <Card className="p-6 border-l-4 border-l-purple-500"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-slate-400 uppercase">Casos Prioritários</p><h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.percPriority}%</h3></div><div className="p-3 bg-purple-50 rounded-full text-purple-600"><AlertTriangle size={24} /></div></div><p className="text-xs text-slate-400 mt-2">P1, P2 e SP</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Card className="p-6 lg:col-span-2">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity size={20} className="text-slate-400" /> Evolução da Demanda (Novos Pedidos)</h3><ExportWidget targetId="chart-demanda-evol" fileName="evolucao_demanda" /></div>
                   <div id="chart-demanda-evol" className="h-64 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.evolutionChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 12}} /><YAxis stroke="#64748b" tick={{fontSize: 12}} /><RechartsTooltip contentStyle={{ borderRadius: '8px' }} /><Area type="monotone" dataKey="value" name="Novas Solicitações" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
               </Card>
               <Card className="p-6">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={20} className="text-slate-400" /> Fila por Prioridade</h3><ExportWidget targetId="chart-prioridade" fileName="fila_prioridade" /></div>
                   <div id="chart-prioridade" className="h-64 w-full bg-white p-2">
                       <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                               <Pie data={stats.priorityChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} fill="#8884d8">
                                   <Cell fill="#ef4444"/>
                                   <Cell fill="#f97316"/>
                                   <Cell fill="#f59e0b"/>
                                   <Cell fill="#94a3b8"/>
                               </Pie>
                               <RechartsTooltip />
                               <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }}/>
                           </PieChart>
                       </ResponsiveContainer>
                   </div>
               </Card>
          </div>
      </section>

      {/* ========================================== */}
      {/* 2. PAINEL CLÍNICO (Gargalos Médicos) */}
      {/* ========================================== */}
      <section>
          <div className="flex items-center gap-2 mb-4 border-b pb-2"><Stethoscope className="text-green-600"/><h2 className="text-xl font-bold text-slate-800">Painel Clínico e de Procedimentos</h2></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
               {/* TABELA DE SERVIÇOS NO LUGAR DO GRÁFICO DE PIZZA */}
               <Card className="p-0 border-t-4 border-t-blue-500 lg:col-span-1 overflow-hidden">
                   <div className="p-6 pb-4 bg-white flex justify-between items-center">
                       <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity size={20} className="text-slate-400" /> Tipos de Serviço</h3></div>
                       <ExportWidget targetId="table-tipos-servico" fileName="tipos_servico" dataForExcel={stats.serviceChart} />
                   </div>
                   <div className="overflow-x-auto">
                       <div id="table-tipos-servico" className="max-h-64 overflow-y-auto bg-white px-4 pb-4">
                           <table className="w-full text-sm text-left text-slate-600">
                               <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10">
                                   <tr>
                                       <th className="px-4 py-3 font-bold border-b">Serviço</th>
                                       <th className="px-4 py-3 font-bold border-b text-right">Qtd</th>
                                       <th className="px-4 py-3 font-bold border-b text-right">%</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                   {stats.serviceChart.map((serv, index) => (
                                       <tr key={index} className="hover:bg-slate-50">
                                           <td className="px-4 py-2 font-medium truncate max-w-[150px]" title={serv.name}>{serv.name}</td>
                                           <td className="px-4 py-2 text-right font-bold text-slate-700">{serv.value.toLocaleString()}</td>
                                           <td className="px-4 py-2 text-right text-slate-400 text-xs">{serv.percent}%</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </div>
               </Card>
               
               <Card className="p-6 lg:col-span-2">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><List size={20} className="text-slate-400" /> Top 10 Procedimentos Aguardados</h3><ExportWidget targetId="chart-top-procs" fileName="top_procedimentos" /></div>
                   <div id="chart-top-procs" className="h-64 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={stats.topProcedures} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={180} tick={{fontSize: 10}} interval={0} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} /><Bar dataKey="value" name="Solicitações" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} /></BarChart></ResponsiveContainer></div>
               </Card>
          </div>

          <div className="grid grid-cols-1 mb-6">
               <Card className="p-6">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-slate-400" /> Fila por Especialidade Executante</h3><ExportWidget targetId="chart-top-specs" fileName="top_especialidades" /></div>
                   <div id="chart-top-specs" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={stats.specialtyChart} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={180} tick={{fontSize: 10}} interval={0} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} /><Bar dataKey="value" name="Solicitações" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} /></BarChart></ResponsiveContainer></div>
               </Card>
          </div>
      </section>

      {/* ========================================== */}
      {/* 3. PAINEL DEMOGRÁFICO E TERRITORIAL */}
      {/* ========================================== */}
      <section>
          <div className="flex items-center gap-2 mb-4 border-b pb-2"><MapPin className="text-amber-500"/><h2 className="text-xl font-bold text-slate-800">Painel Demográfico e Territorial</h2></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
               <Card className="p-6">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-slate-400" /> Top UBS / Unidades Solicitantes</h3><ExportWidget targetId="chart-ubs" fileName="ubs_solicitantes" /></div>
                   <div id="chart-ubs" className="h-80 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={stats.reqUnitChart} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={180} tick={{fontSize: 9}} interval={0} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} /><Bar dataKey="value" name="Solicitações" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15} /></BarChart></ResponsiveContainer></div>
               </Card>
               <Card className="p-0 border-t-4 border-t-amber-400 overflow-hidden">
                   <div className="p-6 pb-4 bg-white flex justify-between items-center"><div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-slate-400" /> Pacientes com Múltiplas Solicitações</h3><p className="text-xs text-slate-500 mt-1">Atenção a pacientes hiper-utilizadores do TFD</p></div><ExportWidget targetId="table-multi" fileName="multiplas_solicitacoes" dataForExcel={stats.multiplePatientsChart} /></div>
                   <div className="overflow-x-auto"><div id="table-multi" className="max-h-80 overflow-y-auto bg-white px-4 pb-4"><table className="w-full text-sm text-left text-slate-600"><thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0"><tr><th className="px-4 py-3 font-bold border-b">Paciente</th><th className="px-4 py-3 font-bold border-b text-center">Pedidos na Fila</th></tr></thead><tbody className="divide-y divide-slate-100">{stats.multiplePatientsChart.map((pt, i) => (<tr key={i} className="hover:bg-slate-50"><td className="px-4 py-2 font-medium truncate max-w-[200px]" title={pt.name}>{pt.name}</td><td className="px-4 py-2 text-center"><span className="bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-full text-xs">{pt.count}</span></td></tr>))}</tbody></table></div></div>
               </Card>
          </div>
      </section>

      {/* ========================================== */}
      {/* 4. PAINEL OPERACIONAL (Mão na Massa) */}
      {/* ========================================== */}
      <section>
          <div className="flex items-center gap-2 mb-4 border-b pb-2"><Calendar className="text-purple-600"/><h2 className="text-xl font-bold text-slate-800">Painel Operacional e de Regulação</h2></div>
          
          <div className="grid grid-cols-1 mb-6">
               <Card className="p-6">
                   <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Clock size={20} className="text-slate-400" /> Envelhecimento da Fila</h3><ExportWidget targetId="chart-envelhecimento" fileName="envelhecimento_fila" /></div>
                   <div id="chart-envelhecimento" className="h-64 w-full bg-white p-2"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.agingChart} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{fontSize: 11}} /><YAxis tick={{fontSize: 11}} /><RechartsTooltip cursor={{fill: '#f1f5f9'}} /><Bar dataKey="value" name="Solicitações" fill="#ec4899" radius={[4, 4, 0, 0]}><Cell fill="#10b981"/><Cell fill="#f59e0b"/><Cell fill="#f97316"/><Cell fill="#ef4444"/></Bar></BarChart></ResponsiveContainer></div>
               </Card>
          </div>

          {/* TABELA DINÂMICA DE FILA */}
          <Card className="p-0 border-t-4 border-t-slate-800 overflow-hidden mb-8">
               <div className="p-6 pb-4 bg-white flex justify-between items-center">
                   <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><List size={20} className="text-slate-400" /> Tabela Dinâmica de Regulação (Amostra de 100 registros)</h3><p className="text-xs text-slate-500 mt-1">Utilize os filtros no topo para refinar esta lista</p></div>
                   <ExportWidget targetId="table-regulacao" fileName="tabela_regulacao_tfd" dataForExcel={filteredDemand} />
               </div>
               <div className="overflow-x-auto">
                   <div id="table-regulacao" className="max-h-96 overflow-y-auto bg-white px-4 pb-4">
                       <table className="w-full text-xs text-left text-slate-600">
                           <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 shadow-sm z-10">
                               <tr>
                                   <th className="px-4 py-3 font-bold border-b">Paciente</th>
                                   <th className="px-4 py-3 font-bold border-b">Procedimento / Serviço</th>
                                   <th className="px-4 py-3 font-bold border-b">Prioridade</th>
                                   <th className="px-4 py-3 font-bold border-b text-center">Dias na Fila</th>
                                   <th className="px-4 py-3 font-bold border-b">Unid. Solicitante</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {stats.rawTable.map((req, i) => (
                                   <tr key={i} className="hover:bg-slate-50">
                                       <td className="px-4 py-2 font-medium text-slate-800">{req.patientName || req.patientId}</td>
                                       <td className="px-4 py-2 truncate max-w-[200px]" title={req.procedure}>{req.procedure || req.serviceType}</td>
                                       <td className="px-4 py-2">
                                           <span className={`px-2 py-1 rounded text-[10px] font-bold ${String(req.priority).includes('P1') || String(req.priority).includes('P2') || String(req.priority).includes('SP') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                               {req.priority}
                                           </span>
                                       </td>
                                       <td className="px-4 py-2 text-center font-bold text-slate-700">{req.waitDays}</td>
                                       <td className="px-4 py-2 text-slate-500 truncate max-w-[150px]" title={req.reqUnit}>{req.reqUnit}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
          </Card>
      </section>
    </div>
  );
};