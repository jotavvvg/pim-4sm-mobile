import { count, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alunoDisciplinas, atividades, disciplinas, professores } from '../db/schema.js';

export const disciplinasService = {
  async list() {
    return db.select().from(disciplinas);
  },

  async findById(id: number) {
    const [item] = await db.select().from(disciplinas).where(eq(disciplinas.id, id));
    return item ?? null;
  },

  async create(data: { nome: string; carga_hora: number }) {
    const [result] = await db.insert(disciplinas).values(data);
    return result.insertId ? { id: Number(result.insertId), ...data } : null;
  },

  async update(id: number, data: Partial<{ nome: string; carga_hora: number }>) {
    const [result] = await db.update(disciplinas).set(data).where(eq(disciplinas.id, id));

    if ((result.affectedRows ?? 0) === 0) {
      return null;
    }

    return this.findById(id);
  },

  async remove(id: number) {
    const item = await this.findById(id);
    if (!item) return { removed: false as const };

    const [professoresResult, alunosResult, atividadesResult] = await Promise.all([
      db.select({ count: count() }).from(professores).where(eq(professores.disciplinaId, id)),
      db.select({ count: count() }).from(alunoDisciplinas).where(eq(alunoDisciplinas.disciplinaId, id)),
      db.select({ count: count() }).from(atividades).where(eq(atividades.disciplinaId, id)),
    ]);
    const linked = [
      { count: professoresResult[0]?.count ?? 0, singular: 'professor', plural: 'professores' },
      { count: alunosResult[0]?.count ?? 0, singular: 'aluno', plural: 'alunos' },
      { count: atividadesResult[0]?.count ?? 0, singular: 'atividade', plural: 'atividades' },
    ].filter((item) => item.count > 0);

    if (linked.length) {
      const details = linked.map(({ count: total, singular, plural }) => `${total} ${total === 1 ? singular : plural}`).join(', ');
      return {
        removed: false as const,
        reason: `Não é possível excluir a disciplina porque ela ainda está vinculada a ${details}. Remova ou reassocie esses registros primeiro.`,
      };
    }

    const [result] = await db.delete(disciplinas).where(eq(disciplinas.id, id));
    return { removed: (result.affectedRows ?? 0) > 0 } as const;
  },
};
