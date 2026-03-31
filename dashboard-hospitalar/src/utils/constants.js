export const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];
export const YEAR_COLORS = ['#94a3b8', '#60a5fa', '#3b82f6', '#1d4ed8', '#1e3a8a']; 

export const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const WEEK_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const PERIOD_PRESETS = {
  '1º Tri': ['1','2','3'],
  '2º Tri': ['4','5','6'],
  '3º Tri': ['7','8','9'],
  '4º Tri': ['10','11','12'],
  '1º Sem': ['1','2','3','4','5','6'],
  '2º Sem': ['7','8','9','10','11','12']
};

export const HOSPITAL_PROCEDURE_MAP = {
  '301060096': 'Primeiro atendimento', '0301060096': 'Primeiro atendimento', '9999999984': 'Primeiro atendimento', 
  '301060029': 'Pacientes em observação', '0301060029': 'Pacientes em observação', '9990000096': 'Pacientes em observação'
};

// --- DEFININDO RIGOROSAMENTE OS CÓDIGOS ---
export const ATEND_CODES = ['301060096', '0301060096', '9999999984'];
export const OBS_CODES = ['301060029', '0301060029', '9990000096']; 

export const COLUMN_ALIASES = {
  unitCode: ['codigo_unidade', 'Codigo unidade', 'Cód. Unidade', 'cod_unidade'],
  unitName: ['nome_unidade', 'Nome unidade', 'Unidade', 'desc_unidade', 'nomfantasia'],
  date: ['data_atendimento', 'Data atendimento', 'Data', 'dt_atend'],
  time: ['hora_atendimento', 'Hora atendimento', 'Hora', 'hr_atend', 'data_hora'], 
  cboCode: ['codespecialidade', 'codigo_especialidade', 'cod_especialidade'], 
  spec: ['nome_especialidade', 'Nome especialidade', 'Especialidade', 'CBO', 'cbo_descricao', 'nomespecialidade'],
  prof: ['nome_profissional', 'Profissional', 'Nome do Profissional', 'Medico', 'nomprofissional', 'codprofissional'],
  procCode: ['codigo_procedimento', 'codigo_procedimentos', 'Codigo procedimento', 'Cód. Procedimento'],
  procName: ['nome_procedimento', 'Nome procedimento', 'Procedimento'],
  city: ['municipio', 'Municipio', 'Cidade', 'municipio_paciente', 'nome_municipio_paciente', 'nommunicipio'], 
  age: ['idade', 'Idade', 'Idade atendimento paciente', 'idade_atendimento_paciente'],
  gender: ['sexo', 'Sexo', 'Genero', 'indsexo'],
  idEvolucao: ['id_evolucao', 'Id Evolucao', 'ID EVOLUÇÃO'],
  dataEvolucao: ['data_evolucao', 'Data Evolucao', 'DATA EVOLUÇÃO'],
  
  // AQUI: Capturando a coluna "tipo" para filtrarmos as internações
  tipo: ['tipo', 'Tipo', 'TIPO']
};

export const DEMAND_ALIASES = {
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