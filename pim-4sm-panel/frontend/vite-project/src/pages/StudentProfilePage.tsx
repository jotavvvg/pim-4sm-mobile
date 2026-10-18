import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { fetchMyStudentProfile } from '@/lib/api';
import type { Aluno } from '@/types/entities';

export function StudentProfilePage() {
  const [student, setStudent] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMyStudentProfile()
      .then((data) => { if (active) setStudent(data); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="panel-card"><p>Carregando seu perfil...</p></div>;
  if (!student) return <EmptyState title="Perfil indisponível" description="Não foi possível carregar seus dados acadêmicos." />;

  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Área do aluno</p><h3>Meu Perfil</h3></div></div>
      <article className="profile-panel">
        <div className="profile-heading"><span className="profile-mark">{student.nome.slice(0, 1).toLocaleUpperCase()}</span><div><p className="eyebrow">Estudante</p><h4>{student.nome}</h4></div></div>
        <dl className="profile-details">
          <div><dt>Status</dt><dd>{student.matriculado ? 'Matriculado' : 'Não matriculado'}</dd></div>
          <div><dt>Turma</dt><dd>{student.turma?.nome ?? 'Não vinculada'}</dd></div>
          <div><dt>Disciplinas</dt><dd>{student.disciplinas?.map((subject) => subject.nome).join(', ') || 'Nenhuma disciplina vinculada'}</dd></div>
        </dl>
      </article>
    </section>
  );
}