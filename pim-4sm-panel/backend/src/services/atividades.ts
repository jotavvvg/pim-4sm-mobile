import { desc, eq, inArray } from 'drizzle-orm';

import { db } from '../db/index.js';
import { atividades, disciplinas, questoes, submissoesAlunos } from '../db/schema.js';
import { alunosService } from './alunos.js';
import { professoresService } from './professores.js';

type ActivityQuestionInput = {
  tipo: 'MULTIPLACADA' | 'DISSERTATIVA';
  enunciado: string;
  opcoes?: string[] | null;
  resposta_correta?: string | null;
};

export const atividadesService = {
  async create(data: { titulo: string; disciplinaId: number; questoes: ActivityQuestionInput[] }) {
    return db.transaction(async (tx) => {
      const [activityResult] = await tx.insert(atividades).values({
        titulo: data.titulo,
        disciplinaId: data.disciplinaId,
      });
      const atividadeId = Number(activityResult.insertId);

      await tx.insert(questoes).values(data.questoes.map((question) => ({
        atividadeId,
        tipo: question.tipo,
        enunciado: question.enunciado,
        opcoes: question.tipo === 'MULTIPLACADA' ? question.opcoes ?? [] : null,
        respostaCorreta: question.tipo === 'MULTIPLACADA' ? question.resposta_correta ?? null : null,
      })));

      return atividadeId;
    });
  },

  async listForUser(userId: number, role: 'PROFESSOR' | 'ALUNO') {
    let disciplineIds: number[];
    let studentId: number | null = null;
    if (role === 'PROFESSOR') {
      const professor = await professoresService.findByUserId(userId);
      if (!professor) return [];
      disciplineIds = [professor.disciplinaId];
    } else {
      const student = await alunosService.findByUserId(userId);
      if (!student) return [];
      studentId = student.id;
      disciplineIds = student.disciplinas.map((discipline) => discipline.id);
    }

    if (!disciplineIds.length) return [];
    const rows = await db.query.atividades.findMany({
      where: inArray(atividades.disciplinaId, disciplineIds),
      with: {
        disciplina: true,
        questoes: true,
      },
    });

    const submissions = studentId === null || rows.length === 0
      ? []
      : await db.select({
          id: submissoesAlunos.id,
          atividadeId: submissoesAlunos.atividadeId,
          statusCorrecao: submissoesAlunos.statusCorrecao,
          notaTotal: submissoesAlunos.notaTotal,
        })
          .from(submissoesAlunos)
          .where(eq(submissoesAlunos.alunoId, studentId))
          .orderBy(desc(submissoesAlunos.id));
    const submissionByActivityId = new Map<number, (typeof submissions)[number]>();
    for (const submission of submissions) {
      const selected = submissionByActivityId.get(submission.atividadeId);
      if (!selected || (selected.statusCorrecao !== 'CONCLUIDO' && submission.statusCorrecao === 'CONCLUIDO')) {
        submissionByActivityId.set(submission.atividadeId, submission);
      }
    }

    return rows.map(({ questoes: questions, ...activity }) => ({
      ...activity,
      questoes: questions.map(({ respostaCorreta: _answer, ...question }) => question),
      ...(role === 'ALUNO' ? { minhaSubmissao: submissionByActivityId.get(activity.id) ?? null } : {}),
    }));
  },

  async findById(id: number) {
    const activity = await db.query.atividades.findFirst({
      where: eq(atividades.id, id),
      with: { disciplina: true, questoes: true },
    });
    if (!activity) return null;
    const { questoes: questions, ...rest } = activity;
    return {
      ...rest,
      questoes: questions.map(({ respostaCorreta: _answer, ...question }) => question),
    };
  },

  async findDisciplineId(id: number) {
    const [row] = await db.select({ disciplinaId: atividades.disciplinaId })
      .from(atividades)
      .where(eq(atividades.id, id))
      .limit(1);
    return row?.disciplinaId ?? null;
  },

  async findDiscipline(id: number) {
    const [row] = await db.select({ disciplina: disciplinas })
      .from(atividades)
      .innerJoin(disciplinas, eq(atividades.disciplinaId, disciplinas.id))
      .where(eq(atividades.id, id))
      .limit(1);
    return row?.disciplina ?? null;
  },
};