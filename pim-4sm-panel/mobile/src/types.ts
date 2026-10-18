export type UserRole = 'ADMIN' | 'PROFESSOR' | 'ALUNO';

export type AuthResponse = {
  token: string;
  role: UserRole;
};
