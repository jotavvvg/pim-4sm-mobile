import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { disciplinas } from '../db/schema.js';

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
    const [result] = await db.delete(disciplinas).where(eq(disciplinas.id, id));
    return (result.affectedRows ?? 0) > 0;
  },
};
