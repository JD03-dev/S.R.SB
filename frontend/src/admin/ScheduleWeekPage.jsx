import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Check, ListOrdered, LoaderCircle, Pencil, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { FutureFeatureCard } from '../components/FutureFeatureCard.jsx';
import { useAuth } from './useAuth.js';
import { formatDate, formatTime, formatWeek, todayDateOnly } from './format.js';
import { ShareCard } from './ShareCard.jsx';
import { Card, CardHeader, Loading, Notice, StatusBadge, buttonStyles, inputStyles } from './ui.jsx';

export function ScheduleWeekPage() {
  const { scheduleId } = useParams();
  const { canEdit } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [business, setBusiness] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get(`/admin/schedules/${scheduleId}`, { signal: controller.signal }),
      api.get('/admin/business', { signal: controller.signal }),
    ]).then(([scheduleResponse, businessResponse]) => {
      const loaded = scheduleResponse.data.data;
      setSchedule(loaded);
      setBusiness(businessResponse.data.data);
      const today = todayDateOnly();
      setSelectedId((loaded.days.find((day) => day.date >= today) || loaded.days[0])?.id);
    }).catch((failure) => { if (!controller.signal.aborted) setLoadError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [scheduleId]);

  async function run(request, applyResult) {
    setBusy(true);
    setActionError('');
    try {
      const { data } = await request();
      applyResult(data.data);
      return true;
    } catch (failure) {
      setActionError(apiErrorMessage(failure));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const replaceDay = (day) => setSchedule((current) => ({
    ...current, days: current.days.map((item) => (item.id === day.id ? day : item)),
  }));

  if (loadError) return <Notice>{loadError}</Notice>;
  if (!schedule || !business) return <Loading />;

  const today = todayDateOnly();
  const day = schedule.days.find((item) => item.id === selectedId) || schedule.days[0];
  const editable = canEdit && day.date >= today;
  const publishable = schedule.days.filter((item) => item.status !== 'PUBLISHED' && item.date >= today && item.slots.some((slot) => !slot.isBlocked));
  const hasPublished = schedule.days.some((item) => item.status === 'PUBLISHED');

  const setStatus = (dayIds, status) => run(
    () => api.patch(`/admin/schedules/${schedule.id}/days`, { dayIds, status }),
    setSchedule,
  );

  return (
    <div>
      <Link to="/admin/agenda" className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" /> Semanas</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Semana <span className="text-neutral-400">{formatWeek(schedule.weekStart, schedule.weekEnd)}</span></h1>
        <button type="button" className={buttonStyles.primary} disabled={!canEdit || busy || publishable.length === 0} onClick={() => setStatus(publishable.map((item) => item.id), 'PUBLISHED')}>
          <Check className="size-4" aria-hidden="true" /> Publicar días con horarios ({publishable.length})
        </button>
      </div>

      <div className="-mx-3 mb-4 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2 rounded-full bg-surface p-1.5 sm:min-w-0" role="tablist" aria-label="Días de la semana">
          {schedule.days.map((item) => {
            const active = item.id === day.id;
            const dot = { PUBLISHED: 'bg-brand', DRAFT: 'bg-amber-400', DISABLED: 'bg-neutral-300' }[item.status];
            return (
              <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => { setSelectedId(item.id); setActionError(''); }}
                className={`flex flex-1 flex-col items-center rounded-full px-4 py-2 text-xs transition ${active ? 'bg-brand text-white' : 'text-neutral-600 hover:bg-neutral-100'} ${item.date < today ? 'opacity-50' : ''}`}>
                <span className="uppercase">{formatDate(item.date, { weekday: 'short' }).replace('.', '')}</span>
                <span className="text-base font-semibold">{formatDate(item.date, { day: 'numeric' })}</span>
                <span className={`mt-0.5 size-1.5 rounded-full ${active ? 'bg-surface' : dot}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {actionError && <div className="mb-4"><Notice>{actionError}</Notice></div>}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold first-letter:uppercase">{formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <div className="mt-2 flex items-center gap-2"><StatusBadge status={day.status} />{day.date < today && <span className="text-xs text-neutral-500">Día pasado</span>}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {day.status !== 'PUBLISHED' && <button type="button" className={buttonStyles.primary} disabled={!editable || busy} onClick={() => setStatus([day.id], 'PUBLISHED')}>Publicar</button>}
                {day.status !== 'DRAFT' && <button type="button" className={buttonStyles.soft} disabled={!editable || busy} onClick={() => setStatus([day.id], 'DRAFT')}>Pasar a borrador</button>}
                {day.status !== 'DISABLED' && <button type="button" className={buttonStyles.soft} disabled={!editable || busy} onClick={() => setStatus([day.id], 'DISABLED')}>Deshabilitar</button>}
              </div>
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              {day.status === 'PUBLISHED' ? 'Los clientes ven los horarios disponibles de este día.' : 'Este día no es visible para los clientes.'}
            </p>
          </Card>

          <SlotList key={day.id} day={day} editable={editable} busy={busy} run={run} onDay={replaceDay} />
        </div>

        <div className="grid content-start gap-4">
          <GenerateForm key={day.id} day={day} business={business} editable={editable} busy={busy} run={run} onDay={replaceDay} />
          {hasPublished
            ? <ShareCard schedule={schedule} />
            : <Card><CardHeader title="Compartir" subtitle="Publica al menos un día para generar el QR" /></Card>}
          <FutureFeatureCard
            number={3}
            icon={ListOrdered}
            title="Lista de espera y recuperación de cupos"
            description="Aquí verás quién espera un horario de este día y podrás asignar los cupos liberados."
            items={[
              'Aviso cuando se cancela una reserva',
              'Elegir a quién dar el cupo',
              'O dejar que el sistema lo ofrezca al siguiente en la lista',
              'Plazo para que el cliente acepte el cupo',
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function GenerateForm({ day, business, editable, busy, run, onDay }) {
  const [form, setForm] = useState({
    openingTime: business.openingTime,
    closingTime: business.closingTime,
    breakStart: business.breakStart || '',
    breakEnd: business.breakEnd || '',
    serviceDurationMinutes: business.serviceDurationMinutes,
  });
  const update = (field) => (event) => setForm((value) => ({ ...value, [field]: event.target.value }));

  function submit(event) {
    event.preventDefault();
    if (day.slots.length > 0 && !window.confirm('Se reemplazarán los horarios actuales de este día. ¿Continuar?')) return;
    run(() => api.post(`/admin/days/${day.id}/slots/generate`, {
      ...form,
      breakStart: form.breakStart || null,
      breakEnd: form.breakEnd || null,
      serviceDurationMinutes: Number(form.serviceDurationMinutes),
    }), onDay);
  }

  const field = (id, label, key, type = 'time') => (
    <div>
      <label htmlFor={`${id}-${day.id}`} className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      <input id={`${id}-${day.id}`} type={type} min={type === 'number' ? 5 : undefined} max={type === 'number' ? 480 : undefined} className={inputStyles} value={form[key]} onChange={update(key)} disabled={!editable} required={!key.startsWith('break')} />
    </div>
  );

  return (
    <Card>
      <CardHeader title="Generar horarios" subtitle="Usa tu horario habitual o ajústalo para este día" />
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {field('open', 'Apertura', 'openingTime')}
          {field('close', 'Cierre', 'closingTime')}
          {field('break-start', 'Inicio descanso', 'breakStart')}
          {field('break-end', 'Fin descanso', 'breakEnd')}
        </div>
        {field('duration', 'Duración del servicio (minutos)', 'serviceDurationMinutes', 'number')}
        <button type="submit" className={`${buttonStyles.primary} w-full`} disabled={!editable || busy}>
          <Sparkles className="size-4" aria-hidden="true" /> Generar horarios
        </button>
      </form>
    </Card>
  );
}

function SlotList({ day, editable, busy, run, onDay }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ start: '', end: '' });
  const [newSlot, setNewSlot] = useState({ start: '', end: '' });

  function startEdit(slot) {
    setEditingId(slot.id);
    setDraft({ start: slot.start, end: slot.end });
  }

  async function saveEdit(slotId) {
    if (await run(() => api.patch(`/admin/slots/${slotId}`, draft), onDay)) setEditingId(null);
  }

  async function addSlot(event) {
    event.preventDefault();
    if (await run(() => api.post(`/admin/days/${day.id}/slots`, newSlot), onDay)) setNewSlot({ start: '', end: '' });
  }

  function remove(slot) {
    if (window.confirm(`¿Eliminar el horario de las ${formatTime(slot.start)}?`)) {
      run(() => api.delete(`/admin/slots/${slot.id}`), onDay);
    }
  }

  const available = day.slots.filter((slot) => !slot.isBlocked).length;

  return (
    <Card>
      <CardHeader title="Horarios" subtitle={`${available} disponibles · ${day.slots.length - available} bloqueados`} />
      {day.slots.length === 0 && <p className="rounded-3xl bg-neutral-50 py-8 text-center text-sm text-neutral-500">Este día no tiene horarios. Genéralos o agrégalos manualmente.</p>}

      <ul className="space-y-2">
        {day.slots.map((slot) => (
          <li key={slot.id} className={`flex flex-wrap items-center gap-2 rounded-3xl px-3 py-3 sm:px-4 ${slot.isBlocked ? 'bg-neutral-100' : 'bg-neutral-50'}`}>
            {editingId === slot.id ? (
              <>
                <div className="flex flex-1 items-center gap-2">
                  <input type="time" aria-label="Hora de inicio" className={`${inputStyles} py-2`} value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} />
                  <span className="text-neutral-400">–</span>
                  <input type="time" aria-label="Hora de fin" className={`${inputStyles} py-2`} value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} />
                </div>
                <div className="flex gap-1">
                  <button type="button" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-hover disabled:opacity-50 sm:size-10" disabled={busy} onClick={() => saveEdit(slot.id)} aria-label="Guardar"><Check className="size-4" /></button>
                  <button type="button" className={buttonStyles.icon} onClick={() => setEditingId(null)} aria-label="Cancelar"><X className="size-4" /></button>
                </div>
              </>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className={`whitespace-nowrap text-sm font-medium ${slot.isBlocked ? 'text-neutral-400 line-through' : ''}`}>{formatTime(slot.start)} – {formatTime(slot.end)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${slot.hasActiveReservation ? 'bg-sky-50 text-sky-700' : slot.isBlocked ? 'bg-surface text-neutral-500' : 'bg-brand-soft text-brand-strong'}`}>
                    {slot.hasActiveReservation ? 'Reservado' : slot.isBlocked ? 'Bloqueado' : 'Disponible'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button type="button" className={buttonStyles.icon} disabled={!editable || busy} onClick={() => startEdit(slot)} aria-label="Editar horario" title="Editar"><Pencil className="size-4" /></button>
                  <button type="button" className={buttonStyles.icon} disabled={!editable || busy} onClick={() => run(() => api.patch(`/admin/slots/${slot.id}`, { isBlocked: !slot.isBlocked }), onDay)} aria-label={slot.isBlocked ? 'Desbloquear horario' : 'Bloquear horario'} title={slot.isBlocked ? 'Desbloquear' : 'Bloquear'}>
                    {slot.isBlocked ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                  </button>
                  <button type="button" className={buttonStyles.icon} disabled={!editable || busy} onClick={() => remove(slot)} aria-label="Eliminar horario" title="Eliminar"><Trash2 className="size-4" /></button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={addSlot} className="mt-4 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-4">
        <div className="min-w-28 flex-1">
          <label htmlFor={`new-start-${day.id}`} className="mb-1 block text-xs font-medium text-neutral-600">Inicio</label>
          <input id={`new-start-${day.id}`} type="time" className={inputStyles} value={newSlot.start} onChange={(event) => setNewSlot({ ...newSlot, start: event.target.value })} disabled={!editable} required />
        </div>
        <div className="min-w-28 flex-1">
          <label htmlFor={`new-end-${day.id}`} className="mb-1 block text-xs font-medium text-neutral-600">Fin</label>
          <input id={`new-end-${day.id}`} type="time" className={inputStyles} value={newSlot.end} onChange={(event) => setNewSlot({ ...newSlot, end: event.target.value })} disabled={!editable} required />
        </div>
        <button type="submit" className={buttonStyles.secondary} disabled={!editable || busy}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />} Agregar
        </button>
      </form>
    </Card>
  );
}
