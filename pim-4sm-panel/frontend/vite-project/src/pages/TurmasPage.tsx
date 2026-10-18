import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { ActionButton } from '@/components/ActionButton';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { FormField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import {
  createTurma,
  deleteTurma,
  fetchAlunoById,
  fetchTurmaById,
  fetchTurmas,
  updateTurma,
} from '@/lib/api';
import type { Aluno, Turma } from '@/types/entities';

const emptyForm = { nome: '' };

export function TurmasPage() {
  const [items, setItems] = useState<Turma[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    const data = await fetchTurmas();
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

  const openEditModal = (row: Turma) => {
    setEditingId(row.id);
    setForm({ nome: row.nome });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      return;
    }

    if (editingId !== null) {
      await updateTurma(editingId, { nome: form.nome.trim() });
    } else {
      await createTurma({ nome: form.nome.trim() });
    }

    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadItems();
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Deseja excluir esta turma?');
    if (!confirmed) {
      return;
    }

    await deleteTurma(id);
    await loadItems();
  };

  const handleSelectTurma = async (row: Turma) => {
    const turma = await fetchTurmaById(row.id);
    const alunosDetalhados = await Promise.all(
      (turma.alunos ?? []).map(async (aluno) => {
        const alunoDetalhado = await fetchAlunoById(aluno.id);
        return {
          ...aluno,
          ...alunoDetalhado,
        } satisfies Aluno;
      }),
    );

    setSelectedTurma({
      ...turma,
      alunos: alunosDetalhados,
    });
  };

  const getAlunoDisciplinas = (aluno: Aluno) => {
    if (Array.isArray(aluno.disciplinas) && aluno.disciplinas.length) {
      return aluno.disciplinas.map((disciplina) => disciplina.nome).filter(Boolean);
    }

    if (Array.isArray(aluno.disciplinaIds) && aluno.disciplinaIds.length) {
      return aluno.disciplinaIds.map((id) => aluno.disciplinas?.find((disciplina) => disciplina.id === id)?.nome).filter(Boolean) as string[];
    }

    if (typeof aluno.disciplinaId === 'number') {
      return aluno.disciplina?.nome ? [aluno.disciplina.nome] : [];
    }

    return [];
  };

  const columns: DataTableColumn<Turma>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nome', header: 'Nome' },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="row-actions">
          <ActionButton kind="view" label="Ver alunos da turma" onClick={() => void handleSelectTurma(row)} />
          <ActionButton kind="edit" label="Editar turma" onClick={() => openEditModal(row)} />
          <ActionButton kind="delete" label="Excluir turma" onClick={() => void handleDelete(row.id)} />
        </div>
      ),
    },
  ];

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h3>Turmas</h3>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          <Plus aria-hidden="true" /> Nova turma
        </button>
      </div>

      {loading ? (
        <div className="panel-card"><p>Carregando turmas...</p></div>
      ) : (
        <DataTable columns={columns} data={items} rowKey={(row) => row.id} emptyMessage="Nenhuma turma cadastrada." onRowClick={(row) => void handleSelectTurma(row)} />
      )}

      {selectedTurma && (
        <div className="detail-panel">
          <h4>Alunos de {selectedTurma.nome}</h4>
          {selectedTurma.alunos && selectedTurma.alunos.length > 0 ? (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Matrícula</th>
                  <th>Disciplinas</th>
                </tr>
              </thead>
              <tbody>
                {selectedTurma.alunos.map((aluno: Aluno) => {
                  const disciplinas = getAlunoDisciplinas(aluno);

                  return (
                    <tr key={aluno.id}>
                      <td>{aluno.nome}</td>
                      <td>{aluno.matriculado ? 'Ativa' : 'Inativa'}</td>
                      <td>{disciplinas.length ? disciplinas.join(', ') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p>Nenhum aluno nesta turma.</p>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} title={editingId === null ? 'Nova turma' : 'Editar turma'} onClose={() => setModalOpen(false)}>
        <div className="form-grid">
          <FormField
            label="Nome"
            name="nome"
            value={form.nome}
            onChange={(value) => setForm((current) => ({ ...current, nome: String(value) }))}
            placeholder="Ex: A"
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
