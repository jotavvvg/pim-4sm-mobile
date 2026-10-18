import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { correctEvaluationAnswer, fetchPendingEvaluations } from '@/lib/api';
import type { PendingEvaluation } from '@/types/entities';

export function PendingEvaluationsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PendingEvaluation | null>(null);
  const [formError, setFormError] = useState('');
  const pendingQuery = useQuery({ queryKey: ['pending-evaluations'], queryFn: fetchPendingEvaluations });
  const correctionMutation = useMutation({
    mutationFn: ({ answerId, correta }: { answerId: number; correta: boolean }) => correctEvaluationAnswer(answerId, correta),
    onSuccess: async (_submission, variables) => {
      setFormError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-evaluations'] }),
        queryClient.invalidateQueries({ queryKey: ['grade-metrics'] }),
      ]);
      setSelected((current) => {
        if (!current) return current;
        const respostas = current.respostas.filter((answer) => answer.id !== variables.answerId);
        return respostas.length ? { ...current, respostas } : null;
      });
    },
    onError: () => setFormError('A resposta não pôde ser corrigida. Ela pode já ter sido revisada.'),
  });

  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Área do professor</p><h3>Correções pendentes</h3></div><span className="inbox-count">{pendingQuery.data?.length ?? 0}</span></div>
      {pendingQuery.isLoading ? <div className="panel-card"><p>Carregando avaliações...</p></div> : null}
      {pendingQuery.isError ? <EmptyState title="Avaliações indisponíveis" description="Não foi possível carregar as respostas pendentes." /> : null}
      {pendingQuery.data?.length === 0 ? <EmptyState title="Tudo corrigido" description="Não há respostas dissertativas aguardando revisão." /> : null}
      {pendingQuery.data && pendingQuery.data.length > 0 && (
        <div className="grading-inbox">
          {pendingQuery.data.map((submission) => (
            <article className="grading-inbox-row" key={submission.id}>
              <div className="grading-avatar" aria-hidden="true">{submission.aluno.nome.slice(0, 1).toLocaleUpperCase()}</div>
              <div className="grading-copy">
                <h4>{submission.aluno.nome}</h4>
                <p>{submission.atividade.titulo}</p>
                <small>{submission.respostas.length} {submission.respostas.length === 1 ? 'resposta para revisar' : 'respostas para revisar'}</small>
              </div>
              <button type="button" className="secondary-button" onClick={() => { setFormError(''); setSelected(submission); }}>Revisar respostas</button>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={Boolean(selected)} title={selected ? `${selected.aluno.nome} · ${selected.atividade.titulo}` : 'Revisar respostas'} onClose={() => setSelected(null)}>
        {selected && <div className="grading-review">
          {selected.respostas.map((answer, index) => (
            <article className="grading-answer" key={answer.id}>
              <p className="eyebrow">Questão dissertativa {index + 1}</p>
              <h4>{answer.questao.enunciado}</h4>
              <blockquote>{answer.respostaDada}</blockquote>
              <div className="grading-actions">
                <button type="button" className="grade-correct" disabled={correctionMutation.isPending} onClick={() => correctionMutation.mutate({ answerId: answer.id, correta: true })}>
                  <Check aria-hidden="true" /> Correto
                </button>
                <button type="button" className="grade-incorrect" disabled={correctionMutation.isPending} onClick={() => correctionMutation.mutate({ answerId: answer.id, correta: false })}>
                  <X aria-hidden="true" /> Incorreto
                </button>
              </div>
            </article>
          ))}
          {formError && <p className="form-error" role="alert">{formError}</p>}
        </div>}
      </Modal>
    </section>
  );
}