import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { roleHomePath } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';

const loginSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(8).max(128),
});

export function LoginPage() {
  const { role, isAuthenticated, login, bootstrap } = useAuth();
  const navigate = useNavigate();
  const [isSetup, setIsSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && role) {
    return <Navigate to={roleHomePath[role]} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!loginSchema.safeParse({ username, password }).success) {
      setError('Username deve ter de 3 a 100 caracteres e senha de 8 a 128 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSetup) {
        await bootstrap(username, password);
        setIsSetup(false);
        setPassword('');
        setNotice('Administrador criado. Entre com suas credenciais.');
      } else {
        await login(username, password);
        const nextRole = sessionStorage.getItem('bestauth_role') as NonNullable<typeof role> | null;
        navigate(nextRole ? roleHomePath[nextRole] : '/login', { replace: true });
      }
    } catch {
      setError(isSetup ? 'Não foi possível criar o administrador. Verifique se o setup já foi concluído.' : 'Usuário ou senha inválidos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true"><span>SC</span></div>
          <div><p className="eyebrow">Siscol</p><h1>PIM</h1></div>
        </div>
        <p className="eyebrow">Acesso ao sistema</p>
        <h2>{isSetup ? 'Criar primeiro administrador' : 'Entrar na sua conta'}</h2>
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field" htmlFor="auth-username">
            <span>Username</span>
            <input id="auth-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={100} />
          </label>
          <label className="field" htmlFor="auth-password">
            <span>Password</span>
            <input id="auth-password" type="password" autoComplete={isSetup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Aguarde...' : isSetup ? 'Criar administrador' : 'Entrar'}
          </button>
        </form>
        <button type="button" className="auth-mode-toggle" onClick={() => { setIsSetup((value) => !value); setError(''); setNotice(''); }}>
          {isSetup ? 'Voltar ao login' : 'Configurar primeiro administrador'}
        </button>
      </section>
    </main>
  );
}