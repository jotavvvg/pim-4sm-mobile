import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from './db/index.js';
import { disciplinas, professores, turmas, alunos, atividades } from './db/schema.js';
import { disciplinasService } from './services/disciplinas.js';
import { turmasService } from './services/turmas.js';
import { professoresService } from './services/professores.js';
import { alunosService } from './services/alunos.js';
import { searchService } from './services/search.js';
import { metricsService } from './services/metrics.js';
import { accountsService } from './services/accounts.js';
import { atividadesService } from './services/atividades.js';
import { avaliacoesService } from './services/avaliacoes.js';
import {
  createDisciplinaSchema,
  createTurmaSchema,
  createProfessorSchema,
  createAlunoSchema,
  updateDisciplinaSchema,
  updateTurmaSchema,
  updateProfessorSchema,
  updateAlunoSchema,
  loginSchema,
  createAdminSchema,
  updateAdminSchema,
  createAtividadeSchema,
  submitAtividadeSchema,
  gradeAnswerSchema,
} from './schemas/index.js';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

const jwtSecret = process.env.JWT_SECRET ?? randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production.');
}
if (!process.env.JWT_SECRET) app.log.warn('JWT_SECRET is unset; using an ephemeral development secret.');

await app.register(jwt, {
  secret: jwtSecret,
  sign: { expiresIn: '8h' },
});

app.addHook('preHandler', async (request, reply) => {
  const path = request.url.split('?')[0];
  if (path === '/health' || path === '/api/auth/login' || path === '/api/auth/bootstrap') return;

  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ message: 'Authentication required.' });
  }

  if (request.user.role === 'ADMIN') return;

  const isProfessorPath = request.user.role === 'PROFESSOR' && (
    (request.method === 'GET' && (path === '/api/alunos' || /^\/api\/alunos\/\d+$/.test(path) ||
      path === '/api/professores/me' || path === '/api/professores/me/alunos' ||
      path === '/api/atividades' || path === '/api/avaliacoes/pendentes' || path === '/api/metrics/grades' ||
      /^\/api\/disciplinas\/\d+$/.test(path))) ||
    (request.method === 'PUT' && /^\/api\/alunos\/\d+$/.test(path)) ||
    (request.method === 'POST' && (path === '/api/atividades' || /^\/api\/avaliacoes\/questoes\/\d+\/corrigir$/.test(path)))
  );
  const isAlunoPath = request.user.role === 'ALUNO' && (
    (request.method === 'GET' && (
      path === '/api/alunos/me' || path === '/api/alunos/me/classes' || path === '/api/atividades' || path === '/api/metrics/grades'
    )) ||
    (request.method === 'POST' && /^\/api\/atividades\/\d+\/submeter$/.test(path))
  );

  if (!isProfessorPath && !isAlunoPath) {
    return reply.code(403).send({ message: 'Insufficient role permissions.' });
  }
});

app.get('/health', async () => ({ status: 'ok' }));

app.post('/api/auth/login', { schema: { body: loginSchema } }, async (request, reply) => {
  const { username, password } = request.body as z.infer<typeof loginSchema>;
  const account = await accountsService.login(username, password);
  if (!account) return reply.code(401).send({ message: 'Invalid username or password.' });

  const token = app.jwt.sign({ userId: account.id, role: account.role });
  return { token, role: account.role };
});

app.post('/api/auth/bootstrap', { schema: { body: createAdminSchema } }, async (request, reply) => {
  if ((await accountsService.listAdmins()).length > 0) {
    return reply.code(409).send({ message: 'Initial admin account has already been created.' });
  }

  const payload = request.body as z.infer<typeof createAdminSchema>;
  const admin = await accountsService.createAdmin(payload);
  return reply.code(201).send(admin);
});

app.post('/api/admins', { schema: { body: createAdminSchema } }, async (request, reply) => {
  const payload = request.body as z.infer<typeof createAdminSchema>;
  return reply.code(201).send(await accountsService.createAdmin(payload));
});

app.get('/api/admins', async () => accountsService.listAdmins());

app.put('/api/admins/:id', { schema: { body: updateAdminSchema } }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const admin = await accountsService.updateAdmin(Number(id), request.body as z.infer<typeof updateAdminSchema>);
  if (!admin) return reply.code(404).send({ message: 'Admin not found.' });
  return admin;
});

app.delete('/api/admins/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const admins = await accountsService.listAdmins();
  if (admins.length <= 1) return reply.code(409).send({ message: 'The last admin account cannot be deleted.' });
  const removed = await accountsService.removeAdmin(Number(id));
  if (!removed) return reply.code(404).send({ message: 'Admin not found.' });
  return reply.code(204).send();
});

app.post('/api/disciplinas', {
  schema: {
    body: createDisciplinaSchema,
  },
}, async (request, reply) => {
  const payload = request.body as z.infer<typeof createDisciplinaSchema>;
  const item = await disciplinasService.create(payload);
  return reply.code(201).send(item);
});

app.get('/api/disciplinas', async () => disciplinasService.list());

app.get('/api/disciplinas/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  if (request.user.role === 'PROFESSOR') {
    const professor = await professoresService.findByUserId(request.user.userId);
    if (!professor || professor.disciplinaId !== Number(id)) {
      return reply.code(404).send({ message: 'Disciplina not found' });
    }
  }
  const item = await disciplinasService.findById(Number(id));
  if (!item) return reply.code(404).send({ message: 'Disciplina not found' });
  return item;
});

app.put('/api/disciplinas/:id', {
  schema: { body: updateDisciplinaSchema },
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const item = await disciplinasService.update(Number(id), request.body as z.infer<typeof updateDisciplinaSchema>);
  if (!item) return reply.code(404).send({ message: 'Disciplina not found' });
  return item;
});

app.delete('/api/disciplinas/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const removed = await disciplinasService.remove(Number(id));
  if (!removed) return reply.code(404).send({ message: 'Disciplina not found' });
  return reply.code(204).send();
});

app.post('/api/turmas', {
  schema: { body: createTurmaSchema },
}, async (request, reply) => {
  const payload = request.body as z.infer<typeof createTurmaSchema>;
  const item = await turmasService.create(payload);
  return reply.code(201).send(item);
});

app.get('/api/turmas', async () => turmasService.list());

app.get('/api/turmas/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const item = await turmasService.findById(Number(id));
  if (!item) return reply.code(404).send({ message: 'Turma not found' });
  return item;
});

app.put('/api/turmas/:id', {
  schema: { body: updateTurmaSchema },
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const item = await turmasService.update(Number(id), request.body as z.infer<typeof updateTurmaSchema>);
  if (!item) return reply.code(404).send({ message: 'Turma not found' });
  return item;
});

app.delete('/api/turmas/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const removed = await turmasService.remove(Number(id));
  if (!removed) return reply.code(404).send({ message: 'Turma not found' });
  return reply.code(204).send();
});

app.post('/api/professores', {
  schema: { body: createProfessorSchema },
}, async (request, reply) => {
  const payload = request.body as z.infer<typeof createProfessorSchema>;
  const item = await accountsService.createProfessor({
    nome: payload.nome,
    disciplinaId: payload.disciplina_id,
    username: payload.username,
    password: payload.password,
  });
  return reply.code(201).send(item);
});

app.get('/api/professores', async () => professoresService.list());

app.get('/api/professores/me', async (request, reply) => {
  if (request.user.role !== 'PROFESSOR') return reply.code(403).send({ message: 'Professor role required.' });
  const professor = await professoresService.findByUserId(request.user.userId);
  if (!professor) return reply.code(404).send({ message: 'Professor profile not found.' });
  return professor;
});

app.get('/api/professores/me/alunos', async (request, reply) => {
  if (request.user.role !== 'PROFESSOR') return reply.code(403).send({ message: 'Professor role required.' });
  const professor = await professoresService.findByUserId(request.user.userId);
  if (!professor) return reply.code(404).send({ message: 'Professor profile not found.' });
  return alunosService.listByDisciplineId(professor.disciplinaId);
});

app.get('/api/professores/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const item = await professoresService.findById(Number(id));
  if (!item) return reply.code(404).send({ message: 'Professor not found' });
  return item;
});

app.put('/api/professores/:id', {
  schema: { body: updateProfessorSchema },
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const payload = request.body as z.infer<typeof updateProfessorSchema>;
  const currentProfessor = await professoresService.findById(Number(id));
  if (!currentProfessor) return reply.code(404).send({ message: 'Professor not found' });
  await accountsService.updateCredentials(currentProfessor.usuarioId, payload);
  const item = await professoresService.update(Number(id), {
    ...(payload.nome ? { nome: payload.nome } : {}),
    ...(payload.disciplina_id ? { disciplinaId: payload.disciplina_id } : {}),
  });
  if (!item) return reply.code(404).send({ message: 'Professor not found' });
  return item;
});

app.delete('/api/professores/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const removed = await professoresService.remove(Number(id));
  if (!removed) return reply.code(404).send({ message: 'Professor not found' });
  return reply.code(204).send();
});

app.post('/api/alunos', {
  schema: { body: createAlunoSchema },
}, async (request, reply) => {
  const payload = request.body as z.infer<typeof createAlunoSchema>;
  const disciplinaIds = payload.disciplina_ids ?? (payload.disciplina_id ? [payload.disciplina_id] : []);

  const item = await accountsService.createAluno({
    nome: payload.nome,
    matriculado: payload.matriculado,
    turmaId: payload.turma_id,
    disciplinaIds,
    username: payload.username,
    password: payload.password,
  });
  return reply.code(201).send(item);
});

app.get('/api/alunos/me', async (request, reply) => {
  if (request.user.role !== 'ALUNO') return reply.code(403).send({ message: 'Aluno role required.' });
  const aluno = await alunosService.findByUserId(request.user.userId);
  if (!aluno) return reply.code(404).send({ message: 'Aluno profile not found.' });
  return aluno;
});

app.get('/api/alunos/me/classes', async (request, reply) => {
  if (request.user.role !== 'ALUNO') return reply.code(403).send({ message: 'Aluno role required.' });
  const aluno = await alunosService.findByUserId(request.user.userId);
  if (!aluno) return reply.code(404).send({ message: 'Aluno profile not found.' });
  return { turma: aluno.turma, disciplinas: aluno.disciplinas };
});

app.get('/api/alunos', async (request) => {
  if (request.user.role === 'ADMIN') return alunosService.list();
  const professor = await professoresService.findByUserId(request.user.userId);
  return professor ? alunosService.listByDisciplineId(professor.disciplinaId) : [];
});

app.get('/api/alunos/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  let disciplinaId: number | undefined;
  if (request.user.role === 'PROFESSOR') {
    const professor = await professoresService.findByUserId(request.user.userId);
    const linked = professor && await alunosService.isLinkedToDiscipline(Number(id), professor.disciplinaId);
    if (!linked) return reply.code(404).send({ message: 'Aluno not found' });
    disciplinaId = professor.disciplinaId;
  }
  const item = await alunosService.findById(Number(id), disciplinaId);
  if (!item) return reply.code(404).send({ message: 'Aluno not found' });
  return item;
});

app.get('/api/search', async (request, reply) => {
  const query = (request.query as { q?: string })?.q ?? '';
  const results = await searchService.search(query);
  return reply.send(results);
});

app.get('/api/metrics', async () => metricsService.getMetrics());

app.post('/api/atividades', { schema: { body: createAtividadeSchema } }, async (request, reply) => {
  if (request.user.role !== 'PROFESSOR') {
    return reply.code(403).send({ message: 'Professor role required.' });
  }
  const professor = await professoresService.findByUserId(request.user.userId);
  if (!professor) return reply.code(404).send({ message: 'Professor profile not found.' });

  const payload = request.body as z.infer<typeof createAtividadeSchema>;
  if (payload.disciplina_id !== professor.disciplinaId) {
    return reply.code(403).send({ message: 'Activities can only be created for the professor assigned discipline.' });
  }

  const id = await atividadesService.create({
    titulo: payload.titulo,
    disciplinaId: payload.disciplina_id,
    questoes: payload.questoes,
  });
  return reply.code(201).send(await atividadesService.findById(id));
});

app.get('/api/atividades', async (request, reply) => {
  if (request.user.role === 'ADMIN') {
    const allActivities = await db.query.atividades.findMany({
      with: { disciplina: true, questoes: true },
    });
    return allActivities.map(({ questoes: questions, ...activity }) => ({
      ...activity,
      questoes: questions.map(({ respostaCorreta: _answer, ...question }) => question),
    }));
  }
  if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ALUNO') {
    return reply.code(403).send({ message: 'Insufficient role permissions.' });
  }
  return atividadesService.listForUser(request.user.userId, request.user.role);
});

app.post('/api/atividades/:id/submeter', { schema: { body: submitAtividadeSchema } }, async (request, reply) => {
  if (request.user.role !== 'ALUNO') return reply.code(403).send({ message: 'Aluno role required.' });
  const { id } = request.params as { id: string };
  const answers = request.body as z.infer<typeof submitAtividadeSchema>;
  const result = await avaliacoesService.submit(request.user.userId, Number(id), answers);
  if (!result) return reply.code(500).send({ message: 'Submission was saved but could not be loaded.' });
  if ('error' in result) {
    if (result.error === 'STUDENT_NOT_FOUND') return reply.code(404).send({ message: 'Student profile not found.' });
    if (result.error === 'ACTIVITY_NOT_FOUND') return reply.code(404).send({ message: 'Activity not found.' });
    if (result.error === 'ALREADY_SUBMITTED') return reply.code(409).send({ message: 'This activity has already been submitted by this student.' });
    return reply.code(400).send({ message: 'Answers must include each activity question exactly once.' });
  }
  return reply.code(201).send(result);
});

app.get('/api/avaliacoes/pendentes', async (request, reply) => {
  if (request.user.role !== 'PROFESSOR') return reply.code(403).send({ message: 'Professor role required.' });
  const professor = await professoresService.findByUserId(request.user.userId);
  if (!professor) return reply.code(404).send({ message: 'Professor profile not found.' });
  return avaliacoesService.listPendingForDiscipline(professor.disciplinaId);
});

app.post('/api/avaliacoes/questoes/:id/corrigir', { schema: { body: gradeAnswerSchema } }, async (request, reply) => {
  if (request.user.role !== 'PROFESSOR') return reply.code(403).send({ message: 'Professor role required.' });
  const professor = await professoresService.findByUserId(request.user.userId);
  if (!professor) return reply.code(404).send({ message: 'Professor profile not found.' });
  const { id } = request.params as { id: string };
  const payload = request.body as z.infer<typeof gradeAnswerSchema>;
  const result = await avaliacoesService.gradeAnswer(Number(id), professor.disciplinaId, payload.correta);
  if (result && 'error' in result) return reply.code(404).send({ message: 'Pending answer not found for this discipline.' });
  if (!result) return reply.code(404).send({ message: 'Pending answer not found for this discipline.' });
  return result;
});

app.get('/api/metrics/grades', async (request, reply) => {
  if (request.user.role === 'PROFESSOR') {
    const professor = await professoresService.findByUserId(request.user.userId);
    if (!professor) return reply.code(404).send({ message: 'Professor profile not found.' });
    return metricsService.getGradeMetricsForProfessor(professor.disciplinaId);
  }
  if (request.user.role === 'ALUNO') {
    return metricsService.getGradeMetricsForStudent(request.user.userId);
  }
  return reply.code(403).send({ message: 'Professor or aluno role required.' });
});

app.put('/api/alunos/:id', {
  schema: { body: updateAlunoSchema },
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const payload = request.body as z.infer<typeof updateAlunoSchema>;
  const current = await alunosService.findById(Number(id));
  if (!current) return reply.code(404).send({ message: 'Aluno not found' });
  if (request.user.role === 'PROFESSOR') {
    const professor = await professoresService.findByUserId(request.user.userId);
    const linked = professor && await alunosService.isLinkedToDiscipline(Number(id), professor.disciplinaId);
    if (!linked) return reply.code(404).send({ message: 'Aluno not found' });
    if (payload.username !== undefined || payload.password !== undefined || payload.disciplina_id !== undefined || payload.disciplina_ids !== undefined) {
      return reply.code(403).send({ message: 'Professors may only update student profile fields for students in their discipline.' });
    }
  } else {
    const usuarioId = await alunosService.findAccountUserId(Number(id));
    if (usuarioId !== null) await accountsService.updateCredentials(usuarioId, payload);
  }
  const disciplinaIds = payload.disciplina_ids ?? (payload.disciplina_id ? [payload.disciplina_id] : undefined);

  const item = await alunosService.update(Number(id), {
    ...(payload.nome ? { nome: payload.nome } : {}),
    ...(payload.matriculado !== undefined ? { matriculado: payload.matriculado } : {}),
    ...(payload.turma_id ? { turmaId: payload.turma_id } : {}),
    ...(disciplinaIds ? { disciplinaIds } : {}),
  });
  if (!item) return reply.code(404).send({ message: 'Aluno not found' });
  return item;
});

app.delete('/api/alunos/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const removed = await alunosService.remove(Number(id));
  if (!removed) return reply.code(404).send({ message: 'Aluno not found' });
  return reply.code(204).send();
});

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3000);
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
