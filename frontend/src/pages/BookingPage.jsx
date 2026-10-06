import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarX2, Check, CheckCircle2, Copy, ListOrdered, LoaderCircle, RefreshCw } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { formatDate, formatTime, formatWeek } from '../admin/format.js';
import { Card, Loading, Notice, buttonStyles, inputStyles } from '../admin/ui.jsx';
import { FutureFeatureCard } from '../components/FutureFeatureCard.jsx';
import { Modal } from '../components/Modal.jsx';
import { ReservationSummary } from '../components/ReservationSummary.jsx';

const longDate = (date) => formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });

function firstAvailableDate(week) {
  return (week?.days.find((day) => day.slots.some((slot) => slot.available)) || week?.days[0])?.date ?? null;
}

export function BookingPage() {
  const { publicCode } = useParams();
  return <Booking key={publicCode || 'all'} publicCode={publicCode} />;
}

function Booking({ publicCode }) {
  const [availability, setAvailability] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const url = publicCode ? `/public/schedules/${encodeURIComponent(publicCode)}` : '/public/availability';
    api.get(url, { signal: controller.signal })
      .then(({ data }) => {
        setAvailability(data.data);
        setLoadError('');
      })
      .catch((failure) => { if (!controller.signal.aborted) setLoadError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [publicCode, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);

  function chooseWeek(week) {
    setSelectedWeek(week.weekStart);
    setSelectedDate(firstAvailableDate(week));
  }

  function handleSlotTaken(message) {
    setSelectedSlot(null);
    setNotice(message);
    refresh();
  }

  // Falls back to the first week/day when the selection no longer exists after a refresh.
  const weeks = availability?.weeks || [];
  const week = weeks.find((item) => item.weekStart === selectedWeek) || weeks[0];
  const day = week?.days.find((item) => item.date === selectedDate)
    || week?.days.find((item) => item.date === firstAvailableDate(week));
  const activeWeek = week?.weekStart;
  const activeDate = day?.date;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl">Reserva <span className="text-neutral-400">tu cita</span></h1>

      {loadError && (
        <Card className="text-center">
          <Notice>{loadError}</Notice>
          <button type="button" className={`${buttonStyles.secondary} mt-4`} onClick={refresh}>Intentar de nuevo</button>
        </Card>
      )}
      {!loadError && !availability && <Loading label="Buscando horarios…" />}

      {availability && weeks.length === 0 && (
        <Card className="py-12 text-center">
          <CalendarX2 className="mx-auto size-10 text-neutral-400" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">No hay horarios disponibles</h2>
          <p className="mt-2 text-sm text-neutral-500">Santiago aún no ha publicado nuevos horarios. Vuelve pronto.</p>
        </Card>
      )}

      {week && (
        <div className="space-y-4">
          {notice && <Notice>{notice}</Notice>}

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{weeks.length > 1 ? '1. Elige la semana y el día' : '1. Elige el día'}</h2>
              <button type="button" onClick={refresh} className="inline-flex size-9 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200" aria-label="Actualizar horarios" title="Actualizar">
                <RefreshCw className="size-4" aria-hidden="true" />
              </button>
            </div>

            {weeks.length > 1 && (
              <div className="-mx-5 mb-4 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                <div className="flex gap-2" role="radiogroup" aria-label="Semana">
                  {weeks.map((item) => {
                    const active = item.weekStart === activeWeek;
                    return (
                      <button key={item.weekStart} type="button" role="radio" aria-checked={active} onClick={() => chooseWeek(item)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${active ? 'bg-ink text-surface' : 'bg-neutral-100 hover:bg-neutral-200'}`}>
                        Semana del {formatWeek(item.weekStart, item.weekEnd)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
              <div className="flex gap-2" role="radiogroup" aria-label="Día">
                {week.days.map((item) => {
                  const free = item.slots.filter((slot) => slot.available).length;
                  const active = item.date === activeDate;
                  return (
                    <button key={item.date} type="button" role="radio" aria-checked={active} onClick={() => setSelectedDate(item.date)}
                      className={`flex min-w-20 shrink-0 flex-col items-center rounded-3xl px-4 py-3 transition ${active ? 'bg-brand text-white' : 'bg-neutral-100 hover:bg-neutral-200'}`}>
                      <span className="text-xs uppercase">{formatDate(item.date, { weekday: 'short' }).replace('.', '')}</span>
                      <span className="text-xl font-semibold">{formatDate(item.date, { day: 'numeric' })}</span>
                      <span className={`text-[11px] ${active ? 'text-white/80' : free ? 'text-brand-strong' : 'text-neutral-400'}`}>{free ? `${free} libres` : 'Lleno'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {day && (
            <Card>
              <h2 className="mb-4 text-base font-semibold">2. Elige la hora <span className="font-normal text-neutral-500">· <span className="inline-block first-letter:uppercase">{longDate(day.date)}</span></span></h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="list" aria-label="Horas">
                {day.slots.map((slot) => (
                  <button key={slot.id} type="button" disabled={!slot.available}
                    aria-label={`${formatTime(slot.start)}${slot.available ? ', reservar' : ', ocupado'}`}
                    onClick={() => { setNotice(''); setSelectedSlot(slot); }}
                    className={`rounded-2xl px-2 py-3 text-sm font-medium transition ${slot.available ? 'bg-brand-soft text-brand-strong hover:bg-brand/20' : 'cursor-not-allowed bg-neutral-100 text-neutral-400 line-through'}`}>
                    {formatTime(slot.start)}
                  </button>
                ))}
              </div>
              {!day.slots.some((slot) => slot.available) && <p className="mt-4 text-sm text-neutral-500">Este día está lleno. Prueba con otro día.</p>}
            </Card>
          )}

          {day && (
            <FutureFeatureCard
              number={3}
              icon={ListOrdered}
              title="Lista de espera"
              description="¿La hora que quieres está ocupada? Pronto podrás anotarte en la lista de espera y te ofreceremos el cupo si alguien cancela."
            />
          )}
        </div>
      )}

      {selectedSlot && day && (
        <BookingModal
          day={day}
          slot={selectedSlot}
          onClose={() => { setSelectedSlot(null); refresh(); }}
          onSlotTaken={handleSlotTaken}
        />
      )}
    </div>
  );
}

function BookingModal({ day, slot, onClose, onSlotTaken }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reservation, setReservation] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/public/reservations', { slotId: slot.id, ...form });
      setReservation(data.data);
    } catch (failure) {
      if (failure.response?.status === 409) return onSlotTaken(apiErrorMessage(failure));
      setError(apiErrorMessage(failure));
    } finally {
      setSubmitting(false);
    }
  }

  if (reservation) {
    return (
      <Modal open onClose={onClose} title="¡Reserva confirmada!">
        <Confirmation reservation={reservation} onDone={onClose} />
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Confirma tu reserva" description="Solo necesitamos tu nombre y tu celular.">
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-strong">
          <span className="inline-block first-letter:uppercase">{longDate(day.date)}</span> · {formatTime(slot.start)}
        </p>
        <div>
          <label htmlFor="booking-name" className="mb-1.5 block text-sm font-medium">Nombre</label>
          <input id="booking-name" className={inputStyles} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" minLength={2} maxLength={80} required autoFocus />
        </div>
        <div>
          <label htmlFor="booking-phone" className="mb-1.5 block text-sm font-medium">Celular</label>
          <input id="booking-phone" type="tel" inputMode="numeric" className={inputStyles} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel-national" placeholder="300 123 4567" required />
        </div>
        {error && <Notice>{error}</Notice>}
        <button type="submit" className={`${buttonStyles.primary} w-full py-3`} disabled={submitting}>
          {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
          {submitting ? 'Reservando…' : 'Confirmar reserva'}
        </button>
      </form>
    </Modal>
  );
}

function Confirmation({ reservation, onDone }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reservation.code);
      setCopied(true);
    } catch {
      window.prompt('Copia tu código:', reservation.code);
    }
  }

  return (
    <div>
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-brand" aria-hidden="true" />
        <p className="mt-2 text-sm text-neutral-500">Guarda tu código para consultar o cancelar tu reserva.</p>
      </div>
      <div className="mt-5"><ReservationSummary reservation={reservation} /></div>
      <div className="mt-4 grid gap-2">
        <button type="button" onClick={copy} className={buttonStyles.primary}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied ? 'Código copiado' : 'Copiar código'}
        </button>
        <Link to="/mi-reserva" state={{ code: reservation.code }} className={buttonStyles.secondary}>Ver mi reserva</Link>
        <button type="button" onClick={onDone} className={buttonStyles.soft}>Listo</button>
      </div>
    </div>
  );
}
