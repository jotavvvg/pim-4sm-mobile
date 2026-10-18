import { compare, hash } from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alunoDisciplinas, alunos, professores, usuarios } from '../db/schema.js';
const hashPassword = (password) => hash(password, 12);
export const accountsService = {
    async login(username, password) {
        const user = await db.query.usuarios.findFirst({
            where: eq(usuarios.username, username),
        });
        if (!user || !(await compare(password, user.passwordHash)))
            return null;
        return { id: user.id, role: user.role, username: user.username };
    },
    async createAdmin(data) {
        const passwordHash = await hashPassword(data.password);
        const [result] = await db.insert(usuarios).values({
            username: data.username,
            passwordHash,
            role: 'ADMIN',
        });
        return { id: Number(result.insertId), username: data.username, role: 'ADMIN' };
    },
    async createProfessor(data) {
        const passwordHash = await hashPassword(data.password);
        return db.transaction(async (tx) => {
            const [userResult] = await tx.insert(usuarios).values({
                username: data.username,
                passwordHash,
                role: 'PROFESSOR',
            });
            const usuarioId = Number(userResult.insertId);
            const [professorResult] = await tx.insert(professores).values({
                nome: data.nome,
                disciplinaId: data.disciplinaId,
                usuarioId,
            });
            return {
                id: Number(professorResult.insertId),
                nome: data.nome,
                disciplina_id: data.disciplinaId,
                usuario_id: usuarioId,
                username: data.username,
                role: 'PROFESSOR',
            };
        });
    },
    async createAluno(data) {
        const passwordHash = await hashPassword(data.password);
        return db.transaction(async (tx) => {
            const [userResult] = await tx.insert(usuarios).values({
                username: data.username,
                passwordHash,
                role: 'ALUNO',
            });
            const usuarioId = Number(userResult.insertId);
            const [alunoResult] = await tx.insert(alunos).values({
                nome: data.nome,
                matriculado: data.matriculado,
                turmaId: data.turmaId,
                usuarioId,
            });
            const alunoId = Number(alunoResult.insertId);
            const disciplinaIds = [...new Set(data.disciplinaIds)];
            if (disciplinaIds.length) {
                await tx.insert(alunoDisciplinas).values(disciplinaIds.map((disciplinaId) => ({ alunoId, disciplinaId })));
            }
            return {
                id: alunoId,
                nome: data.nome,
                matriculado: data.matriculado,
                turma_id: data.turmaId,
                usuario_id: usuarioId,
                username: data.username,
                role: 'ALUNO',
                disciplina_ids: disciplinaIds,
            };
        });
    },
    async updateCredentials(userId, data) {
        if (data.username === undefined && data.password === undefined)
            return;
        await db.update(usuarios).set({
            ...(data.username !== undefined ? { username: data.username } : {}),
            ...(data.password !== undefined ? { passwordHash: await hashPassword(data.password) } : {}),
        }).where(eq(usuarios.id, userId));
    },
    async listAdmins() {
        return db.select({ id: usuarios.id, username: usuarios.username, role: usuarios.role })
            .from(usuarios)
            .where(eq(usuarios.role, 'ADMIN'));
    },
    async updateAdmin(userId, data) {
        const [existingAdmin] = await db.select({ id: usuarios.id })
            .from(usuarios)
            .where(and(eq(usuarios.id, userId), eq(usuarios.role, 'ADMIN')));
        if (!existingAdmin)
            return null;
        await this.updateCredentials(userId, data);
        const [admin] = await db.select({ id: usuarios.id, username: usuarios.username, role: usuarios.role })
            .from(usuarios)
            .where(and(eq(usuarios.id, userId), eq(usuarios.role, 'ADMIN')));
        return admin ?? null;
    },
    async removeAdmin(userId) {
        const [result] = await db.delete(usuarios)
            .where(and(eq(usuarios.id, userId), eq(usuarios.role, 'ADMIN')));
        return (result.affectedRows ?? 0) > 0;
    },
};
