import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCheck, ClipboardList, Clock3 } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { fetchActivities } from '@/lib/api';

export function ActivitiesListPage() {
  const activitiesQuery = useQuery({ queryKey: ['activities'], queryFn: fetchActivities });

  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Área do aluno</p><h3>Atividades</h3></div></div>
      {activitiesQuery.isLoading ? <div className="panel-card"><p>Carregando atividades...</p></div> : null}
      {activitiesQuery.isError ? <EmptyState title="Atividades indisponíveis" description="Não foi possível carregar as atividades agora." /> : null}
      {activitiesQuery.data && activitiesQuery.data.length === 0 ? <EmptyState title="Nenhuma atividade disponível" description="As atividades das suas disciplinas aparecerão aqui." /> : null}
      {activitiesQuery.data && activitiesQuery.data.length > 0 && (
        <div className="activity-list">
          {activitiesQuery.data.map((activity) => (
            <article className="activity-list-row" key={activity.id}>
              <div className="activity-list-icon"><ClipboardList aria-hidden="true" /></div>
              <div className="activity-list-copy">
                <p className="eyebrow">{activity.disciplina?.nome ?? 'Disciplina'}</p>
                <h4>{activity.titulo}</h4>
                <p>{activity.questoes.length} {activity.questoes.length === 1 ? 'questão' : 'questões'}</p>
              </div>
              {activity.minhaSubmissao ? (
                <div className="activity-completion">
                  {activity.minhaSubmissao.statusCorrecao === 'CONCLUIDO' ? (
                    <>
                      <span className="activity-status complete"><CheckCheck aria-hidden="true" /> Completo</span>
                      {activity.minhaSubmissao.notaTotal !== null && <small>Nota: {Number(activity.minhaSubmissao.notaTotal).toFixed(1)}</small>}
                    </>
                  ) : (
                    <span className="activity-status pending"><Clock3 aria-hidden="true" /> Aguardando correção</span>
                  )}
                </div>
              ) : (
                <Link className="primary-button activity-start" to={`/atividades/${activity.id}/responder`}>
                  Responder <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}