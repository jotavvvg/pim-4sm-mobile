import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './App.css';
import { AuthProvider } from '@/auth/AuthContext';
import { DashboardLayout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AlunosPage } from '@/pages/AlunosPage';
import { ActivitiesListPage } from '@/pages/ActivitiesListPage';
import { ActivityBuilderPage } from '@/pages/ActivityBuilderPage';
import { ActivityResponsePage } from '@/pages/ActivityResponsePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DisciplinasPage } from '@/pages/DisciplinasPage';
import { LoginPage } from '@/pages/LoginPage';
import { PendingEvaluationsPage } from '@/pages/PendingEvaluationsPage';
import { ProfessorDisciplinePage } from '@/pages/ProfessorDisciplinePage';
import { ProfessorStudentsPage } from '@/pages/ProfessorStudentsPage';
import { ProfessoresPage } from '@/pages/ProfessoresPage';
import { StudentProfilePage } from '@/pages/StudentProfilePage';
import { StudentSubjectsPage } from '@/pages/StudentSubjectsPage';
import { TurmasPage } from '@/pages/TurmasPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/disciplinas" element={<DisciplinasPage />} />
                <Route path="/turmas" element={<TurmasPage />} />
                <Route path="/professores" element={<ProfessoresPage />} />
                <Route path="/alunos" element={<AlunosPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['PROFESSOR']} />}>
                <Route path="/professor/disciplina" element={<ProfessorDisciplinePage />} />
                <Route path="/professor/alunos" element={<ProfessorStudentsPage />} />
                <Route path="/atividades/nova" element={<ActivityBuilderPage />} />
                <Route path="/avaliacoes" element={<PendingEvaluationsPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['ALUNO']} />}>
                <Route path="/aluno/perfil" element={<StudentProfilePage />} />
                <Route path="/aluno/disciplinas" element={<StudentSubjectsPage />} />
                <Route path="/atividades" element={<ActivitiesListPage />} />
                <Route path="/atividades/:id/responder" element={<ActivityResponsePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
