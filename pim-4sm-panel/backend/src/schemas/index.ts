import { z } from 'zod';

export const disciplinaSchema = z.object({
  id: z.number().int().positive().optional(),
  nome: z.string().min(1).max(255),
  carga_hora: z.number().int().positive(),
});

export const turmaSchema = z.object({
  id: z.number().int().positive().optional(),
  nome: z.string().min(1).max(1),
});

export const professorSchema = z.object({
  id: z.number().int().positive().optional(),
  nome: z.string().min(1).max(255),
  disciplina_id: z.number().int().positive(),
});

const accountCredentialsSchema = {
  username: z.string().min(3).max(100),
  password: z.string().min(8).max(128),
};

export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(128),
});

export const updateCredentialsSchema = z.object({
  username: z.string().min(3).max(100).optional(),
  password: z.string().min(8).max(128).optional(),
});

export const alunoSchema = z.object({
  id: z.number().int().positive().optional(),
  nome: z.string().min(1).max(255),
  matriculado: z.boolean().default(true),
  turma_id: z.number().int().positive(),
  disciplina_id: z.number().int().positive().optional(),
  disciplina_ids: z.array(z.number().int().positive()).min(1).optional(),
});

export const createDisciplinaSchema = disciplinaSchema.omit({ id: true });
export const createTurmaSchema = turmaSchema.omit({ id: true });
export const createProfessorSchema = z.object({
  nome: professorSchema.shape.nome,
  disciplina_id: professorSchema.shape.disciplina_id,
  ...accountCredentialsSchema,
  role: z.literal('PROFESSOR'),
});
export const updateProfessorSchema = z.object({
  nome: professorSchema.shape.nome.optional(),
  disciplina_id: professorSchema.shape.disciplina_id.optional(),
  ...updateCredentialsSchema.shape,
});
export const createAlunoSchema = z.object({
  nome: alunoSchema.shape.nome,
  matriculado: alunoSchema.shape.matriculado,
  turma_id: alunoSchema.shape.turma_id,
  disciplina_id: alunoSchema.shape.disciplina_id,
  disciplina_ids: alunoSchema.shape.disciplina_ids,
  ...accountCredentialsSchema,
  role: z.literal('ALUNO'),
}).refine((payload) => payload.disciplina_id !== undefined || (payload.disciplina_ids?.length ?? 0) > 0, {
  message: 'A student must include at least one discipline id.',
  path: ['disciplina_ids'],
});
export const updateAlunoSchema = z.object({
  nome: alunoSchema.shape.nome.optional(),
  matriculado: z.boolean().optional(),
  turma_id: alunoSchema.shape.turma_id.optional(),
  disciplina_id: alunoSchema.shape.disciplina_id,
  disciplina_ids: alunoSchema.shape.disciplina_ids,
  ...updateCredentialsSchema.shape,
});
export const createAdminSchema = z.object({
  ...accountCredentialsSchema,
  role: z.literal('ADMIN'),
});
export const updateAdminSchema = updateCredentialsSchema;

export const updateDisciplinaSchema = createDisciplinaSchema.partial();
export const updateTurmaSchema = createTurmaSchema.partial();
export const updateAccountSchema = updateCredentialsSchema;

const activityQuestionSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('MULTIPLACADA'),
    enunciado: z.string().min(1),
    opcoes: z.array(z.string().min(1)).min(2),
    resposta_correta: z.string().min(1),
  }).refine((question) => question.opcoes.includes(question.resposta_correta), {
    message: 'Correct answer must match one of the options.',
    path: ['resposta_correta'],
  }),
  z.object({
    tipo: z.literal('DISSERTATIVA'),
    enunciado: z.string().min(1),
    opcoes: z.null().optional(),
    resposta_correta: z.null().optional(),
  }),
]);

export const createAtividadeSchema = z.object({
  titulo: z.string().trim().min(1).max(255),
  disciplina_id: z.number().int().positive(),
  questoes: z.array(activityQuestionSchema).min(1),
});

export const submitAtividadeSchema = z.array(z.object({
  questao_id: z.number().int().positive(),
  resposta_dada: z.string(),
})).min(1);

export const gradeAnswerSchema = z.object({
  correta: z.boolean(),
});

export const validateAlunoDisciplines = (payload: { disciplina_id?: number; disciplina_ids?: number[] }) => {
  const hasSelectedDiscipline = payload.disciplina_id !== undefined || (payload.disciplina_ids && payload.disciplina_ids.length > 0);
  if (!hasSelectedDiscipline) {
    throw new Error('A student must include at least one discipline id.');
  }
};
