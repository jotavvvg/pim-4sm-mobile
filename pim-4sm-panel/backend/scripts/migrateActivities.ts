import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'mysql2/promise';

const migrationUrl = new URL('../drizzle/0001_bored_amazoness.sql', import.meta.url);
const requiredTables = ['atividades', 'questoes', 'respostas_questoes', 'submissoes_alunos'];

const runMigration = async () => {
  const connection = await createConnection(
    process.env.DATABASE_URL ?? 'mysql://root@localhost:3306/academico_db',
  );

  try {
    const [tableRows] = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()',
    );
    const existingTables = new Set((tableRows as Array<{ TABLE_NAME?: string; table_name?: string }>)
      .map((row) => row.TABLE_NAME ?? row.table_name ?? ''));
    const installedTables = requiredTables.filter((table) => existingTables.has(table));

    if (installedTables.length === requiredTables.length) {
      console.log('Activity and grading tables already exist. No migration needed.');
      return;
    }
    if (installedTables.length > 0) {
      throw new Error(`Partial activity migration detected (${installedTables.join(', ')}). Inspect the database before retrying.`);
    }
    if (!existingTables.has('aluno') || !existingTables.has('disciplina')) {
      throw new Error('The existing aluno and disciplina tables must be installed before this migration.');
    }

    const migration = await readFile(migrationUrl, 'utf8');
    const statements = migration
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await connection.query(statement);
    }

    console.log(`Activity and grading migration applied (${statements.length} statements).`);
  } finally {
    await connection.end();
  }
};

runMigration().catch((error: unknown) => {
  console.error('Activity migration failed:', error);
  process.exitCode = 1;
});