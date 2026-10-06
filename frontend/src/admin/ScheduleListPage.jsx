import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { useAuth } from './useAuth.js';
import { addDays, formatWeek, mondayOf, todayDateOnly } from './format.js';
import { Card, CardHeader, Loading, Notice, StatusBadge, buttonStyles, inputStyles } from './ui.jsx';

export function ScheduleListPage() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const thisMonday = mondayOf(todayDateOnly());
  const [schedules, setSchedules] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [weekStart, setWeekStart] = useState(addDays(thisMonday, 7));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/schedules', { signal: controller.signal })
      .then(({ data }) => setSchedules(data.data))
      .catch((failure) => { if (!controller.signal.aborted) setLoadError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);

  async function create(event) {
    event.preventDefault();
    const monday = mondayOf(weekStart);
    setSaving(true);
    setFormError('');
    try {
      const { data } = await api.post('/admin/schedules', { weekStart: monday });
      navigate(`/admin/agenda/${data.data.id}`);
    } catch (failure) {
      setFormError(apiErrorMessage(failure));
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight sm:mb-8 sm:text-4xl">Agenda <span className="text-neutral-400">semanal</span></h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="self-start">
          <CardHeader title="Nueva semana" subtitle="Se crean los 7 días como borrador" />
          <form onSubmit={create} className="space-y-4">
            <div>
              <label htmlFor="week-start" className="mb-1.5 block text-sm font-medium">Cualquier día de la semana</label>
              <input id="week-start" type="date" className={inputStyles} value={weekStart} min={thisMonday} onChange={(event) => setWeekStart(event.target.value)} disabled={!canEdit} required />
              {weekStart && <p className="mt-2 text-xs text-neutral-500">Semana: {formatWeek(mondayOf(weekStart), addDays(mondayOf(weekStart), 6))}</p>}
            </div>
            {formError && <Notice>{formError}</Notice>}
            <button type="submit" className={`${buttonStyles.primary} w-full`} disabled={!canEdit || saving || !weekStart}>
              <Plus className="size-4" aria-hidden="true" /> {saving ? 'Creando…' : 'Crear semana'}
            </button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Semanas creadas" subtitle="Abre una semana para configurar horarios y publicar días" />
          {loadError && <Notice>{loadError}</Notice>}
          {!loadError && !schedules && <Loading />}
          {schedules?.length === 0 && <p className="py-10 text-center text-sm text-neutral-500">Todavía no hay semanas creadas.</p>}
          {schedules?.length > 0 && (
            <ul className="space-y-2">
              {schedules.map((schedule) => {
                const published = schedule.days.filter((day) => day.status === 'PUBLISHED').length;
                const slots = schedule.days.reduce((total, day) => total + day.slotCount, 0);
                return (
                  <li key={schedule.id}>
                    <Link to={`/admin/agenda/${schedule.id}`} className="flex items-center gap-3 rounded-3xl bg-neutral-50 p-4 transition hover:bg-neutral-100">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{formatWeek(schedule.weekStart, schedule.weekEnd)}</p>
                        <p className="mt-1 text-xs text-neutral-500">{published} de 7 días publicados · {slots} horarios</p>
                      </div>
                      <StatusBadge status={published ? 'PUBLISHED' : 'DRAFT'} />
                      <ArrowUpRight className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
