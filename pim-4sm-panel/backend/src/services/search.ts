import { db } from '../db/index.js';
import { alunos, disciplinas, professores, turmas } from '../db/schema.js';
import { eq, like } from 'drizzle-orm';

export const searchService = {
  async search(query: string) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return {
        alunos: [],
        professores: [],
        disciplinas: [],
        turmas: [],
      };
    }

    const searchPattern = `%${normalizedQuery}%`;

    const [alunosResult, professoresResult, disciplinasResult, turmasResult] = await Promise.all([
      db
        .select({
          id: alunos.id,
          nome: alunos.nome,
          turma: turmas.nome,
        })
        .from(alunos)
        .leftJoin(turmas, eq(alunos.turmaId, turmas.id))
        .where(like(alunos.nome, searchPattern)),

      db
        .select({
          id: professores.id,
          nome: professores.nome,
          disciplina: disciplinas.nome,
        })
        .from(professores)
        .leftJoin(disciplinas, eq(professores.disciplinaId, disciplinas.id))
        .where(like(professores.nome, searchPattern)),

      db
        .select({
          id: disciplinas.id,
          nome: disciplinas.nome,
          carga_hora: disciplinas.carga_hora,
        })
        .from(disciplinas)
        .where(like(disciplinas.nome, searchPattern)),

      db
        .select({
          id: turmas.id,
          nome: turmas.nome,
        })
        .from(turmas)
        .where(like(turmas.nome, searchPattern)),
    ]);

    return {
      alunos: alunosResult,
      professores: professoresResult,
      disciplinas: disciplinasResult,
      turmas: turmasResult,
    };
  },
};
