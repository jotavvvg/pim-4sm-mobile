import { useEffect, useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { fetchMyProfessorStudents } from '@/lib/api';
import type { Aluno } from '@/types/entities';

export function ProfessorStudentsPage() {
  const [students, setStudents] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMyProfessorStudents()
      .then((data) => { if (active) setStudents(data); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const columns: DataTableColumn<Aluno>[] = [
    { key: 'nome', header: 'Aluno' },
    { key: 'turma', header: 'Turma', render: (student) => student.turma?.nome ?? '—' },
    { key: 'matriculado', header: 'Status', render: (student) => student.matriculado ? 'Matriculado' : 'Não matriculado' },
    { key: 'disciplinas', header: 'Disciplina', render: (student) => student.disciplinas?.map((subject) => subject.nome).join(', ') ?? student.disciplina?.nome ?? '—' },
  ];

  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Área do professor</p><h3>Meus Alunos</h3></div></div>
      {loading ? <div className="panel-card"><p>Carregando seus alunos...</p></div> : <DataTable columns={columns} data={students} rowKey={(student) => student.id} emptyMessage="Nenhum aluno matriculado na sua disciplina." />}
    </section>
  );
}