import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LoaderCircle } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { ProfileFields } from './ProfileFields.jsx';
import { emptyProfile, passwordMismatch, profilePayload } from './profileForm.js';
import { RecoveryCodeNotice } from './RecoveryCodeNotice.jsx';
import { Loading, Notice, buttonStyles, inputStyles } from './ui.jsx';

export function AccountPage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/auth/status', { signal: controller.signal })
      .then(({ data }) => setStatus(data.data))
      .catch(() => { if (!controller.signal.aborted) setStatus({ databaseAvailable: false }); });
    return () => controller.abort();
  }, []);

  return (
    <div className="flex min-h-screen justify-center bg-canvas px-4 py-10 text-ink">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center"><BrandLogo subtitle="Panel de administración" /></div>
        <div className="rounded-[32px] bg-surface p-6 sm:p-8">
          {!status && <Loading label="Comprobando…" />}
          {status && !status.databaseAvailable && (
            <Notice tone="warning">No hay conexión con la base de datos. Intenta de nuevo cuando esté disponible.</Notice>
          )}
          {status?.databaseAvailable && !status.hasAccounts && <RegisterForm />}
          {status?.databaseAvailable && status.hasAccounts && <UpdateAccount />}
        </div>
        <p className="mt-5 text-center text-sm text-neutral-500">
          <Link to="/admin/login" className="inline-flex items-center gap-1 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" /> Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}

function Done({ title, message, recoveryCode, codeTitle }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-brand" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{message}</p>
      </div>
      {recoveryCode && <RecoveryCodeNotice code={recoveryCode} title={codeTitle} />}
      <Link to="/admin/login" className={`${buttonStyles.primary} w-full py-3`}>Ir a iniciar sesión</Link>
    </div>
  );
}

function RegisterForm() {
  const [form, setForm] = useState(emptyProfile);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    const mismatch = passwordMismatch(form);
    if (mismatch) return setError(mismatch);
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', profilePayload(form));
      setResult(data.data);
    } catch (failure) {
      setError(apiErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return <Done title="¡Cuenta creada!" message={`Ya puedes iniciar sesión como @${result.admin.username}.`} recoveryCode={result.recoveryCode} />;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu <span className="text-neutral-400">cuenta</span></h1>
        <p className="mt-1 text-sm text-neutral-500">Aún no hay ninguna cuenta. Esta será la cuenta principal del negocio.</p>
      </div>
      <ProfileFields form={form} onChange={setForm} idPrefix="register" />
      {error && <Notice>{error}</Notice>}
      <button type="submit" className={`${buttonStyles.primary} w-full py-3`} disabled={saving}>
        {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />} Crear cuenta
      </button>
    </form>
  );
}

function UpdateAccount() {
  const [method, setMethod] = useState('password');
  const [credentials, setCredentials] = useState({ username: '', password: '', recoveryCode: '' });
  const [ticket, setTicket] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function verify(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = method === 'password'
        ? { method, username: credentials.username, password: credentials.password }
        : { method, recoveryCode: credentials.recoveryCode };
      const { data } = await api.post('/auth/account/verify', body);
      const { admin, changeToken } = data.data;
      setTicket({ changeToken, method });
      setForm({ ...emptyProfile, name: admin.name, email: admin.email, username: admin.username });
    } catch (failure) {
      setError(apiErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    const mismatch = passwordMismatch(form);
    if (mismatch) return setError(mismatch);
    setBusy(true);
    setError('');
    try {
      const { data } = await api.put('/auth/account', { changeToken: ticket.changeToken, ...profilePayload(form) });
      setResult(data.data);
    } catch (failure) {
      setError(apiErrorMessage(failure));
      if (/expir/i.test(apiErrorMessage(failure))) setTicket(null);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Done
        title="Datos actualizados"
        message={`Inicia sesión como @${result.admin.username}.${form.password ? ' Tu contraseña cambió y se cerró tu sesión activa.' : ''}`}
        recoveryCode={result.recoveryCode}
        codeTitle="Tu código anterior ya no sirve. Guarda este nuevo código"
      />
    );
  }

  if (ticket) {
    return (
      <form onSubmit={save} className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tus <span className="text-neutral-400">datos</span></h1>
          <p className="mt-1 text-sm text-neutral-500">Corrige lo que necesites. Deja la contraseña vacía para conservarla.</p>
        </div>
        <ProfileFields form={form} onChange={setForm} idPrefix="update" passwordLabel="Nueva contraseña" passwordRequired={false} />
        {error && <Notice>{error}</Notice>}
        <button type="submit" className={`${buttonStyles.primary} w-full py-3`} disabled={busy}>
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />} Guardar cambios
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Actualizar <span className="text-neutral-400">mis datos</span></h1>
        <p className="mt-1 text-sm text-neutral-500">Ya existe una cuenta. Primero confirma que eres tú.</p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-neutral-100 p-1" role="radiogroup" aria-label="Forma de verificación">
        {[['password', 'Sé mi contraseña'], ['recovery', 'La olvidé']].map(([value, label]) => (
          <button key={value} type="button" role="radio" aria-checked={method === value} onClick={() => { setMethod(value); setError(''); }}
            className={`rounded-full px-3 py-2 text-sm transition ${method === value ? 'bg-surface font-medium shadow-sm' : 'text-neutral-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {method === 'password' ? (
        <>
          <div>
            <label htmlFor="verify-user" className="mb-1.5 block text-sm font-medium">Usuario o correo</label>
            <input id="verify-user" className={inputStyles} value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} autoComplete="username" autoCapitalize="none" required />
          </div>
          <div>
            <label htmlFor="verify-password" className="mb-1.5 block text-sm font-medium">Contraseña actual</label>
            <input id="verify-password" type="password" className={inputStyles} value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} autoComplete="current-password" required />
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="verify-code" className="mb-1.5 block text-sm font-medium">Código de recuperación</label>
          <input id="verify-code" className={`${inputStyles} font-mono uppercase tracking-widest`} value={credentials.recoveryCode} onChange={(event) => setCredentials({ ...credentials, recoveryCode: event.target.value })} placeholder="XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} required />
          <p className="mt-1 text-xs text-neutral-500">Es el último código que guardaste: se muestra al crear la cuenta y cada vez que usas uno. Cada código sirve una sola vez. Si no lo tienes, pide a la cuenta principal que te cree una cuenta nueva.</p>
        </div>
      )}

      {error && <Notice>{error}</Notice>}
      <button type="submit" className={`${buttonStyles.primary} w-full py-3`} disabled={busy}>
        {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />} Continuar
      </button>
    </form>
  );
}
