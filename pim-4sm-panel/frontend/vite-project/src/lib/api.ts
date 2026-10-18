import axios from 'axios';

import type {
  Aluno,
  Activity,
  AuthResponse,
  DashboardSummary,
  Disciplina,
  MetricsResponse,
  PendingEvaluation,
  Professor,
  ProfessorGradeMetrics,
  SearchResponse,
  StudentGradeMetrics,
  StudentSubmission,
  SubmittedAnswerInput,
  Turma,
} from '@/types/entities';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('bestauth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const requestUrl = error.config?.url ?? '';
    if (!requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/bootstrap')) {
      sessionStorage.removeItem('bestauth_token');
      sessionStorage.removeItem('bestauth_role');
      window.dispatchEvent(new Event('bestauth:expired'));
    }
  }
  return Promise.reject(error);
});

export const login = (username: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { username, password }).then((response) => response.data);

export const bootstrapAdmin = (username: string, password: string) =>
  api.post<unknown>('/auth/bootstrap', { username, password, role: 'ADMIN' }).then((response) => response.data);

export const fetchDisciplinas = () => api.get<Disciplina[]>('/disciplinas').then((response) => response.data);
export const fetchTurmas = () => api.get<Turma[]>('/turmas').then((response) => response.data);
export const fetchProfessores = () => api.get<Professor[]>('/professores').then((response) => response.data);
export const fetchAlunos = () => api.get<Aluno[]>('/alunos').then((response) => response.data);
export const fetchMetrics = () => api.get<MetricsResponse>('/metrics').then((response) => response.data);
export const fetchGradeMetrics = () => api.get<ProfessorGradeMetrics | StudentGradeMetrics>('/metrics/grades').then((response) => response.data);
export const searchGlobal = (query: string) => api.get<SearchResponse>('/search', { params: { q: query } }).then((response) => response.data);
export const fetchActivities = () => api.get<Activity[]>('/atividades').then((response) => response.data);
export const createActivity = (payload: {
  titulo: string;
  disciplina_id: number;
  questoes: Array<{
    tipo: 'MULTIPLACADA' | 'DISSERTATIVA';
    enunciado: string;
    opcoes: string[] | null;
    resposta_correta: string | null;
  }>;
}) => api.post<Activity>('/atividades', payload).then((response) => response.data);
export const submitActivity = (id: number, answers: SubmittedAnswerInput[]) =>
  api.post<StudentSubmission>(`/atividades/${id}/submeter`, answers).then((response) => response.data);
export const fetchPendingEvaluations = () =>
  api.get<PendingEvaluation[]>('/avaliacoes/pendentes').then((response) => response.data);
export const correctEvaluationAnswer = (answerId: number, correta: boolean) =>
  api.post<StudentSubmission>(`/avaliacoes/questoes/${answerId}/corrigir`, { correta }).then((response) => response.data);

export const fetchTurmaById = (id: number) => api.get<Turma>(`/turmas/${id}`).then((response) => response.data);
export const fetchDisciplinaById = (id: number) => api.get<Disciplina>(`/disciplinas/${id}`).then((response) => response.data);
export const fetchAlunoById = (id: number) => api.get<Aluno>(`/alunos/${id}`).then((response) => response.data);
export const fetchMyProfessorProfile = () => api.get<Professor>('/professores/me').then((response) => response.data);
export const fetchMyProfessorStudents = () => api.get<Aluno[]>('/professores/me/alunos').then((response) => response.data);
export const fetchMyStudentProfile = () => api.get<Aluno>('/alunos/me').then((response) => response.data);
export const fetchMyStudentClasses = () => api.get<unknown>('/alunos/me/classes').then((response) => response.data);

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const [disciplinas, turmas, professores, alunos] = await Promise.all([
    fetchDisciplinas(),
    fetchTurmas(),
    fetchProfessores(),
    fetchAlunos(),
  ]);

  return {
    disciplinas: disciplinas.length,
    turmas: turmas.length,
    professores: professores.length,
    alunos: alunos.length,
  };
};

export const createDisciplina = (payload: Omit<Disciplina, 'id'>) =>
  api.post<Disciplina>('/disciplinas', payload).then((response) => response.data);

export const updateDisciplina = (id: number, payload: Omit<Disciplina, 'id'>) =>
  api.put<Disciplina>(`/disciplinas/${id}`, payload).then((response) => response.data);

export const deleteDisciplina = (id: number) => api.delete(`/disciplinas/${id}`);

export const createTurma = (payload: Pick<Turma, 'nome'>) =>
  api.post<Turma>('/turmas', payload).then((response) => response.data);

export const updateTurma = (id: number, payload: Pick<Turma, 'nome'>) =>
  api.put<Turma>(`/turmas/${id}`, payload).then((response) => response.data);

export const deleteTurma = (id: number) => api.delete(`/turmas/${id}`);

export const createProfessor = (payload: { nome: string; disciplina_id: number; username: string; password: string; role: 'PROFESSOR' }) =>
  api.post<Professor>('/professores', payload).then((response) => response.data);

export const updateProfessor = (id: number, payload: { nome: string; disciplina_id: number; username?: string; password?: string }) =>
  api.put<Professor>(`/professores/${id}`, payload).then((response) => response.data);

export const deleteProfessor = (id: number) => api.delete(`/professores/${id}`);

export const createAluno = (payload: { nome: string; matriculado: boolean; turma_id: number; disciplina_ids: number[]; username: string; password: string; role: 'ALUNO' }) =>
  api.post<Aluno>('/alunos', payload).then((response) => response.data);

export const updateAluno = (id: number, payload: { nome: string; matriculado: boolean; turma_id: number; disciplina_ids: number[]; username?: string; password?: string }) =>
  api.put<Aluno>(`/alunos/${id}`, payload).then((response) => response.data);

export const deleteAluno = (id: number) => api.delete(`/alunos/${id}`);

export const toCreateProfessorPayload = (data: { nome: string; disciplinaId: number; username: string; password: string }) => ({
  nome: data.nome,
  disciplina_id: data.disciplinaId,
  username: data.username,
  password: data.password,
  role: 'PROFESSOR' as const,
});

export const toUpdateProfessorPayload = (data: { nome: string; disciplinaId: number; username?: string; password?: string }) => ({
  nome: data.nome,
  disciplina_id: data.disciplinaId,
  ...(data.username ? { username: data.username } : {}),
  ...(data.password ? { password: data.password } : {}),
});

export const toCreateAlunoPayload = (data: { nome: string; matriculado: boolean; turmaId: number; disciplinaIds: number[]; username: string; password: string }) => ({
  nome: data.nome,
  matriculado: data.matriculado,
  turma_id: data.turmaId,
  disciplina_ids: data.disciplinaIds,
  username: data.username,
  password: data.password,
  role: 'ALUNO' as const,
});

export const toUpdateAlunoPayload = (data: { nome: string; matriculado: boolean; turmaId: number; disciplinaIds: number[]; username?: string; password?: string }) => ({
  nome: data.nome,
  matriculado: data.matriculado,
  turma_id: data.turmaId,
  disciplina_ids: data.disciplinaIds,
  ...(data.username ? { username: data.username } : {}),
  ...(data.password ? { password: data.password } : {}),
});

export default api;
