import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
import { hash } from 'bcryptjs';

const runSeed = async () => {
  const connection = await createConnection(
    process.env.DATABASE_URL ?? 'mysql://root@localhost:3306/academico_db',
  );

  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
  await connection.execute('DELETE FROM aluno_disciplina');
  await connection.execute('DELETE FROM aluno');
  await connection.execute('DELETE FROM professor');
  await connection.execute('DELETE FROM usuarios');
  await connection.execute('DELETE FROM disciplina');
  await connection.execute('DELETE FROM turma');
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

  const [turmaResult] = await connection.execute(
    'INSERT INTO turma (nome) VALUES ("A"), ("B")',
  );

  const [disciplinaResult] = await connection.execute(
    'INSERT INTO disciplina (nome, carga_hora) VALUES ("Matemática", 80), ("História", 60), ("Programação", 120)',
  );

  const turmaByName = new Map<string, number>();
  const disciplinaByName = new Map<string, number>();

  const [turmaRows] = await connection.execute('SELECT id, nome FROM turma');
  for (const row of turmaRows as Array<{ id: number; nome: string }>) {
    turmaByName.set(row.nome, row.id);
  }

  const [disciplinasRows] = await connection.execute('SELECT id, nome FROM disciplina');
  for (const row of disciplinasRows as Array<{ id: number; nome: string }>) {
    disciplinaByName.set(row.nome, row.id);
  }

  const insertUser = async (username: string, password: string, role: 'ADMIN' | 'PROFESSOR' | 'ALUNO') => {
    const [result] = await connection.execute(
      'INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)',
      [username, await hash(password, 12), role],
    );
    return Number((result as any).insertId);
  };

  await insertUser('admin', 'Admin123!', 'ADMIN');

  const professorRows = [
    { nome: 'Prof. Ana Silva', disciplinaNome: 'Matemática' },
    { nome: 'Prof. Carlos Rocha', disciplinaNome: 'História' },
    { nome: 'Prof. Bruna Costa', disciplinaNome: 'Programação' },
  ];

  for (const professor of professorRows) {
    const disciplinaId = disciplinaByName.get(professor.disciplinaNome);
    if (!disciplinaId) {
      throw new Error(`Disciplina not found for professor ${professor.nome}: ${professor.disciplinaNome}`);
    }

    const username = professor.nome.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
    const usuarioId = await insertUser(username, 'Professor123!', 'PROFESSOR');
    await connection.execute(
      'INSERT INTO professor (nome, disciplina_id, usuario_id) VALUES (?, ?, ?)',
      [professor.nome, disciplinaId, usuarioId],
    );
  }

  const alunos = [
    { nome: 'Maria Souza', matriculado: true, turmaNome: 'A' },
    { nome: 'João Pereira', matriculado: true, turmaNome: 'A' },
    { nome: 'Lúcia Almeida', matriculado: false, turmaNome: 'B' },
    { nome: 'Pedro Martins', matriculado: true, turmaNome: 'B' },
    { nome: 'Fernanda Costa', matriculado: true, turmaNome: 'A' },
  ];

  const alunoDisciplinaMap: Array<{ alunoNome: string; disciplinaNames: string[] }> = [
    { alunoNome: 'Maria Souza', disciplinaNames: ['Matemática', 'Programação'] },
    { alunoNome: 'João Pereira', disciplinaNames: ['Matemática', 'História'] },
    { alunoNome: 'Lúcia Almeida', disciplinaNames: ['História'] },
    { alunoNome: 'Pedro Martins', disciplinaNames: ['Programação'] },
    { alunoNome: 'Fernanda Costa', disciplinaNames: ['Matemática', 'Programação'] },
  ];

  const insertedAlunoIds = new Map<string, number>();

  for (const aluno of alunos) {
    const turmaId = turmaByName.get(aluno.turmaNome);
    if (!turmaId) {
      throw new Error(`Turma not found for aluno ${aluno.nome}: ${aluno.turmaNome}`);
    }

    const username = aluno.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
    const usuarioId = await insertUser(username, 'Aluno123!', 'ALUNO');
    const [result] = await connection.execute(
      'INSERT INTO aluno (nome, matriculado, turma_id, usuario_id) VALUES (?, ?, ?, ?)',
      [aluno.nome, aluno.matriculado ? 1 : 0, turmaId, usuarioId],
    );

    const insertId = Number((result as any).insertId);
    insertedAlunoIds.set(aluno.nome, insertId);
  }

  for (const item of alunoDisciplinaMap) {
    const alunoId = insertedAlunoIds.get(item.alunoNome);
    if (!alunoId) continue;

    for (const disciplinaName of item.disciplinaNames) {
      const disciplinaId = disciplinaByName.get(disciplinaName);
      if (!disciplinaId) {
        throw new Error(`Disciplina not found for student ${item.alunoNome}: ${disciplinaName}`);
      }

      await connection.execute(
        'INSERT INTO aluno_disciplina (aluno_id, disciplina_id) VALUES (?, ?)',
        [alunoId, disciplinaId],
      );
    }
  }

  console.log('Seed complete.');
  console.log('Turmas inserted:', turmaResult);
  console.log('Disciplinas inserted:', disciplinaResult);
  console.log('Aluno-disciplina links inserted for 5 students.');
  console.log('Mock login credentials: admin/Admin123!, professors/Professor123!, students/Aluno123!.');
  await connection.end();
};

runSeed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
