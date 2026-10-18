import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { atividades, alunos, questoes, respostasQuestoes, submissoesAlunos } from '../db/schema.js';
import { alunosService } from './alunos.js';
const calculateGrade = (answers) => {
    const correctCount = answers.filter((answer) => answer.correta === true).length;
    return answers.length ? Number(((correctCount / answers.length) * 10).toFixed(2)) : 0;
};
export const avaliacoesService = {
    async submit(userId, atividadeId, submittedAnswers) {
        const student = await db.query.alunos.findFirst({ where: eq(alunos.usuarioId, userId) });
        if (!student)
            return { error: 'STUDENT_NOT_FOUND' };
        const activity = await db.query.atividades.findFirst({
            where: eq(atividades.id, atividadeId),
            with: { questoes: true },
        });
        if (!activity)
            return { error: 'ACTIVITY_NOT_FOUND' };
        const enrollment = await alunosService.isLinkedToDiscipline(student.id, activity.disciplinaId);
        if (!enrollment)
            return { error: 'ACTIVITY_NOT_FOUND' };
        const questionById = new Map(activity.questoes.map((question) => [question.id, question]));
        const answerIds = submittedAnswers.map((answer) => answer.questao_id);
        if (activity.questoes.length === 0 ||
            submittedAnswers.length !== activity.questoes.length ||
            new Set(answerIds).size !== answerIds.length ||
            answerIds.some((id) => !questionById.has(id))) {
            return { error: 'INVALID_ANSWERS' };
        }
        const transactionResult = await db.transaction(async (tx) => {
            const [lockedStudent] = await tx.select({ id: alunos.id })
                .from(alunos)
                .where(eq(alunos.id, student.id))
                .for('update');
            if (!lockedStudent)
                return { error: 'STUDENT_NOT_FOUND' };
            const [existingSubmission] = await tx.select({ id: submissoesAlunos.id })
                .from(submissoesAlunos)
                .where(and(eq(submissoesAlunos.alunoId, student.id), eq(submissoesAlunos.atividadeId, atividadeId)))
                .limit(1);
            if (existingSubmission)
                return { error: 'ALREADY_SUBMITTED' };
            const [submissionResult] = await tx.insert(submissoesAlunos).values({
                alunoId: student.id,
                atividadeId,
                statusCorrecao: 'PENDENTE',
                notaTotal: null,
            });
            const id = Number(submissionResult.insertId);
            const rows = submittedAnswers.map((answer) => {
                const question = questionById.get(answer.questao_id);
                return {
                    submissaoId: id,
                    questaoId: question.id,
                    respostaDada: answer.resposta_dada,
                    correta: question.tipo === 'MULTIPLACADA'
                        ? answer.resposta_dada.trim() === (question.respostaCorreta ?? '').trim()
                        : null,
                };
            });
            await tx.insert(respostasQuestoes).values(rows);
            if (!rows.some((answer) => answer.correta === null)) {
                await tx.update(submissoesAlunos)
                    .set({ statusCorrecao: 'CONCLUIDO', notaTotal: calculateGrade(rows).toFixed(2) })
                    .where(eq(submissoesAlunos.id, id));
            }
            return { submissionId: id };
        });
        if ('error' in transactionResult)
            return transactionResult;
        const submissionId = transactionResult.submissionId;
        const submission = await db.query.submissoesAlunos.findFirst({
            where: eq(submissoesAlunos.id, submissionId),
            with: { atividade: true, respostas: { with: { questao: true } } },
        });
        if (!submission)
            return undefined;
        return {
            ...submission,
            respostas: submission.respostas.map(({ questao, ...answer }) => {
                const { respostaCorreta: _correctAnswer, ...publicQuestion } = questao;
                return { ...answer, questao: publicQuestion };
            }),
        };
    },
    async listPendingForDiscipline(disciplinaId) {
        const pendingIds = await db.select({ id: submissoesAlunos.id })
            .from(submissoesAlunos)
            .innerJoin(atividades, eq(submissoesAlunos.atividadeId, atividades.id))
            .where(and(eq(submissoesAlunos.statusCorrecao, 'PENDENTE'), eq(atividades.disciplinaId, disciplinaId)));
        if (!pendingIds.length)
            return [];
        const rows = await db.query.submissoesAlunos.findMany({
            where: inArray(submissoesAlunos.id, pendingIds.map((submission) => submission.id)),
            with: {
                aluno: true,
                atividade: true,
                respostas: { with: { questao: true } },
            },
        });
        return rows.map((submission) => ({
            ...submission,
            respostas: submission.respostas.filter((answer) => answer.questao.tipo === 'DISSERTATIVA' && answer.correta === null),
        }));
    },
    async gradeAnswer(answerId, disciplinaId, correta) {
        return db.transaction(async (tx) => {
            await tx.select({ id: submissoesAlunos.id })
                .from(submissoesAlunos)
                .innerJoin(respostasQuestoes, eq(respostasQuestoes.submissaoId, submissoesAlunos.id))
                .where(eq(respostasQuestoes.id, answerId))
                .for('update');
            const [answer] = await tx.select({
                response: respostasQuestoes,
                submission: submissoesAlunos,
                question: questoes,
            })
                .from(respostasQuestoes)
                .innerJoin(submissoesAlunos, eq(respostasQuestoes.submissaoId, submissoesAlunos.id))
                .innerJoin(questoes, eq(respostasQuestoes.questaoId, questoes.id))
                .innerJoin(atividades, eq(questoes.atividadeId, atividades.id))
                .where(eq(respostasQuestoes.id, answerId))
                .limit(1);
            if (!answer || answer.question.tipo !== 'DISSERTATIVA' || answer.response.correta !== null || answer.submission.statusCorrecao !== 'PENDENTE') {
                return { error: 'ANSWER_NOT_FOUND' };
            }
            const [activity] = await tx.select({ disciplinaId: atividades.disciplinaId })
                .from(atividades)
                .where(eq(atividades.id, answer.submission.atividadeId))
                .limit(1);
            if (!activity || activity.disciplinaId !== disciplinaId) {
                return { error: 'ANSWER_NOT_FOUND' };
            }
            await tx.update(respostasQuestoes).set({ correta }).where(eq(respostasQuestoes.id, answerId));
            const updatedAnswers = await tx.select({ correta: respostasQuestoes.correta })
                .from(respostasQuestoes)
                .where(eq(respostasQuestoes.submissaoId, answer.submission.id));
            const isComplete = updatedAnswers.every((item) => item.correta !== null);
            if (isComplete) {
                await tx.update(submissoesAlunos)
                    .set({ statusCorrecao: 'CONCLUIDO', notaTotal: calculateGrade(updatedAnswers).toFixed(2) })
                    .where(and(eq(submissoesAlunos.id, answer.submission.id), eq(submissoesAlunos.statusCorrecao, 'PENDENTE')));
            }
            return tx.query.submissoesAlunos.findFirst({
                where: eq(submissoesAlunos.id, answer.submission.id),
                with: { aluno: true, atividade: true, respostas: { with: { questao: true } } },
            });
        });
    },
};
