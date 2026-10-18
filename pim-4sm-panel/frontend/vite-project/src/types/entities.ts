export interface Disciplina {
  id: number;
  nome: string;
  carga_hora: number;
}

export type UserRole = 'ADMIN' | 'PROFESSOR' | 'ALUNO';

export interface AuthResponse {
  token: string;
  role: UserRole;
}

export interface Turma {
  id: number;
  nome: string;
  alunos?: Aluno[];
}

export interface Professor {
  id: number;
  nome: string;
  disciplinaId?: number;
  usuarioId?: number;
  username?: string;
  disciplina?: Disciplina;
}

export interface Aluno {
  id: number;
  nome: string;
  matriculado: boolean;
  turmaId?: number;
  turma_id?: number;
  usuarioId?: number;
  usuario_id?: number;
  username?: string;
  disciplinaId?: number;
  disciplinaIds?: number[];
  disciplinas?: Disciplina[];
  turma?: Turma;
  disciplina?: Disciplina;
}

export interface DashboardSummary {
  disciplinas: number;
  turmas: number;
  professores: number;
  alunos: number;
}

export interface MetricEntry {
  turma?: string;
  count?: number;
  nome?: string;
  horas?: number;
}

export interface MetricsResponse {
  totalAlunos: number;
  totalProfessores: number;
  alunosPorTurma: MetricEntry[];
  cargaHorariaPorDisciplina: MetricEntry[];
}

export type ActivityQuestionType = 'MULTIPLACADA' | 'DISSERTATIVA';

export interface ActivityQuestion {
  id: number;
  atividadeId: number;
  tipo: ActivityQuestionType;
  enunciado: string;
  opcoes: string[] | null;
  respostaCorreta?: string | null;
}

export interface Activity {
  id: number;
  titulo: string;
  disciplinaId: number;
  disciplina?: Disciplina;
  questoes: ActivityQuestion[];
  minhaSubmissao?: Pick<StudentSubmission, 'id' | 'statusCorrecao' | 'notaTotal'> | null;
}

export interface SubmittedAnswerInput {
  questao_id: number;
  resposta_dada: string;
}

export interface SubmissionAnswer {
  id: number;
  submissaoId: number;
  questaoId: number;
  respostaDada: string;
  correta: boolean | null;
  questao: ActivityQuestion;
}

export interface StudentSubmission {
  id: number;
  alunoId: number;
  atividadeId: number;
  statusCorrecao: 'PENDENTE' | 'CONCLUIDO';
  notaTotal: string | null;
  atividade: Activity;
  respostas: SubmissionAnswer[];
}

export interface PendingEvaluation extends StudentSubmission {
  aluno: Pick<Aluno, 'id' | 'nome'>;
  respostas: Array<SubmissionAnswer & { questao: ActivityQuestion }>;
}

export interface ProfessorGradeMetrics {
  mediaPorAluno: Array<{ aluno_id: number; aluno: string; media: number }>;
  mediaPorTurma: Array<{ turma_id: number; turma: string; media: number }>;
}

export interface StudentGradeMetrics {
  mediaPorDisciplina: Array<{ disciplina_id: number; disciplina: string; media: number }>;
}

export interface SearchResponse {
  alunos: Aluno[];
  professores: Professor[];
  disciplinas: Disciplina[];
  turmas: Turma[];
}
