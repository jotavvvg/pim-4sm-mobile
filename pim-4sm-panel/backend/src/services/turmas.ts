import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alunos, turmas } from '../db/schema.js';

export const turmasService = {
  async list() {
    return db.query.turmas.findMany({
      with: {
        alunos: true,
      },
    });
  },

  async findById(id: number) {
    return db.query.turmas.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      with: {
        alunos: true,
      },
    });
  },

  async create(data: { nome: string }) {
    const [result] = await db.insert(turmas).values(data);
    return result.insertId ? { id: Number(result.insertId), ...data } : null;
  },

  async update(id: number, data: Partial<{ nome: string }>) {
    const [result] = await db.update(turmas).set(data).where(eq(turmas.id, id));

    if ((result.affectedRows ?? 0) === 0) {
      return null;
    }

    return this.findById(id);
  },

  async remove(id: number) {
    const [result] = await db.delete(turmas).where(eq(turmas.id, id));
    return (result.affectedRows ?? 0) > 0;
  },
};
