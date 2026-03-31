import * as XLSX from 'xlsx';
import { COLUMN_ALIASES, DEMAND_ALIASES } from './constants.js';
import { fixEncoding, normalizeHeader } from './helpers.js';

const parseExcelDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
        const parsed = XLSX.SSF.parse_date_code(dateVal);
        return { ano: String(parsed.y), mes: parsed.m, dt: new Date(parsed.y, parsed.m - 1, parsed.d) };
    }
    const strDate = String(dateVal).trim().split(' ')[0]; 
    const parts = strDate.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[2].length === 4) { 
            return { ano: parts[2], mes: parseInt(parts[1], 10), dt: new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]) };
        } else if (parts[0].length === 4) { 
            return { ano: parts[0], mes: parseInt(parts[1], 10), dt: new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]) };
        }
    }
    return { ano: 'N/A', mes: 0, dt: null };
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
                // A MÁGICA: Verifica se tem ponto-e-vírgula e não é um binário zip (PK) ou OLE (ÐÏ)
                if (text.includes(';') && !text.startsWith('PK') && !text.startsWith('ÐÏ')) {
                    const rowsText = text.split(/\r?\n/);
                    const rows = rowsText.filter(line => line.trim() !== "").map(line => {
                        return line.split(';').map(val => val.replace(/^"|"$/g, '').trim());
                    });
                    resolve(rows);
                } else {
                    // Se for Excel real (.xlsx)
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
            reader.readAsText(file, 'ISO-8859-1'); // Lê acentuação corretamente (PT-BR)
        });
    };

    for (const file of files) {
        const rows = await readAnyFile(file);
        if (rows.length < 2) continue;

        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
            const rowStr = rows[i].join('').toLowerCase();
            if (rowStr.includes('codigo_procedimento') || rowStr.includes('codigo_municipio') || 
                rowStr.includes('data_atendimento') || rowStr.includes('data_solicitacao')) {
                headerIdx = i;
                break;
            }
        }

        const rawHeaders = rows[headerIdx].map(h => String(h).trim());
        const dataRows = rows.slice(headerIdx + 1);

        const isDemanda = rawHeaders.some(h => normalizeHeader(h, DEMAND_ALIASES) === 'reqDate') || 
                          rawHeaders.some(h => normalizeHeader(h, DEMAND_ALIASES) === 'unitRef');

        if (isDemanda) {
            isDemandaFile = true;
            fileReportTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
            const headerMap = rawHeaders.map(h => normalizeHeader(h, DEMAND_ALIASES));
            const now = new Date();

            dataRows.forEach(values => {
                if (!values || values.length === 0 || !values.join('').trim()) return;
                const rowObj = {};
                headerMap.forEach((key, index) => {
                    if (values[index]) rowObj[key] = typeof values[index] === 'string' ? fixEncoding(values[index]) : values[index];
                });

                if (rowObj.reqDate) {
                    const parsedDate = parseExcelDate(rowObj.reqDate);
                    if (parsedDate && parsedDate.dt) {
                        rowObj.dateObj = parsedDate.dt;
                        rowObj.ano = parsedDate.ano === '1900' ? '2025' : parsedDate.ano;
                        rowObj.mes = parsedDate.mes;
                        const diffTime = Math.abs(now - parsedDate.dt);
                        rowObj.waitDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    }
                }
                newDemanda.push(rowObj);
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
                        
                        if (key === 'time' && val.includes(' ')) {
                            const parts = val.split(' ');
                            val = parts[1] && parts[1].includes(':') ? parts[1] : parts[0];
                        }
                        baseRowObj[key] = val;
                    }
                });

                const rawDateValue = baseRowObj.date || baseRowObj.time; 
                let parsedDate = parseExcelDate(rawDateValue);
                baseRowObj.ano_final = parsedDate.ano;
                baseRowObj.mes_final = parsedDate.mes;
                baseRowObj.dateObj = parsedDate.dt;
                
                if (!baseRowObj.date && rawDateValue) baseRowObj.date = rawDateValue.split(' ')[0];

                if (baseRowObj.age) {
                    const age = parseInt(baseRowObj.age);
                    baseRowObj.ageGroup = age <= 12 ? 'Criança (0-12)' : age <= 18 ? 'Adolescente (13-18)' : age <= 59 ? 'Adulto (19-59)' : 'Idoso (60+)';
                }

                const procCodes = baseRowObj.procCode ? String(baseRowObj.procCode).split('-') : [''];
                
                procCodes.forEach(code => {
                    const rowObj = { ...baseRowObj, procCode: code.trim() };
                    const checkEvolucao = (val) => val && String(val).trim() !== "" && String(val).trim().toLowerCase() !== "null";
                    rowObj.hasEvolucao = checkEvolucao(rowObj.idEvolucao) || checkEvolucao(rowObj.dataEvolucao);
                    
                    newAtendimentos.push(rowObj);
                });
            });
        }
    }

    return { newAtendimentos, newDemanda, isDemandaFile, fileReportTitle };
};