import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { useAuth } from './useAuth.js';
import { AdminAccountsCard } from './AccountSettings.jsx';
import { Card, CardHeader, Loading, Notice, buttonStyles, inputStyles } from './ui.jsx';

export function SettingsPage() {
  const { canEdit, isOwner } = useAuth();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/business', { signal: controller.signal })
      .then(({ data }) => setForm({ ...data.data, breakStart: data.data.breakStart || '', breakEnd: data.data.breakEnd || '' }))
      .catch((failure) => { if (!controller.signal.aborted) setLoadError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);

  const update = (field) => (event) => { setSaved(false); setForm((value) => ({ ...value, [field]: event.target.value })); };

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/admin/business', {
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        breakStart: form.breakStart || null,
        breakEnd: form.breakEnd || null,
        serviceDurationMinutes: Number(form.serviceDurationMinutes),
      });
      setForm({ ...data.data, breakStart: data.data.breakStart || '', breakEnd: data.data.breakEnd || '' });
      setSaved(true);
    } catch (failure) {
      setError(apiErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  const field = (id, label, key, type = 'time') => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <input id={id} type={type} min={type === 'number' ? 5 : undefined} max={type === 'number' ? 480 : undefined} className={inputStyles} value={form[key]} onChange={update(key)} disabled={!canEdit} required={!key.startsWith('break')} />
    </div>
  );

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight sm:mb-8 sm:text-4xl">Ajustes</h1>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          {loadError && <Notice>{loadError}</Notice>}
          {!loadError && !form && <Loading />}
          {form && (
            <Card>
              <CardHeader title="Horario de atención" subtitle="Valores por defecto al generar los horarios de cada día. No cambia los horarios ya creados." />
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('opening', 'Apertura', 'openingTime')}
                  {field('closing', 'Cierre', 'closingTime')}
                  {field('break-start', 'Inicio del almuerzo', 'breakStart')}
                  {field('break-end', 'Fin del almuerzo', 'breakEnd')}
                </div>
                {field('duration', 'Duración del servicio (minutos)', 'serviceDurationMinutes', 'number')}
                <p className="text-xs text-neutral-500">Zona horaria: {form.timezone}</p>
                {error && <Notice>{error}</Notice>}
                {saved && <p className="flex items-center gap-2 text-sm text-brand-strong" role="status"><Check className="size-4" aria-hidden="true" /> Cambios guardados</p>}
                <button type="submit" className={buttonStyles.primary} disabled={!canEdit || saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
              </form>
            </Card>
          )}
        </div>
        {isOwner && <AdminAccountsCard />}
      </div>
    </div>
  );
}
