import { useEffect, useState } from 'react';
import { Check, KeyRound, LoaderCircle, UserPlus } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { ProfileFields } from './ProfileFields.jsx';
import { emptyProfile, passwordMismatch, profilePayload } from './profileForm.js';
import { RecoveryCodeNotice } from './RecoveryCodeNotice.jsx';
import { useAuth } from './useAuth.js';
import { Card, CardHeader, Loading, Notice, buttonStyles, inputStyles } from './ui.jsx';

function CurrentPasswordField({ id, value, onChange, disabled }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">Contraseña actual</label>
      <input id={id} type="password" className={inputStyles} value={value} onChange={(event) => onChange(event.target.value)} autoComplete="current-password" disabled={disabled} required />
      <p className="mt-1 text-xs text-neutral-500">Necesaria para confirmar cualquier cambio.</p>
    </div>
  );
}

// Content of the "Mi cuenta" modal opened from the avatar menu.
export function MyAccountForm() {
  const { admin, canEdit, updateAdmin } = useAuth();
  const [form, setForm] = useState({ ...emptyProfile, name: admin?.name || '', email: admin?.email || '', username: admin?.username || '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  if (!admin) return <Notice tone="warning">No disponible en modo solo lectura.</Notice>;

  async function save(event) {
    event.preventDefault();
    const mismatch = passwordMismatch(form);
    if (mismatch) return setError(mismatch);
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const { data } = await api.put('/admin/me', { ...profilePayload(form), currentPassword });
      updateAdmin(data.data);
      setForm({ ...emptyProfile, name: data.data.name, email: data.data.email, username: data.data.username });
      setCurrentPassword('');
      setSaved(true);
    } catch (failure) {
      setError(apiErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function newCode() {
    if (!currentPassword) return setError('Escribe tu contraseña actual para generar un nuevo código.');
    if (!window.confirm('El código de recuperación anterior dejará de funcionar. ¿Continuar?')) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/admin/me/recovery-code', { currentPassword });
      setRecoveryCode(data.data.recoveryCode);
      setCurrentPassword('');
    } catch (failure) {
      setError(apiErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-xs text-neutral-500">Sesión iniciada como @{admin.username}{admin.role === 'OWNER' ? ' · cuenta principal' : ''}</p>
      <ProfileFields form={form} onChange={(value) => { setSaved(false); setForm(value); }} idPrefix="me" passwordLabel="Nueva contraseña (opcional)" passwordRequired={false} disabled={!canEdit} />
      <CurrentPasswordField id="me-current" value={currentPassword} onChange={setCurrentPassword} disabled={!canEdit} />
      {error && <Notice>{error}</Notice>}
      {saved && <p className="flex items-center gap-2 text-sm text-brand-strong" role="status"><Check className="size-4" aria-hidden="true" /> Datos actualizados</p>}
      {recoveryCode && <RecoveryCodeNotice code={recoveryCode} title="Tu nuevo código de recuperación" />}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={buttonStyles.primary} disabled={!canEdit || busy}>
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />} Guardar mis datos
        </button>
        <button type="button" className={buttonStyles.soft} onClick={newCode} disabled={!canEdit || busy}>
          <KeyRound className="size-4" aria-hidden="true" /> Nuevo código de recuperación
        </button>
      </div>
    </form>
  );
}

function CreateAdminForm({ onCreated }) {
  const [form, setForm] = useState(emptyProfile);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(event) {
    event.preventDefault();
    const mismatch = passwordMismatch(form);
    if (mismatch) return setError(mismatch);
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/admin/accounts', profilePayload(form));
      onCreated(data.data);
    } catch (failure) {
      setError(apiErrorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="space-y-4">
      <ProfileFields form={form} onChange={setForm} idPrefix="new-admin" passwordLabel="Contraseña inicial" />
      {error && <Notice>{error}</Notice>}
      <button type="submit" className={`${buttonStyles.primary} w-full`} disabled={busy}>
        {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />} Crear administrador
      </button>
    </form>
  );
}

export function AdminAccountsCard() {
  const { canEdit } = useAuth();
  const [admins, setAdmins] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/accounts', { signal: controller.signal })
      .then(({ data }) => setAdmins(data.data))
      .catch((failure) => { if (!controller.signal.aborted) setLoadError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);

  function handleCreated(result) {
    setAdmins((current) => [...(current || []), result.admin]);
    setModal({ type: 'code', admin: result.admin, code: result.recoveryCode, created: true });
  }

  async function newCodeFor(admin) {
    if (!window.confirm(`Se generará un nuevo código para @${admin.username} y el anterior dejará de funcionar. ¿Continuar?`)) return;
    setBusyId(admin.id);
    setRowError('');
    try {
      const { data } = await api.post(`/admin/accounts/${admin.id}/recovery-code`);
      setModal({ type: 'code', admin, code: data.data.recoveryCode, created: false });
    } catch (failure) {
      setRowError(apiErrorMessage(failure));
    } finally {
      setBusyId('');
    }
  }

  return (
    <Card>
      <CardHeader
        title="Administradores"
        subtitle="Cuentas que pueden gestionar la agenda. Solo una puede tener la sesión abierta a la vez."
        action={(
          <button type="button" className={buttonStyles.primary} onClick={() => setModal({ type: 'create' })} disabled={!canEdit}>
            <UserPlus className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Nueva cuenta</span>
          </button>
        )}
      />
      {loadError && <Notice>{loadError}</Notice>}
      {rowError && <div className="mb-3"><Notice>{rowError}</Notice></div>}
      {!loadError && !admins && <Loading />}
      {admins && (
        <ul className="space-y-2">
          {admins.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-3xl bg-neutral-50 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold uppercase text-white" aria-hidden="true">{item.name.charAt(0)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name} <span className="font-normal text-neutral-500">@{item.username}</span></p>
                <p className="truncate text-xs text-neutral-500">{item.email}</p>
              </div>
              {item.role === 'OWNER'
                ? <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] text-brand-strong">Principal</span>
                : (
                  <button type="button" className={buttonStyles.icon} onClick={() => newCodeFor(item)} disabled={!canEdit || busyId === item.id}
                    aria-label={`Nuevo código de recuperación para @${item.username}`} title="Nuevo código de recuperación">
                    {busyId === item.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <KeyRound className="size-4" aria-hidden="true" />}
                  </button>
                )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={modal?.type === 'create'} onClose={() => setModal(null)} title="Nueva cuenta de administrador" description="Podrá gestionar la agenda y editar sus propios datos.">
        <CreateAdminForm onCreated={handleCreated} />
      </Modal>

      <Modal
        open={modal?.type === 'code'}
        onClose={() => setModal(null)}
        title={modal?.created ? `Cuenta de @${modal?.admin.username} creada` : `Nuevo código para @${modal?.admin?.username}`}
        description={modal?.created ? undefined : 'El código anterior de esta cuenta ya no funciona.'}
      >
        {modal?.code && (
          <div className="space-y-4">
            <RecoveryCodeNotice code={modal.code} title={`Entrega este código a ${modal.admin.name}`} />
            <button type="button" className={`${buttonStyles.secondary} w-full`} onClick={() => setModal(null)}>Listo, ya lo guardé</button>
          </div>
        )}
      </Modal>
    </Card>
  );
}
