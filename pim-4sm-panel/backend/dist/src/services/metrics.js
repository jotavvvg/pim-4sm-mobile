import { db } from '../db/index.js';
import { alunos, disciplinas, professores, turmas } from '../db/schema.js';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { atividades, alunoDisciplinas, submissoesAlunos } from '../db/schema.js';
export const metricsService = {
    async getMetrics() {
        const [totalAlunosResult] = await db.select({ count: count() }).from(alunos);
        const [totalProfessoresResult] = await db.select({ count: count() }).from(professores);
        const alunosPorTurma = await db
            .select({
            turma: turmas.nome,
            count: count(alunos.id),
        })
            .from(alunos)
            .leftJoin(turmas, eq(alunos.turmaId, turmas.id))
            .groupBy(turmas.nome)
            .orderBy(asc(turmas.nome));
        const cargaHorariaPorDisciplina = await db
            .select({
            nome: disciplinas.nome,
            horas: sql `sum(${disciplinas.carga_hora})`.as('horas'),
        })
            .from(disciplinas)
            .groupBy(disciplinas.id, disciplinas.nome)
            .orderBy(asc(disciplinas.nome));
        return {
            totalAlunos: Number(totalAlunosResult?.count ?? 0),
            totalProfessores: Number(totalProfessoresResult?.count ?? 0),
            alunosPorTurma: alunosPorTurma.map((item) => ({
                turma: item.turma ?? 'Sem turma',
                count: Number(item.count),
            })),
            cargaHorariaPorDisciplina: cargaHorariaPorDisciplina.map((item) => ({
                nome: item.nome,
                horas: Number(item.horas ?? 0),
            })),
        };
    },
    async getGradeMetricsForProfessor(disciplinaId) {
        const completed = eq(submissoesAlunos.statusCorrecao, 'CONCLUIDO');
        const disciplineFilter = eq(atividades.disciplinaId, disciplinaId);
        const mediaPorAluno = await db.select({
            aluno_id: alunos.id,
            aluno: alunos.nome,
            media: sql `avg(${submissoesAlunos.notaTotal})`,
        })
            .from(submissoesAlunos)
            .innerJoin(atividades, eq(submissoesAlunos.atividadeId, atividades.id))
            .innerJoin(alunos, eq(submissoesAlunos.alunoId, alunos.id))
            .where(and(completed, disciplineFilter))
            .groupBy(alunos.id, alunos.nome)
            .orderBy(asc(alunos.nome));
        const mediaPorTurma = await db.select({
            turma_id: turmas.id,
            turma: turmas.nome,
            media: sql `avg(${submissoesAlunos.notaTotal})`,
        })
            .from(submissoesAlunos)
            .innerJoin(atividades, eq(submissoesAlunos.atividadeId, atividades.id))
            .innerJoin(alunos, eq(submissoesAlunos.alunoId, alunos.id))
            .innerJoin(turmas, eq(alunos.turmaId, turmas.id))
            .where(and(completed, disciplineFilter))
            .groupBy(turmas.id, turmas.nome)
            .orderBy(asc(turmas.nome));
        return {
            mediaPorAluno: mediaPorAluno.map((item) => ({ ...item, media: Number(item.media ?? 0) })),
            mediaPorTurma: mediaPorTurma.map((item) => ({ ...item, media: Number(item.media ?? 0) })),
        };
    },
    async getGradeMetricsForStudent(userId) {
        const rows = await db.select({
            disciplina_id: disciplinas.id,
            disciplina: disciplinas.nome,
            media: sql `avg(${submissoesAlunos.notaTotal})`,
        })
            .from(submissoesAlunos)
            .innerJoin(atividades, eq(submissoesAlunos.atividadeId, atividades.id))
            .innerJoin(alunos, eq(submissoesAlunos.alunoId, alunos.id))
            .innerJoin(alunoDisciplinas, and(eq(alunoDisciplinas.alunoId, alunos.id), eq(alunoDisciplinas.disciplinaId, atividades.disciplinaId)))
            .innerJoin(disciplinas, eq(atividades.disciplinaId, disciplinas.id))
            .where(and(eq(alunos.usuarioId, userId), eq(submissoesAlunos.statusCorrecao, 'CONCLUIDO')))
            .groupBy(disciplinas.id, disciplinas.nome)
            .orderBy(asc(disciplinas.nome));
        return {
            mediaPorDisciplina: rows.map((item) => ({ ...item, media: Number(item.media ?? 0) })),
        };
    },
};
