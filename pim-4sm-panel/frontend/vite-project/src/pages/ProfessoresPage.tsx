import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { ActionButton } from '@/components/ActionButton';
import { AccountCredentialsFields } from '@/components/AccountCredentialsFields';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { FormField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import {
  createProfessor,
  deleteProfessor,
  fetchDisciplinas,
  fetchProfessores,
  toCreateProfessorPayload,
  toUpdateProfessorPayload,
  updateProfessor,
} from '@/lib/api';
import { credentialsAreValid } from '@/lib/validation';
import type { Disciplina, Professor } from '@/types/entities';

const emptyForm = { nome: '', disciplinaId: '', username: '', password: '' };

export function ProfessoresPage() {
  const [items, setItems] = useState<Professor[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');

  const loadItems = async () => {
    const [professores, disciplinasData] = await Promise.all([fetchProfessores(), fetchDisciplinas()]);
    setItems(professores);
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

  const openEditModal = (row: Professor) => {
    setEditingId(row.id);
    setForm({ nome: row.nome, disciplinaId: String(row.disciplinaId ?? ''), username: '', password: '' });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.nome.trim() || !form.disciplinaId) {
      setFormError('Preencha o nome e selecione uma disciplina.');
      return;
    }
    if (!credentialsAreValid(form.username, form.password, editingId === null)) {
      setFormError(editingId === null ? 'Username deve ter de 3 a 100 caracteres e senha de 8 a 128 caracteres.' : 'Username ou senha informados não atendem aos requisitos.');
      return;
    }

    const professorData = {
      nome: form.nome.trim(),
      disciplinaId: Number(form.disciplinaId),
    };

    if (editingId !== null) {
      await updateProfessor(editingId, toUpdateProfessorPayload({
        ...professorData,
        username: form.username.trim() || undefined,
        password: form.password || undefined,
      }));
    } else {
      await createProfessor(toCreateProfessorPayload({
        ...professorData,
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
    const confirmed = window.confirm('Deseja excluir este professor?');
    if (!confirmed) {
      return;
    }

    await deleteProfessor(id);
    await loadItems();
  };

  const columns: DataTableColumn<Professor>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nome', header: 'Nome' },
    {
      key: 'disciplina',
      header: 'Disciplina',
      render: (row) => row.disciplina?.nome ?? '—',
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="row-actions">
          <ActionButton kind="edit" label="Editar professor" onClick={() => openEditModal(row)} />
          <ActionButton kind="delete" label="Excluir professor" onClick={() => void handleDelete(row.id)} />
        </div>
      ),
    },
  ];

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h3>Professores</h3>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          <Plus aria-hidden="true" /> Novo professor
        </button>
      </div>

      {loading ? (
        <div className="panel-card"><p>Carregando professores...</p></div>
      ) : (
        <DataTable columns={columns} data={items} rowKey={(row) => row.id} emptyMessage="Nenhum professor cadastrado." />
      )}

      <Modal isOpen={modalOpen} title={editingId === null ? 'Novo professor' : 'Editar professor'} onClose={() => setModalOpen(false)}>
        <div className="form-grid">
          <FormField
            label="Nome"
            name="nome"
            value={form.nome}
            onChange={(value) => setForm((current) => ({ ...current, nome: String(value) }))}
            placeholder="Ex: Prof. Ana Silva"
          />
          <FormField
            label="Disciplina"
            name="disciplinaId"
            type="select"
            value={form.disciplinaId}
            options={disciplinas.map((disciplina) => ({
              value: disciplina.id,
              label: disciplina.nome,
            }))}
            onChange={(value) => setForm((current) => ({ ...current, disciplinaId: String(value) }))}
          />
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
