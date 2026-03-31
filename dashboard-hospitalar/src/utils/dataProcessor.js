import * as XLSX from 'xlsx';
import { COLUMN_ALIASES, DEMAND_ALIASES } from './constants.js';
import { fixEncoding, normalizeHeader } from './helpers.js';

// Função para tratar as datas (Ex: "2026-03-02 10:20:00", "02/03/2026", ou serial do excel)
const parseExcelDate = (dateVal) => {
    if (!dateVal) return null;
    
    // Se for formato do Excel (número)
    if (typeof dateVal === 'number') {
        const parsed = XLSX.SSF.parse_date_code(dateVal);
        return { ano: String(parsed.y), mes: parsed.m, dt: new Date(parsed.y, parsed.m - 1, parsed.d) };
    }
    
    // Pegar apenas a parte da data, ignorando a hora "10:20:00"
    const strDate = String(dateVal).trim().split(' ')[0]; 
    const parts = strDate.split(/[\/\-]/);
    
    if (parts.length === 3) {
        if (parts[2].length === 4) { // DD/MM/YYYY
            return { ano: parts[2], mes: parseInt(parts[1], 10), dt: new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]) };
        } else if (parts[0].length === 4) { // YYYY-MM-DD
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

    // Ledor específico para CSV (Resolve o problema do ponto e vírgula e acentos)
    const readAsCSV = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const rowsText = text.split(/\r?\n/);
                if (rowsText.length === 0) resolve([]);

                const firstLine = rowsText[0];
                const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
                
                const rows = rowsText.filter(line => line.trim() !== "").map(line => {
                    // Divide por ponto-e-vírgula ignorando os que estiverem dentro de aspas duplas
                    return line.split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`)).map(val => val.replace(/^"|"$/g, '').trim());
                });
                resolve(rows);
            };
            // ISO-8859-1 para ler corretamente ç, ã, é, etc...
            reader.readAsText(file, 'ISO-8859-1');
        });
    };

    // Ledor específico para XLS/XLSX
    const readAsExcel = (file) => {
         return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                    resolve(rows);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    };

    for (const file of files) {
        let rows = [];
        const ext = file.name.split('.').pop().toLowerCase();
        
        // Decide como ler baseado na extensão do arquivo
        if (ext === 'csv') {
            rows = await readAsCSV(file);
        } else {
            rows = await readAsExcel(file);
        }

        if (rows.length < 2) continue;

        // 1. Procurar a linha real de cabeçalho (Ignorando as linhas iniciais "sujas")
        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
            const rowStr = rows[i].join('').toLowerCase();
            if (rowStr.includes('codigo_procedimento') || rowStr.includes('data_atendimento') || 
                rowStr.includes('data_solicitacao') || rowStr.includes('numprontuario') || 
                rowStr.includes('codigo_municipio')) {
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
                        
                        // Isola somente a hora se vier junto com a data
                        if (key === 'time' && val.includes(' ')) {
                            const parts = val.split(' ');
                            val = parts[1] && parts[1].includes(':') ? parts[1] : parts[0];
                        }
                        baseRowObj[key] = val;
                    }
                });

                // Se não mapeou "date" diretamente, mas tem "time" (ex: data_hora), vamos pegar a data do "time"
                const rawDateValue = baseRowObj.date || baseRowObj.time; 
                
                let parsedDate = parseExcelDate(rawDateValue);
                baseRowObj.ano_final = parsedDate.ano;
                baseRowObj.mes_final = parsedDate.mes;
                baseRowObj.dateObj = parsedDate.dt;
                
                // Se a data não estava preenchida, preenche agora baseada na extração
                if (!baseRowObj.date && rawDateValue) {
                    baseRowObj.date = rawDateValue.split(' ')[0];
                }

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
                    const checkEvolucao = (val) => val && String(val).trim() !== "" && String(val).trim().toLowerCase() !== "null";
                    rowObj.hasEvolucao = checkEvolucao(rowObj.idEvolucao) || checkEvolucao(rowObj.dataEvolucao);
                    
                    newAtendimentos.push(rowObj);
                });
            });
        }
    }

    return { newAtendimentos, newDemanda, isDemandaFile, fileReportTitle };
};