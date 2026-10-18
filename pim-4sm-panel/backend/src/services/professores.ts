import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { professores, usuarios } from '../db/schema.js';

export const professoresService = {
  async list() {
    return db.query.professores.findMany({
      with: {
        disciplina: true,
      },
    });
  },

  async findById(id: number) {
    return db.query.professores.findFirst({
      where: (p, { eq }) => eq(p.id, id),
      with: {
        disciplina: true,
      },
    });
  },

  async findByUserId(userId: number) {
    return db.query.professores.findFirst({
      where: (professor, { eq }) => eq(professor.usuarioId, userId),
      with: {
        disciplina: true,
      },
    });
  },

  async create(data: { nome: string; disciplinaId: number; usuarioId: number }) {
    const [result] = await db.insert(professores).values(data);
    return result.insertId ? { id: Number(result.insertId), ...data } : null;
  },

  async update(id: number, data: Partial<{ nome: string; disciplinaId: number }>) {
    const [result] = await db.update(professores).set(data).where(eq(professores.id, id));

    if ((result.affectedRows ?? 0) === 0) {
      return null;
    }

    return this.findById(id);
  },

  async remove(id: number) {
    return db.transaction(async (tx) => {
      const [professor] = await tx.select({ usuarioId: professores.usuarioId })
        .from(professores)
        .where(eq(professores.id, id));
      if (!professor) return false;
      await tx.delete(professores).where(eq(professores.id, id));
      await tx.delete(usuarios).where(eq(usuarios.id, professor.usuarioId));
      return true;
    });
  },
};
