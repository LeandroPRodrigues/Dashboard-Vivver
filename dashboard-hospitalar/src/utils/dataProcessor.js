import * as XLSX from 'xlsx';
import { COLUMN_ALIASES, DEMAND_ALIASES } from './constants';
import { fixEncoding, normalizeHeader } from './helpers';

const parseExcelDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
        const parsed = XLSX.SSF.parse_date_code(dateVal);
        return { ano: String(parsed.y), mes: parsed.m, dt: new Date(parsed.y, parsed.m - 1, parsed.d) };
    }
    const strDate = String(dateVal).split(' ')[0]; // remove time if exists
    const parts = strDate.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[2].length === 4) { // DD/MM/YYYY
            return { ano: parts[2], mes: parseInt(parts[1]), dt: new Date(parts[2], parts[1] - 1, parts[0]) };
        } else if (parts[0].length === 4) { // YYYY-MM-DD
            return { ano: parts[0], mes: parseInt(parts[1]), dt: new Date(parts[0], parts[1] - 1, parts[2]) };
        }
    }
    return { ano: 'N/A', mes: 0, dt: null };
};

export const processFiles = async (files) => {
    let newAtendimentos = [];
    let newDemanda = [];
    let isDemandaFile = false;
    let fileReportTitle = '';

    const readFileData = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    // Lendo arquivo via XLSX (suporta xls, xlsx, csv)
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[firstSheetName];
                    resolve(sheet);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    };

    for (const file of files) {
        const sheet = await readFileData(file);
        // Transformando a aba em array de arrays
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        if (rows.length < 2) continue;

        // 1. Procurar a linha real de cabeçalho (Ignorando a 1ª linha suja do relatório novo)
        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
            const rowStr = rows[i].join('').toLowerCase();
            if (rowStr.includes('codigo_procedimento') || rowStr.includes('data_atendimento') || 
                rowStr.includes('data_solicitacao') || rowStr.includes('numprontuario') || 
                rowStr.includes('nome_paciente')) {
                headerIdx = i;
                break;
            }
        }

        const rawHeaders = rows[headerIdx].map(h => String(h).trim());
        const dataRows = rows.slice(headerIdx + 1);

        // Verifica se é arquivo de demanda ou atendimentos
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
                        if (['prof', 'spec', 'procName', 'unitName', 'city', 'nome_paciente'].includes(key)) {
                            val = fixEncoding(val);
                        }
                        if (key === 'time' && val.includes(' ')) {
                            const parts = val.split(' ');
                            val = parts[1] && parts[1].includes(':') ? parts[1] : parts[0];
                        }
                        baseRowObj[key] = val;
                    }
                });

                // Parse da Data
                let parsedDate = parseExcelDate(baseRowObj.date);
                baseRowObj.ano_final = parsedDate.ano;
                baseRowObj.mes_final = parsedDate.mes;
                baseRowObj.dateObj = parsedDate.dt;

                // Parse da Idade
                if (baseRowObj.age) {
                    const age = parseInt(baseRowObj.age);
                    baseRowObj.ageGroup = age <= 12 ? 'Criança (0-12)' : age <= 18 ? 'Adolescente (13-18)' : age <= 59 ? 'Adulto (19-59)' : 'Idoso (60+)';
                }

                // 2. Dividir múltiplos procedimentos (Ex: 0301060029-0301060096)
                const procCodes = baseRowObj.procCode ? String(baseRowObj.procCode).split('-') : [''];
                
                procCodes.forEach(code => {
                    const rowObj = { ...baseRowObj, procCode: code.trim() };
                    
                    // 3. Contabilizar Evoluções
                    rowObj.hasEvolucao = !!rowObj.idEvolucao || !!rowObj.dataEvolucao;
                    
                    newAtendimentos.push(rowObj);
                });
            });
        }
    }

    return { newAtendimentos, newDemanda, isDemandaFile, fileReportTitle };
};