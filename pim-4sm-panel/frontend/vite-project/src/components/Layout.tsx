import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { searchGlobal } from '@/lib/api';
import type { UserRole } from '@/types/entities';

const navItems: Record<UserRole, Array<{ to: string; label: string }>> = {
  ADMIN: [
    { to: '/', label: 'Dashboard' },
    { to: '/disciplinas', label: 'Disciplinas' },
    { to: '/turmas', label: 'Turmas' },
    { to: '/professores', label: 'Professores' },
    { to: '/alunos', label: 'Alunos' },
  ],
  PROFESSOR: [
    { to: '/', label: 'Desempenho' },
    { to: '/professor/disciplina', label: 'Minha Disciplina' },
    { to: '/professor/alunos', label: 'Meus Alunos' },
    { to: '/atividades/nova', label: 'Nova Atividade' },
    { to: '/avaliacoes', label: 'Correções pendentes' },
  ],
  ALUNO: [
    { to: '/', label: 'Meu Desempenho' },
    { to: '/aluno/perfil', label: 'Meu Perfil' },
    { to: '/aluno/disciplinas', label: 'Minhas Disciplinas' },
    { to: '/atividades', label: 'Atividades' },
  ],
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  ALUNO: 'Aluno',
};

const entityLabels: Record<string, string> = {
  alunos: 'Alunos',
  professores: 'Professores',
  disciplinas: 'Disciplinas',
  turmas: 'Turmas',
};

const mobileViewportQuery = '(max-width: 640px)';

function subscribeToMobileViewport(onChange: () => void) {
  const mediaQuery = window.matchMedia(mobileViewportQuery);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getIsMobileViewport() {
  return window.matchMedia(mobileViewportQuery).matches;
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isMobile = useSyncExternalStore(subscribeToMobileViewport, getIsMobileViewport, () => false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const collapsed = isMobile ? !mobileMenuOpen : desktopCollapsed;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, Array<{ id: number; nome: string }>>>({
    alunos: [],
    professores: [],
    disciplinas: [],
    turmas: [],
  });
  const [loadingSearch, setLoadingSearch] = useState(false);

  const hasResults = useMemo(
    () => Object.values(results).some((group) => group.length > 0),
    [results],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const nextQuery = query.trim();

    if (!nextQuery) {
      setResults({ alunos: [], professores: [], disciplinas: [], turmas: [] });
      setLoadingSearch(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const response = await searchGlobal(nextQuery);
        setResults({
          alunos: response.alunos.map((item) => ({ id: item.id, nome: item.nome })),
          professores: response.professores.map((item) => ({ id: item.id, nome: item.nome })),
          disciplinas: response.disciplinas.map((item) => ({ id: item.id, nome: item.nome })),
          turmas: response.turmas.map((item) => ({ id: item.id, nome: item.nome })),
        });
      } catch {
        setResults({ alunos: [], professores: [], disciplinas: [], turmas: [] });
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (entity: string) => {
    const map: Record<string, string> = {
      alunos: '/alunos',
      professores: '/professores',
      disciplinas: '/disciplinas',
      turmas: '/turmas',
    };

    navigate(map[entity] ?? '/');
    setQuery('');
    setResults({ alunos: [], professores: [], disciplinas: [], turmas: [] });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-head">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => {
              if (isMobile) {
                setMobileMenuOpen((open) => !open);
              } else {
                setDesktopCollapsed((value) => !value);
              }
            }}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            aria-controls="main-navigation"
          >
            {isMobile
              ? collapsed ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />
              : collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
          </button>
          {(!collapsed || isMobile) && (
            <div className="brand-block">
              <div className="brand-mark" aria-hidden="true">
                <span>SC</span>
              </div>
              <div>
                <p className="eyebrow">Siscol</p>
                <h1>PIM</h1>
              </div>
            </div>
          )}
        </div>

        <nav id="main-navigation" className="sidebar-nav" aria-label="Main navigation">
          {(role ? navItems[role] : []).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              title={item.label}
            >
              <span className="nav-dot" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left"><span className="role-badge">{role ? roleLabels[role] : ''}</span></div>

          {role === 'ADMIN' && <div className="search-shell">
            <div className="search-input-wrap">
              <Search className="search-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar alunos, professores, turmas..."
                aria-label="Busca global"
              />
              <kbd>⌘K</kbd>
            </div>

            {query.trim() && (
              <div className="search-results" role="listbox">
                {loadingSearch ? (
                  <div className="search-loading">Buscando...</div>
                ) : hasResults ? (
                  Object.entries(results).map(([entity, items]) => {
                    if (!items.length) {
                      return null;
                    }

                    return (
                      <div key={entity} className="search-group">
                        <span className="search-group-label">{entityLabels[entity]}</span>
                        {items.map((item) => (
                          <button
                            key={`${entity}-${item.id}`}
                            type="button"
                            className="search-result-item"
                            onClick={() => handleSelectResult(entity)}
                          >
                            <span>{item.nome}</span>
                            <small>{entityLabels[entity]}</small>
                          </button>
                        ))}
                      </div>
                    );
                  })
                ) : (
                  <div className="search-empty">Nenhum resultado encontrado.</div>
                )}
              </div>
            )}
          </div>}
          <button type="button" className="secondary-button logout-button" onClick={handleLogout}>Sair</button>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
