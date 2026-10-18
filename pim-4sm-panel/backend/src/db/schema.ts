import { mysqlEnum, mysqlTable, int, varchar, boolean, uniqueIndex, index, text, json, decimal } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const usuarios = mysqlTable('usuarios', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['ADMIN', 'PROFESSOR', 'ALUNO']).notNull(),
}, (table) => ({
  usernameUnique: uniqueIndex('usuarios_username_unique').on(table.username),
}));

export const disciplinas = mysqlTable('disciplina', {
  id: int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 255 }).notNull(),
  carga_hora: int('carga_hora').notNull(),
});

export const turmas = mysqlTable('turma', {
  id: int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 1 }).notNull(),
});

export const professores = mysqlTable('professor', {
  id: int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 255 }).notNull(),
  disciplinaId: int('disciplina_id').references(() => disciplinas.id).notNull(),
  usuarioId: int('usuario_id').references(() => usuarios.id).notNull(),
}, (table) => ({
  usuarioUnique: uniqueIndex('professor_usuario_unique').on(table.usuarioId),
}));

export const alunos = mysqlTable('aluno', {
  id: int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 255 }).notNull(),
  matriculado: boolean('matriculado').default(true).notNull(),
  turmaId: int('turma_id').references(() => turmas.id).notNull(),
  usuarioId: int('usuario_id').references(() => usuarios.id).notNull(),
}, (table) => ({
  usuarioUnique: uniqueIndex('aluno_usuario_unique').on(table.usuarioId),
}));

export const alunoDisciplinas = mysqlTable(
  'aluno_disciplina',
  {
    alunoId: int('aluno_id')
      .notNull()
      .references(() => alunos.id),
    disciplinaId: int('disciplina_id')
      .notNull()
      .references(() => disciplinas.id),
  },
  (table) => ({
    alunoDisciplinaUnique: uniqueIndex('aluno_disciplina_pair_unique').on(table.alunoId, table.disciplinaId),
  }),
);

export const atividades = mysqlTable('atividades', {
  id: int('id').primaryKey().autoincrement(),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  disciplinaId: int('disciplina_id').references(() => disciplinas.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  disciplinaIndex: index('atividades_disciplina_id_idx').on(table.disciplinaId),
}));

export const questoes = mysqlTable('questoes', {
  id: int('id').primaryKey().autoincrement(),
  atividadeId: int('atividade_id').references(() => atividades.id, { onDelete: 'cascade' }).notNull(),
  tipo: mysqlEnum('tipo', ['MULTIPLACADA', 'DISSERTATIVA']).notNull(),
  enunciado: text('enunciado').notNull(),
  opcoes: json('opcoes').$type<string[] | null>(),
  respostaCorreta: varchar('resposta_correta', { length: 255 }),
}, (table) => ({
  atividadeIndex: index('questoes_atividade_id_idx').on(table.atividadeId),
}));

export const submissoesAlunos = mysqlTable('submissoes_alunos', {
  id: int('id').primaryKey().autoincrement(),
  alunoId: int('aluno_id').references(() => alunos.id, { onDelete: 'cascade' }).notNull(),
  atividadeId: int('atividade_id').references(() => atividades.id, { onDelete: 'cascade' }).notNull(),
  statusCorrecao: mysqlEnum('status_correcao', ['CONCLUIDO', 'PENDENTE']).default('PENDENTE').notNull(),
  notaTotal: decimal('nota_total', { precision: 5, scale: 2 }),
}, (table) => ({
  alunoIndex: index('submissoes_alunos_aluno_id_idx').on(table.alunoId),
  atividadeIndex: index('submissoes_alunos_atividade_id_idx').on(table.atividadeId),
  statusIndex: index('submissoes_alunos_status_correcao_idx').on(table.statusCorrecao),
}));

export const respostasQuestoes = mysqlTable('respostas_questoes', {
  id: int('id').primaryKey().autoincrement(),
  submissaoId: int('submissao_id').references(() => submissoesAlunos.id, { onDelete: 'cascade' }).notNull(),
  questaoId: int('questao_id').references(() => questoes.id, { onDelete: 'cascade' }).notNull(),
  respostaDada: text('resposta_dada').notNull(),
  correta: boolean('correta'),
}, (table) => ({
  submissaoIndex: index('respostas_questoes_submissao_id_idx').on(table.submissaoId),
  questaoIndex: index('respostas_questoes_questao_id_idx').on(table.questaoId),
}));

export const turmasRelations = relations(turmas, ({ many }) => ({
  alunos: many(alunos),
}));

export const usuariosRelations = relations(usuarios, ({ one }) => ({
  aluno: one(alunos),
  professor: one(professores),
}));

export const alunosRelations = relations(alunos, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [alunos.usuarioId],
    references: [usuarios.id],
  }),
  turma: one(turmas, {
    fields: [alunos.turmaId],
    references: [turmas.id],
  }),
  disciplinas: many(alunoDisciplinas),
}));

export const disciplinasRelations = relations(disciplinas, ({ many }) => ({
  alunos: many(alunoDisciplinas),
}));

export const alunoDisciplinasRelations = relations(alunoDisciplinas, ({ one }) => ({
  aluno: one(alunos, {
    fields: [alunoDisciplinas.alunoId],
    references: [alunos.id],
  }),
  disciplina: one(disciplinas, {
    fields: [alunoDisciplinas.disciplinaId],
    references: [disciplinas.id],
  }),
}));

export const professoresRelations = relations(professores, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [professores.usuarioId],
    references: [usuarios.id],
  }),
  disciplina: one(disciplinas, {
    fields: [professores.disciplinaId],
    references: [disciplinas.id],
  }),
}));

export const atividadesRelations = relations(atividades, ({ one, many }) => ({
  disciplina: one(disciplinas, {
    fields: [atividades.disciplinaId],
    references: [disciplinas.id],
  }),
  questoes: many(questoes),
  submissoes: many(submissoesAlunos),
}));

export const questoesRelations = relations(questoes, ({ one, many }) => ({
  atividade: one(atividades, {
    fields: [questoes.atividadeId],
    references: [atividades.id],
  }),
  respostas: many(respostasQuestoes),
}));

export const submissoesAlunosRelations = relations(submissoesAlunos, ({ one, many }) => ({
  aluno: one(alunos, {
    fields: [submissoesAlunos.alunoId],
    references: [alunos.id],
  }),
  atividade: one(atividades, {
    fields: [submissoesAlunos.atividadeId],
    references: [atividades.id],
  }),
  respostas: many(respostasQuestoes),
}));

export const respostasQuestoesRelations = relations(respostasQuestoes, ({ one }) => ({
  submissao: one(submissoesAlunos, {
    fields: [respostasQuestoes.submissaoId],
    references: [submissoesAlunos.id],
  }),
  questao: one(questoes, {
    fields: [respostasQuestoes.questaoId],
    references: [questoes.id],
  }),
}));
