import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { fetchDisciplinaById, fetchMyProfessorProfile } from '@/lib/api';
import type { Disciplina, Professor } from '@/types/entities';

export function ProfessorDisciplinePage() {
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMyProfessorProfile()
      .then(async (profile) => {
        const subject = profile.disciplina ?? (profile.disciplinaId ? await fetchDisciplinaById(profile.disciplinaId) : null);
        if (active) {
          setProfessor(profile);
          setDisciplina(subject);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="panel-card"><p>Carregando sua disciplina...</p></div>;
  if (!professor || !disciplina) {
    return <EmptyState title="Disciplina indisponível" description="Não foi possível carregar sua disciplina vinculada." />;
  }

  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Área do professor</p><h3>Minha Disciplina</h3></div></div>
      <article className="profile-panel">
        <div className="profile-heading"><span className="profile-mark">{disciplina.nome.slice(0, 1).toLocaleUpperCase()}</span><div><p className="eyebrow">Professor</p><h4>{professor.nome}</h4></div></div>
        <dl className="profile-details">
          <div><dt>Disciplina</dt><dd>{disciplina.nome}</dd></div>
          <div><dt>Carga horária</dt><dd>{disciplina.carga_hora} horas</dd></div>
        </dl>
      </article>
    </section>
  );
}