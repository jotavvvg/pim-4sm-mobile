import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import type { UserRole } from './types';

export type LocalSession = { userId: number; role: UserRole; username: string };
export type Discipline = { id: number; nome: string; carga_hora: number };
export type SchoolClass = { id: number; nome: string };
export type Professor = { id: number; nome: string; disciplina_id: number; usuario_id: number; disciplina?: string };
export type Student = { id: number; nome: string; matriculado: number; turma_id: number; usuario_id: number; turma?: string };
export type Activity = { id: number; titulo: string; descricao: string; disciplina_id: number; disciplina?: string; due_date?: string; questoes?: Question[] };
export type Question = { id: number; atividade_id: number; tipo: 'MULTIPLACADA' | 'DISSERTATIVA'; enunciado: string; opcoes_json?: string; resposta_correta?: string };
export type Submission = { id: number; atividade_id: number; aluno_id: number; resposta: string; nota?: number; feedback?: string; aluno?: string; atividade?: string };
export type HomeData = { title: string; subtitle: string; cards: Array<{ label: string; value: number }> };

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const hash = (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);

async function database() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('pim-local-v3.db').then(async (db) => {
    await db.execAsync(`PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS usuarios(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS disciplinas(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,carga_hora INTEGER NOT NULL DEFAULT 40,remote_id INTEGER UNIQUE);
      CREATE TABLE IF NOT EXISTS turmas(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT UNIQUE NOT NULL);
      CREATE TABLE IF NOT EXISTS professores(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,disciplina_id INTEGER REFERENCES disciplinas(id),usuario_id INTEGER UNIQUE REFERENCES usuarios(id));
      CREATE TABLE IF NOT EXISTS alunos(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,matriculado INTEGER DEFAULT 1,turma_id INTEGER REFERENCES turmas(id),usuario_id INTEGER UNIQUE REFERENCES usuarios(id));
      CREATE TABLE IF NOT EXISTS aluno_disciplina(aluno_id INTEGER REFERENCES alunos(id) ON DELETE CASCADE,disciplina_id INTEGER REFERENCES disciplinas(id) ON DELETE CASCADE,PRIMARY KEY(aluno_id,disciplina_id));
      CREATE TABLE IF NOT EXISTS atividades(id INTEGER PRIMARY KEY AUTOINCREMENT,titulo TEXT NOT NULL,descricao TEXT DEFAULT '',disciplina_id INTEGER REFERENCES disciplinas(id) ON DELETE CASCADE,due_date TEXT);
      CREATE TABLE IF NOT EXISTS questoes(id INTEGER PRIMARY KEY AUTOINCREMENT,atividade_id INTEGER REFERENCES atividades(id) ON DELETE CASCADE,tipo TEXT NOT NULL DEFAULT 'DISSERTATIVA',enunciado TEXT NOT NULL,opcoes_json TEXT,resposta_correta TEXT);
      CREATE TABLE IF NOT EXISTS entregas(id INTEGER PRIMARY KEY AUTOINCREMENT,atividade_id INTEGER REFERENCES atividades(id) ON DELETE CASCADE,aluno_id INTEGER REFERENCES alunos(id) ON DELETE CASCADE,resposta TEXT DEFAULT '',nota REAL,feedback TEXT,UNIQUE(atividade_id,aluno_id));
      CREATE TABLE IF NOT EXISTS respostas(id INTEGER PRIMARY KEY AUTOINCREMENT,entrega_id INTEGER REFERENCES entregas(id) ON DELETE CASCADE,questao_id INTEGER REFERENCES questoes(id),resposta TEXT NOT NULL);`);
    const questionColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(questoes)');
    if (!questionColumns.some(column => column.name === 'tipo')) await db.execAsync("ALTER TABLE questoes ADD COLUMN tipo TEXT NOT NULL DEFAULT 'DISSERTATIVA'");
    if (!questionColumns.some(column => column.name === 'opcoes_json')) await db.execAsync('ALTER TABLE questoes ADD COLUMN opcoes_json TEXT');
    const disciplineColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(disciplinas)');
    if (!disciplineColumns.some(column => column.name === 'remote_id')) {
      await db.execAsync('ALTER TABLE disciplinas ADD COLUMN remote_id INTEGER');
    }
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_disciplinas_remote_id ON disciplinas(remote_id)');
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) n FROM usuarios');
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (version?.user_version !== 5) {
      if (row?.n) {
        await db.execAsync('DELETE FROM respostas; DELETE FROM entregas; DELETE FROM questoes; DELETE FROM atividades; DELETE FROM aluno_disciplina; DELETE FROM alunos; DELETE FROM professores; DELETE FROM usuarios; DELETE FROM disciplinas; DELETE FROM turmas;');
      }
      await seed(db);
      await db.execAsync('PRAGMA user_version = 5');
    }
    return db;
  });
  return dbPromise;
}
async function seed(db: SQLite.SQLiteDatabase) {
  const [ap, pp, sp] = await Promise.all([hash('Admin123!'), hash('Professor123!'), hash('Aluno123!')]);
  await db.withTransactionAsync(async () => {
    const d1 = await db.runAsync('INSERT INTO disciplinas(nome,carga_hora) VALUES(?,?)', 'Matemática', 80);
    const d2 = await db.runAsync('INSERT INTO disciplinas(nome,carga_hora) VALUES(?,?)', 'História', 60);
    const d3 = await db.runAsync('INSERT INTO disciplinas(nome,carga_hora) VALUES(?,?)', 'Programação', 120);
    const c1 = await db.runAsync('INSERT INTO turmas(nome) VALUES(?)', 'A');
    const c2 = await db.runAsync('INSERT INTO turmas(nome) VALUES(?)', 'B');
    await db.runAsync('INSERT INTO usuarios(username,password_hash,role) VALUES(?,?,?)', 'admin', ap, 'ADMIN');
    const professors = [
      ['prof.ana.silva', 'Prof. Ana Silva', d1.lastInsertRowId],
      ['prof.carlos.rocha', 'Prof. Carlos Rocha', d2.lastInsertRowId],
      ['prof.bruna.costa', 'Prof. Bruna Costa', d3.lastInsertRowId],
    ] as const;
    for (const [username, name, disciplineId] of professors) {
      const pu = await db.runAsync('INSERT INTO usuarios(username,password_hash,role) VALUES(?,?,?)', username, pp, 'PROFESSOR');
      await db.runAsync('INSERT INTO professores(nome,disciplina_id,usuario_id) VALUES(?,?,?)', name, disciplineId, pu.lastInsertRowId);
    }
    const studentRows = [
      { username: 'maria.souza', name: 'Maria Souza', enrolled: 1, classId: c1.lastInsertRowId, subjects: [d1.lastInsertRowId, d3.lastInsertRowId] },
      { username: 'joao.pereira', name: 'João Pereira', enrolled: 1, classId: c1.lastInsertRowId, subjects: [d1.lastInsertRowId, d2.lastInsertRowId] },
      { username: 'lucia.almeida', name: 'Lúcia Almeida', enrolled: 0, classId: c2.lastInsertRowId, subjects: [d2.lastInsertRowId] },
      { username: 'pedro.martins', name: 'Pedro Martins', enrolled: 1, classId: c2.lastInsertRowId, subjects: [d3.lastInsertRowId] },
      { username: 'fernanda.costa', name: 'Fernanda Costa', enrolled: 1, classId: c1.lastInsertRowId, subjects: [d1.lastInsertRowId, d3.lastInsertRowId] },
    ];
    const students: Array<{ id: number; subjectIds: number[] }> = [];
    for (const student of studentRows) {
      const user = await db.runAsync('INSERT INTO usuarios(username,password_hash,role) VALUES(?,?,?)', student.username, sp, 'ALUNO');
      const inserted = await db.runAsync('INSERT INTO alunos(nome,matriculado,turma_id,usuario_id) VALUES(?,?,?,?)', student.name, student.enrolled, student.classId, user.lastInsertRowId);
      for (const subjectId of student.subjects) await db.runAsync('INSERT INTO aluno_disciplina VALUES(?,?)', inserted.lastInsertRowId, subjectId);
      students.push({ id: inserted.lastInsertRowId, subjectIds: student.subjects });
    }
    const activity = await db.runAsync('INSERT INTO atividades(titulo,descricao,disciplina_id) VALUES(?,?,?)', 'Revisão de Matemática', '', d1.lastInsertRowId);
    const firstQuestion = await db.runAsync('INSERT INTO questoes(atividade_id,tipo,enunciado,opcoes_json,resposta_correta) VALUES(?,?,?,?,?)', activity.lastInsertRowId, 'MULTIPLACADA', 'Quanto é 7 × 8?', JSON.stringify(['54', '56', '64', '48']), '56');
    const secondQuestion = await db.runAsync('INSERT INTO questoes(atividade_id,tipo,enunciado) VALUES(?,?,?)', activity.lastInsertRowId, 'DISSERTATIVA', 'Explique em uma frase como calcular a área de um retângulo.');
    const submission = await db.runAsync('INSERT INTO entregas(atividade_id,aluno_id,resposta,nota,feedback) VALUES(?,?,?,?,?)', activity.lastInsertRowId, students[1].id, '', null, null);
    await db.runAsync('INSERT INTO respostas(entrega_id,questao_id,resposta) VALUES(?,?,?)', submission.lastInsertRowId, firstQuestion.lastInsertRowId, '56');
    await db.runAsync('INSERT INTO respostas(entrega_id,questao_id,resposta) VALUES(?,?,?)', submission.lastInsertRowId, secondQuestion.lastInsertRowId, 'Multiplico o comprimento pela largura.');
    const completedStudents = [
      { studentId: students[0].id, grade: 8.5, answer: 'A área é o comprimento multiplicado pela largura.' },
      { studentId: students[4].id, grade: 9, answer: 'Multiplico a base pela altura.' },
    ];
    for (const completed of completedStudents) {
      const delivery = await db.runAsync('INSERT INTO entregas(atividade_id,aluno_id,resposta,nota,feedback) VALUES(?,?,?,?,?)', activity.lastInsertRowId, completed.studentId, '', completed.grade, 'Atividade corrigida.');
      await db.runAsync('INSERT INTO respostas(entrega_id,questao_id,resposta) VALUES(?,?,?)', delivery.lastInsertRowId, firstQuestion.lastInsertRowId, '56');
      await db.runAsync('INSERT INTO respostas(entrega_id,questao_id,resposta) VALUES(?,?,?)', delivery.lastInsertRowId, secondQuestion.lastInsertRowId, completed.answer);
    }
    const programmingActivity = await db.runAsync('INSERT INTO atividades(titulo,descricao,disciplina_id) VALUES(?,?,?)', 'Primeiros passos com algoritmos', '', d3.lastInsertRowId);
    const programmingQuestion = await db.runAsync('INSERT INTO questoes(atividade_id,tipo,enunciado,opcoes_json,resposta_correta) VALUES(?,?,?,?,?)', programmingActivity.lastInsertRowId, 'MULTIPLACADA', 'Qual estrutura repete um bloco de código enquanto uma condição é verdadeira?', JSON.stringify(['if', 'while', 'return', 'import']), 'while');
    for (const completed of [{ studentId: students[3].id, grade: 7.8 }, { studentId: students[0].id, grade: 8.2 }]) {
      const delivery = await db.runAsync('INSERT INTO entregas(atividade_id,aluno_id,resposta,nota,feedback) VALUES(?,?,?,?,?)', programmingActivity.lastInsertRowId, completed.studentId, 'while', completed.grade, 'Atividade corrigida.');
      await db.runAsync('INSERT INTO respostas(entrega_id,questao_id,resposta) VALUES(?,?,?)', delivery.lastInsertRowId, programmingQuestion.lastInsertRowId, 'while');
    }
    const historyActivity = await db.runAsync('INSERT INTO atividades(titulo,descricao,disciplina_id) VALUES(?,?,?)', 'Introdução à História', '', d2.lastInsertRowId);
    const historyQuestion = await db.runAsync('INSERT INTO questoes(atividade_id,tipo,enunciado) VALUES(?,?,?)', historyActivity.lastInsertRowId, 'DISSERTATIVA', 'Descreva um acontecimento histórico estudado em aula.');
    const historyDelivery = await db.runAsync('INSERT INTO entregas(atividade_id,aluno_id,resposta,nota,feedback) VALUES(?,?,?,?,?)', historyActivity.lastInsertRowId, students[1].id, 'A Revolução Industrial transformou a produção.', 7.5, 'Atividade corrigida.');
    await db.runAsync('INSERT INTO respostas(entrega_id,questao_id,resposta) VALUES(?,?,?)', historyDelivery.lastInsertRowId, historyQuestion.lastInsertRowId, 'A Revolução Industrial transformou a produção.');
  });
}
export async function initializeDatabase() { await database(); }
export async function sincronizarDisciplinasLocal(disciplinas: Discipline[]) {
  const db = await database();
  await db.withTransactionAsync(async () => {
    for (const disciplina of disciplinas) {
      const mapped = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM disciplinas WHERE remote_id = ?',
        disciplina.id,
      );
      if (mapped) {
        await db.runAsync(
          'UPDATE disciplinas SET nome = ?, carga_hora = ? WHERE id = ?',
          disciplina.nome,
          disciplina.carga_hora,
          mapped.id,
        );
        continue;
      }

      const local = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM disciplinas
         WHERE remote_id IS NULL AND lower(trim(nome)) = lower(trim(?))
         ORDER BY id
         LIMIT 1`,
        disciplina.nome,
      );
      if (local) {
        await db.runAsync(
          'UPDATE disciplinas SET nome = ?, carga_hora = ?, remote_id = ? WHERE id = ?',
          disciplina.nome,
          disciplina.carga_hora,
          disciplina.id,
          local.id,
        );
      } else {
        await db.runAsync(
          'INSERT INTO disciplinas (nome, carga_hora, remote_id) VALUES (?, ?, ?)',
          disciplina.nome,
          disciplina.carga_hora,
          disciplina.id,
        );
      }
    }
  });
}
export async function authenticate(username: string, password: string): Promise<LocalSession> {
  const db = await database(); const row = await db.getFirstAsync<LocalSession>('SELECT id userId,username,role FROM usuarios WHERE username=? AND password_hash=?', username, await hash(password));
  if (!row) throw new Error('Credenciais inválidas'); return row;
}
export async function all<T>(sql: string, ...args: SQLite.SQLiteBindValue[]) { return (await database()).getAllAsync<T>(sql, ...args); }
export async function run(sql: string, ...args: SQLite.SQLiteBindValue[]) { return (await database()).runAsync(sql, ...args); }
export async function profile(session: LocalSession) {
  if (session.role === 'PROFESSOR') return (await all<Professor>('SELECT p.*,d.nome disciplina FROM professores p LEFT JOIN disciplinas d ON d.id=p.disciplina_id WHERE p.usuario_id=?', session.userId))[0];
  if (session.role === 'ALUNO') return (await all<Student>('SELECT a.*,t.nome turma FROM alunos a LEFT JOIN turmas t ON t.id=a.turma_id WHERE a.usuario_id=?', session.userId))[0];
  return undefined;
}
export async function getHomeData(session: LocalSession): Promise<HomeData> {
  const tables = session.role === 'ADMIN' ? ['alunos', 'professores', 'turmas', 'disciplinas'] : ['atividades'];
  const cards = await Promise.all(tables.map(async table => ({ label: table, value: (await all<{ n: number }>(`SELECT COUNT(*) n FROM ${table}`))[0]?.n || 0 })));
  return { title: session.role === 'ADMIN' ? 'Dashboard acadêmico' : 'Área acadêmica', subtitle: 'Dados locais', cards };
}
