import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Database, LoaderCircle, UserPlus } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { useAuth } from './useAuth.js';
import { Notice, buttonStyles, inputStyles } from './ui.jsx';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/auth/status', { signal: controller.signal })
      .then(({ data }) => setStatus(data.data))
      .catch(() => { if (!controller.signal.aborted) setStatus({ databaseAvailable: false }); });
    return () => controller.abort();
  }, []);

  if (session) return <Navigate to="/admin" replace />;

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', status.databaseAvailable ? form : {});
      signIn(data.data);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (failure) {
      setError(failure.response ? apiErrorMessage(failure) : 'No hay conexión con el servidor. Verifica que la API esté iniciada.');
    } finally {
      setSubmitting(false);
    }
  }

  const update = (field) => (event) => setForm((value) => ({ ...value, [field]: event.target.value }));
  const offline = status?.databaseAvailable === false;
  const needsAccount = status?.databaseAvailable && !status.hasAccounts;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><BrandLogo subtitle="Panel de administración" /></div>

        <div className="rounded-[32px] bg-surface p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight">Iniciar <span className="text-neutral-400">sesión</span></h1>

          {!status && (
            <p className="mt-6 flex items-center gap-2 text-sm text-neutral-500" role="status"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Comprobando conexión…</p>
          )}

          {needsAccount && (
            <div className="mt-6 space-y-4">
              <Notice tone="warning">
                <p className="font-medium">Todavía no hay una cuenta de administrador</p>
                <p className="mt-1">Crea tu cuenta para poder iniciar sesión.</p>
              </Notice>
              <Link to="/admin/cuenta" className={`${buttonStyles.primary} w-full py-3`}><UserPlus className="size-4" aria-hidden="true" /> Crear mi cuenta</Link>
            </div>
          )}

          {(offline || status?.hasAccounts) && (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {offline && (
                <Notice tone="warning">
                  <p className="font-medium">Sin conexión con la base de datos</p>
                  <p className="mt-1">Puedes entrar sin usuario ni contraseña para ver el panel en modo solo lectura.</p>
                </Notice>
              )}
              {!offline && (
                <>
                  <div>
                    <label htmlFor="username" className="mb-1.5 block text-sm font-medium">Usuario o correo</label>
                    <input id="username" className={inputStyles} value={form.username} onChange={update('username')} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
                  </div>
                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Contraseña</label>
                    <input id="password" type="password" className={inputStyles} value={form.password} onChange={update('password')} autoComplete="current-password" required />
                  </div>
                </>
              )}

              {error && <Notice>{error}</Notice>}

              <button type="submit" className={`${buttonStyles.primary} w-full py-3`} disabled={submitting}>
                {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : offline ? <Database className="size-4" aria-hidden="true" /> : null}
                {offline ? 'Entrar sin usuario' : 'Iniciar sesión'}
                {!submitting && <ArrowRight className="size-4" aria-hidden="true" />}
              </button>
              {!offline && (
                <p className="text-center text-sm"><Link to="/admin/cuenta" className="text-brand-strong hover:underline">¿Olvidaste tus datos o quieres cambiarlos?</Link></p>
              )}
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-neutral-500"><Link to="/" className="hover:text-ink">Volver a reservas</Link></p>
      </div>
    </div>
  );
}
