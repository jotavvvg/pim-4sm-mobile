import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArcElement, Chart as ChartJS, Legend, PolarAreaController, RadialLinearScale } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/auth/useAuth';
import { EmptyState } from '@/components/EmptyState';
import { fetchGradeMetrics, fetchMetrics } from '@/lib/api';
import type { MetricsResponse, ProfessorGradeMetrics, StudentGradeMetrics } from '@/types/entities';

const summaryCards = [
  { key: 'totalAlunos', label: 'Total de alunos', accent: 'purple' },
  { key: 'totalProfessores', label: 'Total de professores', accent: 'blue' },
  { key: 'totalTurmas', label: 'Total de turmas', accent: 'green' },
  { key: 'totalDisciplinas', label: 'Total de disciplinas', accent: 'amber' },
] as const;

const chartColors = ['#8b5cf6', '#a78bfa', '#60a5fa', '#c084fc', '#818cf8'];
const polarChartColors = [
  'rgba(139, 92, 246, 0.76)',
  'rgba(96, 165, 250, 0.76)',
  'rgba(34, 197, 94, 0.72)',
  'rgba(245, 158, 11, 0.76)',
  'rgba(192, 132, 252, 0.76)',
  'rgba(20, 184, 166, 0.72)',
];
const polarChartBorders = ['#a78bfa', '#93c5fd', '#86efac', '#fcd34d', '#d8b4fe', '#5eead4'];

ChartJS.register(ArcElement, Legend, PolarAreaController, RadialLinearScale);

const gradePolarOptions: ChartOptions<'polarArea'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#cbd5e1',
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => ` ${context.label}: ${Number(context.raw ?? 0).toFixed(1)}/10`,
      },
    },
  },
  scales: {
    r: {
      min: 0,
      max: 10,
      ticks: {
        stepSize: 2,
        color: '#94a3b8',
        backdropColor: 'transparent',
        showLabelBackdrop: false,
      },
      grid: { color: 'rgba(148, 163, 184, 0.16)' },
      angleLines: { color: 'rgba(148, 163, 184, 0.2)' },
      pointLabels: { color: '#cbd5e1', font: { size: 12 } },
    },
  },
};

function createPolarGradeData(labels: string[], values: number[]): ChartData<'polarArea', number[], string> {
  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: labels.map((_, index) => polarChartColors[index % polarChartColors.length]),
      borderColor: labels.map((_, index) => polarChartBorders[index % polarChartBorders.length]),
      borderWidth: 2,
      hoverBorderWidth: 3,
    }],
  };
}

function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchMetrics()
      .then((data) => {
        if (mounted) {
          setMetrics(data);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const dashboardSummary = useMemo(() => {
    if (!metrics) {
      return null;
    }

    return {
      totalAlunos: metrics.totalAlunos,
      totalProfessores: metrics.totalProfessores,
      totalTurmas: metrics.alunosPorTurma.length,
      totalDisciplinas: metrics.cargaHorariaPorDisciplina.length,
    };
  }, [metrics]);

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-header">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h3>Dashboard acadêmico</h3>
          </div>
        </div>
        <div className="stats-grid">
          {summaryCards.map((card) => (
            <div key={card.key} className={`stat-card ${card.accent}`}>
              <span>{card.label}</span>
              <div className="skeleton-box" style={{ width: '52%', height: '26px' }} />
            </div>
          ))}
        </div>
        <div className="chart-grid">
          <div className="chart-panel"><div className="skeleton-box" style={{ height: '280px' }} /></div>
          <div className="chart-panel"><div className="skeleton-box" style={{ height: '280px' }} /></div>
        </div>
      </section>
    );
  }

  if (!metrics || !dashboardSummary) {
    return (
      <EmptyState
        title="Dashboard indisponível"
        description="Não foi possível carregar as métricas do sistema no momento."
      />
    );
  }

  const pieData = metrics.cargaHorariaPorDisciplina.map((item, index) => ({
    name: item.nome ?? 'Disciplina',
    value: item.horas ?? 0,
    fill: chartColors[index % chartColors.length],
  }));

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h3>Dashboard acadêmico</h3>
        </div>
      </div>

      <div className="stats-grid">
        {summaryCards.map((card) => (
          <article key={card.key} className={`stat-card ${card.accent}`}>
            <span>{card.label}</span>
            <strong>{dashboardSummary[card.key as keyof typeof dashboardSummary]}</strong>
          </article>
        ))}
      </div>

      <div className="chart-grid">
        <div className="chart-panel">
          <h4>Alunos por turma</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={metrics.alunosPorTurma}
              onMouseMove={(state) => {
                const nextIndex = typeof state?.activeTooltipIndex === 'number' ? state.activeTooltipIndex : Number(state?.activeTooltipIndex ?? -1);
                setActiveBarIndex(Number.isInteger(nextIndex) && nextIndex >= 0 ? nextIndex : null);
              }}
              onMouseLeave={() => setActiveBarIndex(null)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="turma" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(167, 139, 250, 0.12)' }}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  borderRadius: 12,
                  color: '#f8fafc',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {metrics.alunosPorTurma.map((entry, index) => (
                  <Cell
                    key={`${entry.turma}-${index}`}
                    fill={activeBarIndex === index ? '#a78bfa' : '#8b5cf6'}
                    stroke={activeBarIndex === index ? '#d8b4fe' : 'transparent'}
                    strokeWidth={activeBarIndex === index ? 1 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-panel">
          <h4>Carga horária por disciplina</h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                {pieData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${Number(value ?? 0)}h`, 'Carga']}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  borderRadius: 12,
                  color: '#f8fafc',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {pieData.map((entry, index) => (
              <div key={`${entry.name}-${index}`} className="chart-legend-item">
                <span className="chart-swatch" style={{ background: entry.fill }} />
                <span className="chart-legend-label">{entry.name}</span>
                <strong>{entry.value}h</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfessorGradesDashboard() {
  const gradeQuery = useQuery({
    queryKey: ['grade-metrics'],
    queryFn: async () => {
      const metrics = await fetchGradeMetrics();
      if (!('mediaPorTurma' in metrics)) throw new Error('Professor grade metrics were not returned.');
      return metrics as ProfessorGradeMetrics;
    },
  });

  if (gradeQuery.isLoading) return <div className="panel-card"><p>Carregando desempenho...</p></div>;
  if (gradeQuery.isError || !gradeQuery.data) {
    return <EmptyState title="Desempenho indisponível" description="Não foi possível carregar as médias da sua disciplina." />;
  }

  const { mediaPorAluno, mediaPorTurma } = gradeQuery.data;
  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Área do professor</p><h3>Desempenho da disciplina</h3></div></div>
      <div className="grade-summary-row">
        <article className="grade-summary"><span>Turmas avaliadas</span><strong>{mediaPorTurma.length}</strong></article>
        <article className="grade-summary"><span>Alunos avaliados</span><strong>{mediaPorAluno.length}</strong></article>
        <article className="grade-summary"><span>Média geral</span><strong>{mediaPorAluno.length ? (mediaPorAluno.reduce((sum, item) => sum + item.media, 0) / mediaPorAluno.length).toFixed(1) : '—'}</strong></article>
      </div>
      <div className="chart-grid grade-chart-grid">
        <div className="chart-panel">
          <h4>Desempenho por Turma</h4>
          {mediaPorTurma.length ? (
            <div className="polar-chart-wrap">
              <PolarArea
                data={createPolarGradeData(mediaPorTurma.map((item) => `Turma ${item.turma}`), mediaPorTurma.map((item) => item.media))}
                options={gradePolarOptions}
              />
            </div>
          ) : <EmptyState title="Sem notas por turma" description="As médias aparecerão após as primeiras correções." />}
        </div>
        <div className="chart-panel">
          <h4>Notas dos Alunos</h4>
          {mediaPorAluno.length ? (
            <div className="polar-chart-wrap">
              <PolarArea
                data={createPolarGradeData(mediaPorAluno.map((item) => item.aluno), mediaPorAluno.map((item) => item.media))}
                options={gradePolarOptions}
              />
            </div>
          ) : <EmptyState title="Sem notas de alunos" description="As médias individuais aparecerão após as primeiras correções." />}
        </div>
      </div>
    </section>
  );
}

function StudentGradesDashboard() {
  const gradeQuery = useQuery({
    queryKey: ['grade-metrics'],
    queryFn: async () => {
      const metrics = await fetchGradeMetrics();
      if (!('mediaPorDisciplina' in metrics)) throw new Error('Student grade metrics were not returned.');
      return metrics as StudentGradeMetrics;
    },
  });

  if (gradeQuery.isLoading) return <div className="panel-card"><p>Carregando seu desempenho...</p></div>;
  if (gradeQuery.isError || !gradeQuery.data) {
    return <EmptyState title="Desempenho indisponível" description="Não foi possível carregar suas médias por disciplina." />;
  }

  const subjects = gradeQuery.data.mediaPorDisciplina;
  const average = subjects.length ? subjects.reduce((sum, item) => sum + item.media, 0) / subjects.length : null;
  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Área do aluno</p><h3>Meu Desempenho Geral</h3></div></div>
      <div className="grade-summary-row">
        <article className="grade-summary"><span>Disciplinas avaliadas</span><strong>{subjects.length}</strong></article>
        <article className="grade-summary"><span>Média geral</span><strong>{average === null ? '—' : average.toFixed(1)}</strong></article>
      </div>
      <div className="chart-panel student-grade-panel">
        <h4>Desempenho por disciplina</h4>
        {subjects.length ? (
          <div className="polar-chart-wrap student-polar-chart">
            <PolarArea
              data={createPolarGradeData(subjects.map((item) => item.disciplina), subjects.map((item) => item.media))}
              options={gradePolarOptions}
            />
          </div>
        ) : <EmptyState title="Ainda sem notas" description="Suas médias aparecerão aqui quando suas atividades forem corrigidas." />}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const { role } = useAuth();
  if (role === 'PROFESSOR') return <ProfessorGradesDashboard />;
  if (role === 'ALUNO') return <StudentGradesDashboard />;
  return <AdminDashboardPage />;
}
