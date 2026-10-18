import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { fetchMyStudentClasses, fetchMyStudentProfile } from '@/lib/api';
import type { Aluno, Disciplina, Turma } from '@/types/entities';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isDisciplina(value: unknown): value is Disciplina {
  return isRecord(value) && typeof value.id === 'number' && typeof value.nome === 'string' && typeof value.carga_hora === 'number';
}

function isTurma(value: unknown): value is Turma {
  return isRecord(value) && typeof value.id === 'number' && typeof value.nome === 'string';
}

function collectSummary(value: unknown) {
  const rootRecords = Array.isArray(value) ? value.filter(isRecord) : isRecord(value) ? [value] : [];
  const records = [...rootRecords, ...rootRecords.flatMap((record) => isRecord(record.aluno) ? [record.aluno] : [])];
  const disciplines = records.flatMap((record) => [
    ...(isDisciplina(record) ? [record] : []),
    ...(Array.isArray(record.disciplinas) ? record.disciplinas.filter(isDisciplina) : []),
  ]);
  const classes = records.flatMap((record) => {
    const values = [record.turma, ...(Array.isArray(record.turmas) ? record.turmas : []), ...(Array.isArray(record.classes) ? record.classes : [])];
    return [...(isTurma(record) ? [record] : []), ...values.filter(isTurma)];
  });
  return { disciplines, classes };
}

export function StudentSubjectsPage() {
  const [student, setStudent] = useState<Aluno | null>(null);
  const [classes, setClasses] = useState<Turma[]>([]);
  const [summaryDisciplines, setSummaryDisciplines] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchMyStudentProfile(), fetchMyStudentClasses()])
      .then(([profile, classSummary]) => {
        if (!active) return;
        const summary = collectSummary(classSummary);
        setStudent(profile);
        setClasses(summary.classes.length ? summary.classes : profile.turma ? [profile.turma] : []);
        setSummaryDisciplines(summary.disciplines);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="panel-card"><p>Carregando suas disciplinas...</p></div>;
  if (!student) return <EmptyState title="Disciplinas indisponíveis" description="Não foi possível carregar seu resumo acadêmico." />;

  const disciplines = student.disciplinas?.length ? student.disciplinas : summaryDisciplines;

  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Área do aluno</p><h3>Minhas Disciplinas</h3></div></div>
      <div className="profile-panel">
        <p className="eyebrow">Turma{classes.length === 1 ? '' : 's'}</p>
        <div className="class-list">{classes.length ? classes.map((classItem) => <span key={classItem.id}>{classItem.nome}</span>) : <p>Não há turma vinculada.</p>}</div>
        <div className="subject-list">
          {disciplines.length ? disciplines.map((subject) => (
            <article className="subject-row" key={subject.id}>
              <span className="subject-mark" aria-hidden="true" />
              <div><h4>{subject.nome}</h4><p>{subject.carga_hora} horas</p></div>
            </article>
          )) : <p>Nenhuma disciplina vinculada.</p>}
        </div>
      </div>
    </section>
  );
}