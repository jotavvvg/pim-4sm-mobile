import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { ActionButton } from '@/components/ActionButton';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { FormField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import { createDisciplina, deleteDisciplina, fetchDisciplinas, updateDisciplina } from '@/lib/api';
import type { Disciplina } from '@/types/entities';

const emptyForm = { nome: '', carga_hora: 0 };

export function DisciplinasPage() {
  const [items, setItems] = useState<Disciplina[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    const data = await fetchDisciplinas();
    setItems(data);
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

  const openEditModal = (row: Disciplina) => {
    setEditingId(row.id);
    setForm({ nome: row.nome, carga_hora: row.carga_hora });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      carga_hora: Number(form.carga_hora),
    };

    if (editingId !== null) {
      await updateDisciplina(editingId, payload);
    } else {
      await createDisciplina(payload);
    }

    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadItems();
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Deseja excluir esta disciplina?');
    if (!confirmed) {
      return;
    }

    await deleteDisciplina(id);
    await loadItems();
  };

  const columns: DataTableColumn<Disciplina>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nome', header: 'Nome' },
    { key: 'carga_hora', header: 'Carga horária' },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="row-actions">
          <ActionButton kind="edit" label="Editar disciplina" onClick={() => openEditModal(row)} />
          <ActionButton kind="delete" label="Excluir disciplina" onClick={() => void handleDelete(row.id)} />
        </div>
      ),
    },
  ];

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h3>Disciplinas</h3>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          <Plus aria-hidden="true" /> Nova disciplina
        </button>
      </div>

      {loading ? (
        <div className="panel-card"><p>Carregando disciplinas...</p></div>
      ) : (
        <DataTable columns={columns} data={items} rowKey={(row) => row.id} emptyMessage="Nenhuma disciplina cadastrada." />
      )}

      <Modal isOpen={modalOpen} title={editingId === null ? 'Nova disciplina' : 'Editar disciplina'} onClose={() => setModalOpen(false)}>
        <div className="form-grid">
          <FormField
            label="Nome"
            name="nome"
            value={form.nome}
            onChange={(value) => setForm((current) => ({ ...current, nome: String(value) }))}
            placeholder="Ex: Matemática"
          />
          <FormField
            label="Carga horária"
            name="carga_hora"
            type="number"
            value={form.carga_hora}
            onChange={(value) => setForm((current) => ({ ...current, carga_hora: Number(value) }))}
            min={1}
          />
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
