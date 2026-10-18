import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alunoDisciplinas, alunos, disciplinas, turmas, usuarios } from '../db/schema.js';
const normalizeDisciplinaIds = (value) => {
    if (Array.isArray(value))
        return value;
    if (typeof value === 'number')
        return [value];
    return [];
};
const buildAlunoResponse = async (aluno, disciplinaId) => {
    const turma = await db.select().from(turmas).where(eq(turmas.id, aluno.turmaId)).then((rows) => rows[0] ?? null);
    const disciplineRows = await db
        .select({
        id: disciplinas.id,
        nome: disciplinas.nome,
        carga_hora: disciplinas.carga_hora,
    })
        .from(alunoDisciplinas)
        .innerJoin(disciplinas, eq(alunoDisciplinas.disciplinaId, disciplinas.id))
        .where(disciplinaId === undefined
        ? eq(alunoDisciplinas.alunoId, aluno.id)
        : and(eq(alunoDisciplinas.alunoId, aluno.id), eq(alunoDisciplinas.disciplinaId, disciplinaId)));
    return {
        id: aluno.id,
        nome: aluno.nome,
        matriculado: aluno.matriculado,
        turma_id: aluno.turmaId,
        turma: turma ? { id: turma.id, nome: turma.nome } : null,
        disciplinas: disciplineRows,
    };
};
export const alunosService = {
    async list() {
        const allAlunos = await db.select().from(alunos);
        return Promise.all(allAlunos.map((aluno) => buildAlunoResponse(aluno)));
    },
    async findById(id, disciplinaId) {
        const [aluno] = await db.select().from(alunos).where(eq(alunos.id, id));
        if (!aluno)
            return null;
        return buildAlunoResponse(aluno, disciplinaId);
    },
    async findByUserId(userId) {
        const [aluno] = await db.select().from(alunos).where(eq(alunos.usuarioId, userId));
        if (!aluno)
            return null;
        return buildAlunoResponse(aluno);
    },
    async findAccountUserId(alunoId) {
        const [aluno] = await db.select({ usuarioId: alunos.usuarioId })
            .from(alunos)
            .where(eq(alunos.id, alunoId));
        return aluno?.usuarioId ?? null;
    },
    async listByDisciplineId(disciplinaId) {
        const rows = await db.select({ aluno: alunos })
            .from(alunos)
            .innerJoin(alunoDisciplinas, eq(alunoDisciplinas.alunoId, alunos.id))
            .where(eq(alunoDisciplinas.disciplinaId, disciplinaId));
        return Promise.all(rows.map(({ aluno }) => buildAlunoResponse(aluno, disciplinaId)));
    },
    async isLinkedToDiscipline(alunoId, disciplinaId) {
        const [row] = await db.select({ alunoId: alunoDisciplinas.alunoId })
            .from(alunoDisciplinas)
            .where(and(eq(alunoDisciplinas.alunoId, alunoId), eq(alunoDisciplinas.disciplinaId, disciplinaId)))
            .limit(1);
        return Boolean(row);
    },
    async create(data) {
        const [result] = await db.insert(alunos).values({
            nome: data.nome,
            matriculado: data.matriculado,
            turmaId: data.turmaId,
            usuarioId: data.usuarioId,
        });
        const alunoId = Number(result.insertId);
        const disciplineIds = [...new Set(data.disciplinaIds)];
        if (disciplineIds.length > 0) {
            await db.insert(alunoDisciplinas).values(disciplineIds.map((disciplinaId) => ({
                alunoId,
                disciplinaId,
            })));
        }
        return this.findById(alunoId);
    },
    async update(id, data) {
        if (data.nome !== undefined || data.matriculado !== undefined || data.turmaId !== undefined) {
            await db.update(alunos)
                .set({
                ...(data.nome !== undefined ? { nome: data.nome } : {}),
                ...(data.matriculado !== undefined ? { matriculado: data.matriculado } : {}),
                ...(data.turmaId !== undefined ? { turmaId: data.turmaId } : {}),
            })
                .where(eq(alunos.id, id));
        }
        if (data.disciplinaIds !== undefined || data.disciplinaId !== undefined) {
            const nextIds = normalizeDisciplinaIds(data.disciplinaIds ?? data.disciplinaId);
            await db.delete(alunoDisciplinas).where(eq(alunoDisciplinas.alunoId, id));
            if (nextIds.length > 0) {
                await db.insert(alunoDisciplinas).values(nextIds.map((disciplinaId) => ({
                    alunoId: id,
                    disciplinaId,
                })));
            }
        }
        return this.findById(id);
    },
    async remove(id) {
        return db.transaction(async (tx) => {
            const [aluno] = await tx.select({ usuarioId: alunos.usuarioId }).from(alunos).where(eq(alunos.id, id));
            if (!aluno)
                return false;
            await tx.delete(alunoDisciplinas).where(eq(alunoDisciplinas.alunoId, id));
            await tx.delete(alunos).where(eq(alunos.id, id));
            await tx.delete(usuarios).where(eq(usuarios.id, aluno.usuarioId));
            return true;
        });
    },
};
