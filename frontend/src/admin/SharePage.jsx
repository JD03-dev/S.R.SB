import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { formatWeek, mondayOf, todayDateOnly } from './format.js';
import { ShareCard } from './ShareCard.jsx';
import { Card, Loading, Notice, buttonStyles } from './ui.jsx';

export function SharePage() {
  const [schedules, setSchedules] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/schedules', { signal: controller.signal })
      .then(({ data }) => {
        const thisMonday = mondayOf(todayDateOnly());
        const shareable = data.data.filter((schedule) => schedule.weekStart >= thisMonday && schedule.days.some((day) => day.status === 'PUBLISHED'));
        setSchedules(shareable);
        setSelectedId(shareable.at(-1)?.id || '');
      })
      .catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);

  const selected = schedules?.find((schedule) => schedule.id === selectedId);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight sm:mb-8 sm:text-4xl">Compartir <span className="text-neutral-400">agenda</span></h1>
      {error && <Notice>{error}</Notice>}
      {!error && !schedules && <Loading />}

      {schedules?.length === 0 && (
        <Card className="py-12 text-center">
          <QrCode className="mx-auto size-10 text-brand" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">No hay agendas publicadas</h2>
          <p className="mt-2 text-sm text-neutral-500">Publica al menos un día de una semana actual o futura para generar el QR.</p>
          <Link to="/admin/agenda" className={`${buttonStyles.primary} mt-6`}>Ir a la agenda</Link>
        </Card>
      )}

      {selected && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="self-start">
            <h2 className="text-base font-semibold">Semana a compartir</h2>
            <p className="mt-1 text-xs text-neutral-500">El QR abre solo esta semana. La página principal de reservas muestra todas las semanas publicadas.</p>
            <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Semana">
              {schedules.map((schedule) => (
                <button key={schedule.id} type="button" role="radio" aria-checked={schedule.id === selectedId} onClick={() => setSelectedId(schedule.id)}
                  className={`rounded-full px-4 py-2 text-sm transition ${schedule.id === selectedId ? 'bg-brand text-white' : 'bg-neutral-100 hover:bg-neutral-200'}`}>
                  {formatWeek(schedule.weekStart, schedule.weekEnd)}
                </button>
              ))}
            </div>
            <ol className="mt-6 space-y-3 text-sm text-neutral-600">
              <li><strong className="text-ink">1.</strong> Descarga el QR en PNG.</li>
              <li><strong className="text-ink">2.</strong> Súbelo a tu estado de WhatsApp.</li>
              <li><strong className="text-ink">3.</strong> Si publicas más días de esta semana, el mismo QR los mostrará.</li>
            </ol>
          </Card>
          <ShareCard schedule={selected} />
        </div>
      )}
    </div>
  );
}
