import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { CirclePlus, FileText, ListChecks, Plus, Trash2, X } from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { createActivity, fetchActivities, fetchMyProfessorProfile } from '@/lib/api';
import type { ActivityQuestionType } from '@/types/entities';

const questionTypes: ActivityQuestionType[] = ['MULTIPLACADA', 'DISSERTATIVA'];
const optionLabels = ['A', 'B', 'C', 'D'];

const builderSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe o título da atividade.'),
  questoes: z.array(z.object({
    tipo: z.enum(questionTypes),
    enunciado: z.string().trim().min(1, 'Escreva o enunciado da questão.'),
    opcoes: z.array(z.string()),
    respostaCorretaIndex: z.string(),
  })).min(1, 'Adicione ao menos uma questão.'),
}).superRefine((form, context) => {
  form.questoes.forEach((question, index) => {
    if (question.tipo !== 'MULTIPLACADA') return;
    if (question.opcoes.length !== 4 || question.opcoes.some((option) => !option.trim())) {
      context.addIssue({ code: 'custom', message: 'Preencha as quatro opções.', path: ['questoes', index, 'opcoes'] });
    }
    if (!['0', '1', '2', '3'].includes(question.respostaCorretaIndex)) {
      context.addIssue({ code: 'custom', message: 'Marque a resposta correta.', path: ['questoes', index, 'respostaCorretaIndex'] });
    }
  });
});

type BuilderValues = z.infer<typeof builderSchema>;
type BuilderQuestion = BuilderValues['questoes'][number];

function createQuestion(tipo: ActivityQuestionType): BuilderQuestion {
  return { tipo, enunciado: '', opcoes: ['', '', '', ''], respostaCorretaIndex: '' };
}

export function ActivityBuilderPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdTitle, setCreatedTitle] = useState('');
  const activitiesQuery = useQuery({ queryKey: ['activities'], queryFn: fetchActivities });
  const professorQuery = useQuery({
    queryKey: ['my-professor-profile'],
    queryFn: fetchMyProfessorProfile,
    enabled: role === 'PROFESSOR',
  });
  const { register, control, watch, handleSubmit, reset } = useForm<BuilderValues>({
    defaultValues: { titulo: '', questoes: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'questoes' });
  const createMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: async (activity) => {
      setCreatedTitle(activity.titulo);
      setFormError('');
      reset({ titulo: '', questoes: [] });
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => setFormError('Não foi possível criar a atividade. Confira sua conexão e tente novamente.'),
  });

  const onSubmit = handleSubmit((values) => {
    const parsed = builderSchema.safeParse(values);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Revise os dados da atividade.');
      return;
    }
    const disciplineId = professorQuery.data?.disciplinaId;
    if (!disciplineId) {
      setFormError('Não foi possível identificar sua disciplina.');
      return;
    }

    createMutation.mutate({
      titulo: parsed.data.titulo,
      disciplina_id: disciplineId,
      questoes: parsed.data.questoes.map((question) => question.tipo === 'MULTIPLACADA'
        ? {
            tipo: question.tipo,
            enunciado: question.enunciado.trim(),
            opcoes: question.opcoes.map((option) => option.trim()),
            resposta_correta: question.opcoes[Number(question.respostaCorretaIndex)]?.trim() ?? '',
          }
        : {
            tipo: question.tipo,
            enunciado: question.enunciado.trim(),
            opcoes: null,
            resposta_correta: null,
          }),
    });
  });

  if (professorQuery.isLoading) return <div className="panel-card"><p>Carregando sua disciplina...</p></div>;
  if (!professorQuery.data?.disciplina) {
    return <EmptyState title="Disciplina indisponível" description="Não foi possível carregar sua disciplina vinculada." />;
  }

  return (
    <section className="page-section activity-builder-page">
      <div className="page-header">
        <div><p className="eyebrow">{professorQuery.data.disciplina.nome}</p><h3>Atividades</h3></div>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            reset({ titulo: '', questoes: [] });
            setCreatedTitle('');
            setFormError('');
            setDialogOpen(true);
          }}
        >
          <Plus aria-hidden="true" /> Nova Atividade
        </button>
      </div>

      {createdTitle && <p className="form-notice" role="status">Atividade “{createdTitle}” criada.</p>}

      {activitiesQuery.isLoading ? <div className="panel-card"><p>Carregando atividades...</p></div> : null}
      {activitiesQuery.isError ? <EmptyState title="Atividades indisponíveis" description="Não foi possível carregar suas atividades." /> : null}
      {activitiesQuery.data?.length === 0 ? <EmptyState title="Nenhuma atividade criada" description="As atividades desta disciplina aparecerão aqui." /> : null}
      {activitiesQuery.data && activitiesQuery.data.length > 0 && (
        <div className="activity-list teacher-activity-list">
          {activitiesQuery.data.map((activity) => (
            <article className="activity-list-row" key={activity.id}>
              <div className="activity-list-icon"><FileText aria-hidden="true" /></div>
              <div className="activity-list-copy">
                <p className="eyebrow">{activity.disciplina?.nome ?? professorQuery.data.disciplina?.nome}</p>
                <h4>{activity.titulo}</h4>
                <p>{activity.questoes.length} {activity.questoes.length === 1 ? 'questão' : 'questões'}</p>
              </div>
              <span className="activity-status">Disponível</span>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={dialogOpen}
        title="Nova Atividade"
        onClose={() => {
          setDialogOpen(false);
          setFormError('');
        }}
        className="activity-create-modal"
      >
      <form className="activity-builder activity-builder-modal" onSubmit={(event) => void onSubmit(event)}>
        <p className="activity-modal-subtitle">{professorQuery.data.disciplina.nome}</p>
        <label className="field" htmlFor="activity-title">
          <span>Título da atividade</span>
          <input id="activity-title" {...register('titulo')} placeholder="Ex: Revisão de funções" maxLength={255} />
        </label>

        <div className="question-actions" aria-label="Adicionar questão">
          <button type="button" className="secondary-button" onClick={() => { setCreatedTitle(''); append(createQuestion('MULTIPLACADA')); }}>
            <ListChecks aria-hidden="true" /> Adicionar Questão Múltipla Escolha
          </button>
          <button type="button" className="secondary-button" onClick={() => { setCreatedTitle(''); append(createQuestion('DISSERTATIVA')); }}>
            <FileText aria-hidden="true" /> Adicionar Questão Dissertativa
          </button>
        </div>

        {!fields.length ? (
          <EmptyState title="Sua atividade está vazia" description="Adicione uma questão para começar a montar a avaliação." />
        ) : fields.map((field, index) => {
          const tipo = watch(`questoes.${index}.tipo`);
          return (
            <fieldset className="question-card" key={field.id}>
              <legend>Questão {index + 1}<span>{tipo === 'MULTIPLACADA' ? 'Múltipla escolha' : 'Dissertativa'}</span></legend>
              <label className="field" htmlFor={`question-${index}`}>
                <span>Enunciado</span>
                <textarea id={`question-${index}`} rows={3} {...register(`questoes.${index}.enunciado`)} placeholder="Escreva a questão..." />
              </label>

              {tipo === 'MULTIPLACADA' && (
                <div className="question-options">
                  <p className="question-helper">Opções de resposta. Marque a correta.</p>
                  {optionLabels.map((label, optionIndex) => (
                    <div className="option-editor" key={label}>
                      <span className="option-letter">{label}</span>
                      <input
                        aria-label={`Opção ${label} da questão ${index + 1}`}
                        {...register(`questoes.${index}.opcoes.${optionIndex}`)}
                        placeholder={`Opção ${label}`}
                      />
                      <label className="correct-option" title={`Marcar opção ${label} como correta`}>
                        <input type="radio" value={String(optionIndex)} {...register(`questoes.${index}.respostaCorretaIndex`)} />
                        <span className="visually-hidden">Correta</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" className="text-action danger-text" onClick={() => remove(index)}>
                <Trash2 aria-hidden="true" /> Remover questão
              </button>
            </fieldset>
          );
        })}

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => setDialogOpen(false)}>
            <X aria-hidden="true" /> Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={createMutation.isPending || !fields.length}>
            <CirclePlus aria-hidden="true" /> {createMutation.isPending ? 'Criando...' : 'Criar atividade'}
          </button>
        </div>
      </form>
      </Modal>
    </section>
  );
}