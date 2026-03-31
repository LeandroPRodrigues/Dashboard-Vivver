import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export const fixEncoding = (str) => {
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

export const normalizeHeader = (header, aliasMap) => {
  if (!header) return "";
  const cleanHeader = header.trim();
  for (const [key, aliases] of Object.entries(aliasMap)) {
    if (aliases.some(alias => cleanHeader.toLowerCase() === alias.toLowerCase())) return key;
  }
  return cleanHeader; 
};

export const getShift = (timeStr) => {
    if (!timeStr) return 'Indefinido';
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (isNaN(hour)) return 'Indefinido';
    
    // REGRA DE TURNOS EXATA: 
    // >= 7 e < 19 significa das 07:00:00 até as 18:59:59
    if (hour >= 7 && hour < 19) return 'Diurno';
    return 'Noturno';
};

export const exportAsImage = async (elementId, fileName) => {
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

export const exportAsExcel = (data, fileName) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) { console.error("Erro excel:", error); }
};