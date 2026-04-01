import * as XLSX from 'xlsx';
import { COLUMN_ALIASES, DEMAND_ALIASES } from './constants.js';
import { fixEncoding, normalizeHeader } from './helpers.js';

const parseExcelDate = (dateVal) => {
    if (!dateVal) return null;
    let ano, mes, dt;
    
    if (typeof dateVal === 'number') {
        const parsed = XLSX.SSF.parse_date_code(dateVal);
        ano = String(parsed.y);
        mes = parsed.m;
        dt = new Date(parsed.y, parsed.m - 1, parsed.d);
    } else {
        const strDate = String(dateVal).trim().split(' ')[0]; 
        const parts = strDate.split(/[\/\-]/);
        if (parts.length === 3) {
            if (parts[2].length === 4) { 
                ano = parts[2];
                mes = parseInt(parts[1], 10);
                dt = new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
            } else if (parts[0].length === 4) { 
                ano = parts[0];
                mes = parseInt(parts[1], 10);
                dt = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
            }
        }
    }
    
    // ========================================================
    // CORREÇÃO GLOBAL: Se o ano for 1900, converte para 2024
    // ========================================================
    if (ano === '1900') {
        ano = '2024';
        if (dt) dt.setFullYear(2024);
    }
    
    return { ano: ano || 'N/A', mes: mes || 0, dt: dt || null };
};

export const processFiles = async (files) => {
    let newAtendimentos = [];
    let newDemanda = [];
    let isDemandaFile = false;
    let fileReportTitle = '';

    const readAnyFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                if (text.includes(';') && !text.startsWith('PK') && !text.startsWith('ÐÏ')) {
                    const rowsText = text.split(/\r?\n/);
                    const rows = rowsText.filter(line => line.trim() !== "").map(line => {
                        return line.split(';').map(val => val.replace(/^"|"$/g, '').trim());
                    });
                    resolve(rows);
                } else {
                    const readerBinary = new FileReader();
                    readerBinary.onload = (eBin) => {
                        try {
                            const data = new Uint8Array(eBin.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const sheet = workbook.Sheets[workbook.SheetNames[0]];
                            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                            resolve(rows);
                        } catch (err) { resolve([]); }
                    };
                    readerBinary.readAsArrayBuffer(file);
                }
            };
            reader.readAsText(file, 'ISO-8859-1');
        });
    };

    for (const file of files) {
        const rows = await readAnyFile(file);
        if (rows.length < 2) continue;

        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
            const rowStr = rows[i].join('').toLowerCase();
            if (rowStr.includes('codigo_procedimento') || rowStr.includes('codigo_municipio') || 
                rowStr.includes('data_atendimento') || rowStr.includes('data_solicitacao') ||
                rowStr.includes('codespecialidade') || rowStr.includes('mes_ano_solicitacao')) {
                headerIdx = i;
                break;
            }
        }

        const rawHeaders = rows[headerIdx].map(h => String(h).trim());
        const dataRows = rows.slice(headerIdx + 1);

        const isDemanda = rawHeaders.some(h => normalizeHeader(h, DEMAND_ALIASES) === 'reqDate') || 
                          rawHeaders.some(h => normalizeHeader(h, DEMAND_ALIASES) === 'monthYear') ||
                          rawHeaders.some(h => normalizeHeader(h, DEMAND_ALIASES) === 'serviceType');

        if (isDemanda) {
            isDemandaFile = true;
            fileReportTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
            const headerMap = rawHeaders.map(h => normalizeHeader(h, DEMAND_ALIASES));
            const now = new Date();

            dataRows.forEach(values => {
                if (!values || values.length === 0 || !values.join('').trim()) return;
                const rowObj = {};
                headerMap.forEach((key, index) => {
                    if (key && values[index] !== undefined && values[index] !== "") {
                        rowObj[key] = typeof values[index] === 'string' ? fixEncoding(values[index].trim()) : values[index];
                    }
                });

                if (rowObj.reqDate) {
                    const parsedDate = parseExcelDate(rowObj.reqDate);
                    if (parsedDate && parsedDate.dt) {
                        rowObj.dateObj = parsedDate.dt;
                        rowObj.ano = parsedDate.ano;
                        rowObj.mes = parsedDate.mes;
                        
                        // Reescreve a data bonitinha para a tabela (já com 2024 caso fosse 1900)
                        const d = String(parsedDate.dt.getDate()).padStart(2, '0');
                        const m = String(parsedDate.dt.getMonth() + 1).padStart(2, '0');
                        const y = parsedDate.dt.getFullYear();
                        rowObj.reqDate = `${d}/${m}/${y}`;
                        
                        // Cálculo correto dos dias
                        const diffTime = now - parsedDate.dt;
                        rowObj.waitDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24))); 
                        
                        if (rowObj.waitDays <= 30) rowObj.ageCategory = '0 a 30 dias';
                        else if (rowObj.waitDays <= 90) rowObj.ageCategory = '31 a 90 dias';
                        else if (rowObj.waitDays <= 365) rowObj.ageCategory = '91 a 365 dias';
                        else rowObj.ageCategory = 'Mais de 1 ano';
                    }
                }
                
                if (!rowObj.priority || String(rowObj.priority).trim() === '') {
                    rowObj.priority = 'NÃO CLASSIFICADO';
                }

                if (rowObj.procedure || rowObj.serviceType) {
                    newDemanda.push(rowObj);
                }
            });
        } else {
            const headerMap = rawHeaders.map(h => normalizeHeader(h, COLUMN_ALIASES)); 
            
            dataRows.forEach(values => {
                if (!values || values.length === 0 || !values.join('').trim()) return;

                const baseRowObj = {};
                headerMap.forEach((key, index) => {
                    if (values[index] !== undefined && values[index] !== "") {
                        let val = typeof values[index] === 'string' ? values[index].trim() : String(values[index]);
                        if (['prof', 'spec', 'procName', 'unitName', 'city', 'nome_paciente'].includes(key)) val = fixEncoding(val);
                        baseRowObj[key] = val;
                    }
                });

                const cbo = String(baseRowObj.cboCode || '').trim();
                if (cbo === '223505' || cbo === '322205') return; 

                const tipoAtendimento = String(baseRowObj.tipo || '').trim().toUpperCase();
                if (tipoAtendimento === 'I' || tipoAtendimento === 'INTERNAÇÃO') return;

                let dateStr = String(baseRowObj.date || '');
                let timeStr = String(baseRowObj.time || '');

                if (timeStr.includes(' ')) {
                    const parts = timeStr.trim().replace(/\s+/g, ' ').split(' ');
                    dateStr = parts[0];
                    timeStr = parts[1];
                } else if (dateStr.includes(' ')) {
                    const parts = dateStr.trim().replace(/\s+/g, ' ').split(' ');
                    dateStr = parts[0];
                    timeStr = parts[1];
                }

                if (!timeStr) timeStr = "00:00:00"; 

                baseRowObj.date = dateStr;
                baseRowObj.time = timeStr;

                let parsedDate = parseExcelDate(baseRowObj.date);
                
                if (parsedDate && parsedDate.dt) {
                    const d = String(parsedDate.dt.getDate()).padStart(2, '0');
                    const m = String(parsedDate.dt.getMonth() + 1).padStart(2, '0');
                    const y = parsedDate.dt.getFullYear();
                    baseRowObj.date = `${y}-${m}-${d}`;
                }

                baseRowObj.ano_final = parsedDate ? parsedDate.ano : 'N/A';
                baseRowObj.mes_final = parsedDate ? parsedDate.mes : 0;
                baseRowObj.dateObj = parsedDate ? parsedDate.dt : null;

                if (baseRowObj.age) {
                    const age = parseInt(baseRowObj.age);
                    baseRowObj.ageGroup = age <= 12 ? 'Criança (0-12)' : age <= 18 ? 'Adolescente (13-18)' : age <= 59 ? 'Adulto (19-59)' : 'Idoso (60+)';
                }

                const procCodes = baseRowObj.procCode ? String(baseRowObj.procCode).split('-') : [''];
                
                procCodes.forEach((code, index) => {
                    const rowObj = { ...baseRowObj, procCode: code.trim() };
                    const checkEvolucao = (val) => val && String(val).trim() !== "" && String(val).trim().toLowerCase() !== "null" && String(val).trim() !== '""';
                    
                    rowObj.hasEvolucao = index === 0 ? (checkEvolucao(rowObj.idEvolucao) || checkEvolucao(rowObj.dataEvolucao)) : false;
                    
                    newAtendimentos.push(rowObj);
                });
            });
        }
    }

    return { newAtendimentos, newDemanda, isDemandaFile, fileReportTitle };
};