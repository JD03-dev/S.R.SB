import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { FutureFeatureCard } from '../components/FutureFeatureCard.jsx';
import { currentSchedule, formatWeek } from './format.js';
import { Notice, buttonStyles } from './ui.jsx';
import { useAuth } from './useAuth.js';

const PREVIEW_STATS = ['Confirmadas', 'Canceladas', 'Atendidas', 'En lista de espera'];

export function DashboardPage() {
  const { admin } = useAuth();
  const [schedules, setSchedules] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/schedules', { signal: controller.signal })
      .then(({ data }) => setSchedules(data.data))
      .catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);

  const schedule = schedules ? currentSchedule(schedules) : null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Bienvenido de nuevo, <span className="text-neutral-400">{admin?.name || 'Invitado'}</span></h1>
        <div className="flex flex-wrap gap-2">
          {schedule && (
            <Link to={`/admin/agenda/${schedule.id}`} className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm transition hover:bg-neutral-50" title="Abrir semana actual">
              <CalendarDays className="size-4" aria-hidden="true" /> {formatWeek(schedule.weekStart, schedule.weekEnd)}
            </Link>
          )}
          {schedules && !schedule && (
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm text-neutral-500">
              <CalendarDays className="size-4" aria-hidden="true" /> Sin semanas creadas
            </span>
          )}
          <Link to="/admin/agenda" className={buttonStyles.secondary}><Plus className="size-4" aria-hidden="true" /> Nueva semana</Link>
        </div>
      </div>

      {error && <div className="mb-4"><Notice>{error}</Notice></div>}

      <FutureFeatureCard
        number={4}
        icon={BarChart3}
        title="Control y seguimiento de reservas"
        description="Este panel mostrará el estado de tu agenda y el seguimiento de las reservas."
        items={[
          'Reservas confirmadas, canceladas y atendidas',
          'Personas en lista de espera',
          'Indicadores básicos del comportamiento de las reservas',
          'Consulta del estado de la agenda semanal',
        ]}
      />

      <div className="mt-4 grid grid-cols-2 gap-3 opacity-60 lg:grid-cols-4" aria-hidden="true">
        {PREVIEW_STATS.map((label) => (
          <div key={label} className="rounded-[24px] bg-surface p-5">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-300">—</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-40 items-end gap-2 rounded-[24px] bg-surface p-5 opacity-60" aria-hidden="true">
        {[40, 70, 55, 90, 65, 80, 50].map((height, index) => (
          <div key={index} className="flex-1 rounded-t-2xl rounded-b-md bg-brand/15" style={{ height: `${height}%` }} />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-neutral-400">Vista previa ilustrativa: aún no muestra datos reales.</p>
    </div>
  );
}
