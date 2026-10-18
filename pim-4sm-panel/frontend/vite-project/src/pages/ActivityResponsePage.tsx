import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import axios from 'axios';

import { EmptyState } from '@/components/EmptyState';
import { fetchActivities, submitActivity } from '@/lib/api';

export function ActivityResponsePage() {
  const { id: routeId } = useParams();
  const activityId = Number(routeId);
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState('');
  const activitiesQuery = useQuery({ queryKey: ['activities'], queryFn: fetchActivities });
  const activity = activitiesQuery.data?.find((item) => item.id === activityId);
  const submitMutation = useMutation({
    mutationFn: () => submitActivity(activityId, (activity?.questoes ?? []).map((question) => ({
      questao_id: question.id,
      resposta_dada: answers[question.id] ?? '',
    }))),
    onSuccess: async () => {
      setFormError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['grade-metrics'] }),
      ]);
    },
    onError: (error) => setFormError(
      axios.isAxiosError(error) && error.response?.status === 409
        ? 'Você já enviou esta atividade.'
        : 'Não foi possível enviar a atividade. Confira suas respostas e tente novamente.',
    ),
  });

  const handleSubmit = () => {
    if (!activity) return;
    const missingAnswer = activity.questoes.some((question) => !answers[question.id]?.trim());
    if (missingAnswer) {
      setFormError('Responda todas as questões antes de enviar.');
      return;
    }
    setFormError('');
    submitMutation.mutate();
  };

  if (activitiesQuery.isLoading) return <div className="panel-card"><p>Carregando atividade...</p></div>;
  if (activitiesQuery.isError || !activity) {
    return <EmptyState title="Atividade indisponível" description="A atividade não foi encontrada ou não está disponível para sua conta." />;
  }

  if (activity.minhaSubmissao) {
    const isComplete = activity.minhaSubmissao.statusCorrecao === 'CONCLUIDO';
    return (
      <section className="submission-success">
        <div className="submission-success-mark" aria-hidden="true"><Send /></div>
        <p className="eyebrow">{activity.disciplina?.nome ?? 'Atividade'}</p>
        <h2>{isComplete ? 'Atividade completa' : 'Aguardando correção'}</h2>
        <p>{isComplete ? 'Você já concluiu esta atividade.' : 'Sua atividade já foi enviada e aguarda a correção.'}</p>
        {isComplete && activity.minhaSubmissao.notaTotal !== null && <strong>Nota: {Number(activity.minhaSubmissao.notaTotal).toFixed(1)}</strong>}
        <Link className="secondary-button" to="/atividades"><ArrowLeft aria-hidden="true" /> Voltar às atividades</Link>
      </section>
    );
  }

  if (submitMutation.isSuccess) {
    const hasEssay = activity.questoes.some((question) => question.tipo === 'DISSERTATIVA');
    return (
      <section className="submission-success">
        <div className="submission-success-mark" aria-hidden="true"><Send /></div>
        <p className="eyebrow">{activity.disciplina?.nome ?? 'Atividade'}</p>
        <h2>Atividade enviada</h2>
        <p>{hasEssay ? 'Aguardando correção das questões dissertativas.' : 'Suas respostas foram registradas.'}</p>
        <Link className="secondary-button" to="/atividades"><ArrowLeft aria-hidden="true" /> Voltar às atividades</Link>
      </section>
    );
  }

  return (
    <section className="page-section response-page">
      <Link to="/atividades" className="back-link"><ArrowLeft aria-hidden="true" /> Atividades</Link>
      <header className="response-heading">
        <p className="eyebrow">{activity.disciplina?.nome ?? 'Disciplina'}</p>
        <h2>{activity.titulo}</h2>
        <p>{activity.questoes.length} {activity.questoes.length === 1 ? 'questão' : 'questões'}</p>
      </header>

      <div className="response-questions">
        {activity.questoes.map((question, index) => (
          <fieldset className="response-question" key={question.id}>
            <legend><span>Questão {index + 1}</span><strong>{question.enunciado}</strong></legend>
            {question.tipo === 'MULTIPLACADA' ? (
              <div className="response-options">
                {(question.opcoes ?? []).map((option, optionIndex) => (
                  <label className="response-option" key={`${question.id}-${optionIndex}`}>
                    <input
                      type="radio"
                      name={`answer-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                rows={7}
                aria-label={`Resposta da questão ${index + 1}`}
                placeholder="Escreva sua resposta..."
                value={answers[question.id] ?? ''}
                onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
              />
            )}
          </fieldset>
        ))}
      </div>

      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="response-submit-row">
        <button type="button" className="primary-button" disabled={submitMutation.isPending} onClick={handleSubmit}>
          <Send aria-hidden="true" /> {submitMutation.isPending ? 'Enviando...' : 'Enviar atividade'}
        </button>
      </div>
    </section>
  );
}