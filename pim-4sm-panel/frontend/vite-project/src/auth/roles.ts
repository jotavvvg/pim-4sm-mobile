import type { UserRole } from '@/types/entities';

export const roleHomePath: Record<UserRole, string> = {
  ADMIN: '/',
  PROFESSOR: '/professor/disciplina',
  ALUNO: '/aluno/perfil',
};