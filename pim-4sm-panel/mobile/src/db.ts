import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

import type { UserRole } from './types';

const databaseName = 'pim-demo.db';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type LocalSession = { userId: number; role: UserRole; username: string };

export type HomeData = {
  title: string;
  subtitle: string;
  cards: Array<{ label: string; value: number }>;
};

async function hashPassword(password: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(databaseName).then(async (database) => {
      await database.execAsync(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('ADMIN', 'PROFESSOR', 'ALUNO'))
        );
        CREATE TABLE IF NOT EXISTS disciplina (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          carga_hora INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS turma (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS professor (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          disciplina_id INTEGER NOT NULL REFERENCES disciplina(id),
          usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id)
        );
        CREATE TABLE IF NOT EXISTS aluno (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          matriculado INTEGER NOT NULL DEFAULT 1,
          turma_id INTEGER NOT NULL REFERENCES turma(id),
          usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id)
        );
        CREATE TABLE IF NOT EXISTS aluno_disciplina (
          aluno_id INTEGER NOT NULL REFERENCES aluno(id) ON DELETE CASCADE,
          disciplina_id INTEGER NOT NULL REFERENCES disciplina(id) ON DELETE CASCADE,
          UNIQUE (aluno_id, disciplina_id)
        );
        CREATE TABLE IF NOT EXISTS atividades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          titulo TEXT NOT NULL,
          disciplina_id INTEGER NOT NULL REFERENCES disciplina(id) ON DELETE CASCADE
        );
      `);

      const user = await database.getFirstAsync<{ id: number }>('SELECT id FROM usuarios LIMIT 1');
      if (!user) await seedDatabase(database);
      return database;
    });
  }
  return databasePromise;
}

async function seedDatabase(database: SQLite.SQLiteDatabase) {
  const adminPassword = await hashPassword('Admin123!');
  const professorPassword = await hashPassword('Professor123!');
  const studentPassword = await hashPassword('Aluno123!');

  await database.withTransactionAsync(async () => {
    const math = await database.runAsync('INSERT INTO disciplina (nome, carga_hora) VALUES (?, ?)', 'Matemática', 80);
    const history = await database.runAsync('INSERT INTO disciplina (nome, carga_hora) VALUES (?, ?)', 'História', 60);
    const programming = await database.runAsync('INSERT INTO disciplina (nome, carga_hora) VALUES (?, ?)', 'Programação', 120);
    const classA = await database.runAsync('INSERT INTO turma (nome) VALUES (?)', 'A');
    const classB = await database.runAsync('INSERT INTO turma (nome) VALUES (?)', 'B');

    await database.runAsync('INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)', 'admin', adminPassword, 'ADMIN');

    const professorAccounts = [
      ['prof.ana.silva', 'Prof. Ana Silva', math.lastInsertRowId],
      ['prof.carlos.rocha', 'Prof. Carlos Rocha', history.lastInsertRowId],
      ['prof.bruna.costa', 'Prof. Bruna Costa', programming.lastInsertRowId],
    ] as const;
    for (const [username, name, disciplineId] of professorAccounts) {
      const account = await database.runAsync(
        'INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)',
        username, professorPassword, 'PROFESSOR',
      );
      await database.runAsync(
        'INSERT INTO professor (nome, disciplina_id, usuario_id) VALUES (?, ?, ?)',
        name, disciplineId, account.lastInsertRowId,
      );
    }

    const studentAccounts = [
      ['aluno.joao', 'João Oliveira', classA.lastInsertRowId],
      ['aluna.maria', 'Maria Santos', classB.lastInsertRowId],
    ] as const;
    for (const [username, name, classId] of studentAccounts) {
      const account = await database.runAsync(
        'INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)',
        username, studentPassword, 'ALUNO',
      );
      const student = await database.runAsync(
        'INSERT INTO aluno (nome, matriculado, turma_id, usuario_id) VALUES (?, ?, ?, ?)',
        name, 1, classId, account.lastInsertRowId,
      );
      await database.runAsync('INSERT INTO aluno_disciplina (aluno_id, disciplina_id) VALUES (?, ?)', student.lastInsertRowId, math.lastInsertRowId);
      await database.runAsync('INSERT INTO aluno_disciplina (aluno_id, disciplina_id) VALUES (?, ?)', student.lastInsertRowId, programming.lastInsertRowId);
    }

    await database.runAsync('INSERT INTO atividades (titulo, disciplina_id) VALUES (?, ?)', 'Revisão de funções', programming.lastInsertRowId);
    await database.runAsync('INSERT INTO atividades (titulo, disciplina_id) VALUES (?, ?)', 'Introdução à álgebra', math.lastInsertRowId);
  });
}

export async function authenticate(username: string, password: string): Promise<LocalSession> {
  const database = await getDatabase();
  const passwordHash = await hashPassword(password);
  const user = await database.getFirstAsync<LocalSession>(
    'SELECT id AS userId, username, role FROM usuarios WHERE username = ? AND password_hash = ?',
    username, passwordHash,
  );
  if (!user) throw new Error('Usuário ou senha inválidos.');
  return user;
}

export async function getHomeData(session: LocalSession): Promise<HomeData> {
  const database = await getDatabase();
  if (session.role === 'ADMIN') {
    const [students, professors, classes, disciplines] = await Promise.all([
      database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM aluno'),
      database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM professor'),
      database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM turma'),
      database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM disciplina'),
    ]);
    return {
      title: 'Dashboard acadêmico',
      subtitle: 'Dados locais de demonstração',
      cards: [
        { label: 'Alunos', value: students?.count ?? 0 },
        { label: 'Professores', value: professors?.count ?? 0 },
        { label: 'Turmas', value: classes?.count ?? 0 },
        { label: 'Disciplinas', value: disciplines?.count ?? 0 },
      ],
    };
  }

  if (session.role === 'PROFESSOR') {
    const profile = await database.getFirstAsync<{ nome: string; disciplina: string }>(
      'SELECT professor.nome, disciplina.nome AS disciplina FROM professor JOIN disciplina ON disciplina.id = professor.disciplina_id WHERE professor.usuario_id = ?',
      session.userId,
    );
    const students = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM aluno JOIN aluno_disciplina ON aluno.id = aluno_disciplina.aluno_id JOIN professor ON professor.disciplina_id = aluno_disciplina.disciplina_id WHERE professor.usuario_id = ?',
      session.userId,
    );
    return {
      title: 'Área do professor',
      subtitle: profile?.disciplina ?? profile?.nome ?? 'Dados locais de demonstração',
      cards: [{ label: 'Alunos acompanhados', value: students?.count ?? 0 }],
    };
  }

  const profile = await database.getFirstAsync<{ nome: string; count: number }>(
    'SELECT aluno.nome, COUNT(aluno_disciplina.disciplina_id) AS count FROM aluno LEFT JOIN aluno_disciplina ON aluno.id = aluno_disciplina.aluno_id WHERE aluno.usuario_id = ? GROUP BY aluno.id',
    session.userId,
  );
  return {
    title: 'Meu desempenho',
    subtitle: profile?.nome ?? 'Dados locais de demonstração',
    cards: [{ label: 'Minhas disciplinas', value: profile?.count ?? 0 }],
  };
}

export async function initializeDatabase() {
  await getDatabase();
}
