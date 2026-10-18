import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: number; role: 'ADMIN' | 'PROFESSOR' | 'ALUNO' };
    user: { userId: number; role: 'ADMIN' | 'PROFESSOR' | 'ALUNO' };
  }
}
