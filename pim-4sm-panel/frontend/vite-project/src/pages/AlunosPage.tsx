import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { ActionButton } from '@/components/ActionButton';
import { AccountCredentialsFields } from '@/components/AccountCredentialsFields';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { FormField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import {
  createAluno,
  deleteAluno,
  fetchAlunos,
  fetchDisciplinas,
  fetchTurmas,
  toCreateAlunoPayload,
  toUpdateAlunoPayload,
  updateAluno,
} from '@/lib/api';
import { credentialsAreValid } from '@/lib/validation';
import type { Aluno, Disciplina, Turma } from '@/types/entities';

const emptyForm = { nome: '', matriculado: false, turmaId: '', disciplinaIds: [] as number[], username: '', password: '' };

const normalizeDisciplinaIds = (row: Aluno) => {
  if (Array.isArray(row.disciplinaIds) && row.disciplinaIds.length) {
    return row.disciplinaIds;
  }

  if (Array.isArray(row.disciplinas) && row.disciplinas.length) {
    return row.disciplinas.map((disciplina) => disciplina.id);
  }

  if (typeof row.disciplinaId === 'number') {
    return [row.disciplinaId];
  }

  return [];
};

const getDisciplinaNames = (row: Aluno, dataset: Disciplina[]) => {
  const disciplinaList = Array.isArray(row.disciplinas) && row.disciplinas.length
    ? row.disciplinas
    : Array.isArray(row.disciplinaIds) && row.disciplinaIds.length
      ? dataset.filter((disciplina) => row.disciplinaIds!.includes(disciplina.id))
      : typeof row.disciplinaId === 'number'
        ? dataset.filter((disciplina) => disciplina.id === row.disciplinaId)
        : [];

  const names = disciplinaList
    .map((disciplina) => disciplina.nome)
    .filter((nome): nome is string => Boolean(nome));

  return names.length ? names : [];
};

export function AlunosPage() {
  const [items, setItems] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');

  const loadItems = async () => {
    const [alunos, turmasData, disciplinasData] = await Promise.all([
      fetchAlunos(),
      fetchTurmas(),
      fetchDisciplinas(),
    ]);
    setItems(alunos);
    setTurmas(turmasData);
    setDisciplinas(disciplinasData);
    setLoading(false);
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (row: Aluno) => {
    setEditingId(row.id);
    setForm({
      nome: row.nome,
      matriculado: row.matriculado,
      turmaId: String(row.turmaId ?? row.turma_id ?? row.turma?.id ?? ''),
      disciplinaIds: normalizeDisciplinaIds(row),
      username: '',
      password: '',
    });
    setModalOpen(true);
  };

  const toggleDisciplina = (id: number) => {
    setForm((current) => {
      const exists = current.disciplinaIds.includes(id);
      return {
        ...current,
        disciplinaIds: exists
          ? current.disciplinaIds.filter((value) => value !== id)
          : [...current.disciplinaIds, id],
      };
    });
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.nome.trim() || !form.turmaId || form.disciplinaIds.length === 0) {
      setFormError('Preencha os campos obrigatórios e selecione ao menos uma disciplina.');
      return;
    }
    if (!credentialsAreValid(form.username, form.password, editingId === null)) {
      setFormError(editingId === null ? 'Username deve ter de 3 a 100 caracteres e senha de 8 a 128 caracteres.' : 'Username ou senha informados não atendem aos requisitos.');
      return;
    }

    const studentData = {
      nome: form.nome.trim(),
      matriculado: Boolean(form.matriculado),
      turmaId: Number(form.turmaId),
      disciplinaIds: form.disciplinaIds,
    };

    if (editingId !== null) {
      await updateAluno(editingId, toUpdateAlunoPayload({
        ...studentData,
        username: form.username.trim() || undefined,
        password: form.password || undefined,
      }));
    } else {
      await createAluno(toCreateAlunoPayload({
        ...studentData,
        username: form.username.trim(),
        password: form.password,
      }));
    }

    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadItems();
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Deseja excluir este aluno?');
    if (!confirmed) {
      return;
    }

    await deleteAluno(id);
    await loadItems();
  };

  const columns: DataTableColumn<Aluno>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nome', header: 'Nome' },
    {
      key: 'matriculado',
      header: 'Status',
      render: (row) => (row.matriculado ? 'Matriculado' : 'Não matriculado'),
    },
    {
      key: 'turma',
      header: 'Turma',
      render: (row) => row.turma?.nome ?? '—',
    },
    {
      key: 'disciplina',
      header: 'Disciplinas',
      render: (row) => {
        const nomes = getDisciplinaNames(row, disciplinas);
        return nomes.length ? nomes.join(', ') : '—';
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="row-actions">
          <ActionButton kind="edit" label="Editar aluno" onClick={() => openEditModal(row)} />
          <ActionButton kind="delete" label="Excluir aluno" onClick={() => void handleDelete(row.id)} />
        </div>
      ),
    },
  ];

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h3>Alunos</h3>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          <Plus aria-hidden="true" /> Novo aluno
        </button>
      </div>

      {loading ? (
        <div className="panel-card"><p>Carregando alunos...</p></div>
      ) : (
        <DataTable columns={columns} data={items} rowKey={(row) => row.id} emptyMessage="Nenhum aluno cadastrado." />
      )}

      <Modal isOpen={modalOpen} title={editingId === null ? 'Novo aluno' : 'Editar aluno'} onClose={() => setModalOpen(false)}>
        <div className="form-grid">
          <FormField
            label="Nome"
            name="nome"
            value={form.nome}
            onChange={(value) => setForm((current) => ({ ...current, nome: String(value) }))}
            placeholder="Ex: Maria Souza"
          />
          <FormField
            label="Matriculado"
            name="matriculado"
            type="checkbox"
            value={form.matriculado}
            onChange={(value) => setForm((current) => ({ ...current, matriculado: Boolean(value) }))}
          />
          <FormField
            label="Turma"
            name="turmaId"
            type="select"
            value={form.turmaId}
            options={turmas.map((turma) => ({ value: turma.id, label: turma.nome }))}
            onChange={(value) => setForm((current) => ({ ...current, turmaId: String(value) }))}
          />
          <div className="field">
            <span>Disciplinas</span>
            <div className="discipline-checkbox-group">
              {disciplinas.map((disciplina) => (
                <label key={disciplina.id} className="discipline-option">
                  <input
                    type="checkbox"
                    checked={form.disciplinaIds.includes(disciplina.id)}
                    onChange={() => toggleDisciplina(disciplina.id)}
                  />
                  <span>{disciplina.nome}</span>
                </label>
              ))}
            </div>
          </div>
          <AccountCredentialsFields
            username={form.username}
            password={form.password}
            creating={editingId === null}
            onUsernameChange={(username) => setForm((current) => ({ ...current, username }))}
            onPasswordChange={(password) => setForm((current) => ({ ...current, password }))}
          />
          {formError && <p className="form-error" role="alert">{formError}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={() => void handleSubmit()}>
            {editingId === null ? 'Salvar' : 'Atualizar'}
          </button>
        </div>
      </Modal>
    </section>
  );
}
