import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LoaderCircle, Search, XCircle } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import { Card, Notice, buttonStyles, inputStyles } from '../admin/ui.jsx';
import { Modal } from '../components/Modal.jsx';
import { ReservationSummary } from '../components/ReservationSummary.jsx';

const METHODS = [['code', 'Con mi código'], ['phone', 'Con mi celular']];
const cancelButtonStyles = 'inline-flex items-center justify-center gap-2 rounded-full bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50';

export function MyReservationPage() {
  const location = useLocation();
  const initialCode = location.state?.code || '';
  const [method, setMethod] = useState('code');
  const [values, setValues] = useState({ code: initialCode, phone: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(Boolean(initialCode));
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelledId, setCancelledId] = useState('');

  async function search(body) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/public/reservations/lookup', body);
      setResult(data.data);
    } catch (failure) {
      setError(apiErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!initialCode) return;
    api.post('/public/reservations/lookup', { code: initialCode })
      .then(({ data }) => setResult(data.data))
      .catch((failure) => setError(apiErrorMessage(failure)))
      .finally(() => setBusy(false));
    // Runs once with the code passed from the booking confirmation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event) {
    event.preventDefault();
    setCancelledId('');
    search(method === 'code' ? { code: values.code } : { phone: values.phone });
  }

  function handleCancelled(updated) {
    setCancelTarget(null);
    setCancelledId(updated.id);
    setResult((current) => ({
      ...current,
      reservations: current.reservations.map((item) => (item.id === updated.id ? { ...updated, code: item.code } : item)),
    }));
  }

  function reset() {
    setResult(null);
    setError('');
    setCancelledId('');
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl">Mi <span className="text-neutral-400">reserva</span></h1>

      {!result && (
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-neutral-100 p-1" role="radiogroup" aria-label="Buscar por">
              {METHODS.map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={method === value} onClick={() => { setMethod(value); setError(''); }}
                  className={`rounded-full px-3 py-2 text-sm transition ${method === value ? 'bg-surface font-medium shadow-sm' : 'text-neutral-600'}`}>
                  {label}
                </button>
              ))}
            </div>

            {method === 'code' ? (
              <div>
                <label htmlFor="lookup-code" className="mb-1.5 block text-sm font-medium">Código de reserva</label>
                <input id="lookup-code" className={`${inputStyles} font-mono uppercase`} value={values.code} onChange={(event) => setValues({ ...values, code: event.target.value })} placeholder="SB-XXXXXX" autoComplete="off" spellCheck={false} required />
                <p className="mt-1 text-xs text-neutral-500">Verás tu reserva y podrás cancelarla.</p>
              </div>
            ) : (
              <div>
                <label htmlFor="lookup-phone" className="mb-1.5 block text-sm font-medium">Celular con el que reservaste</label>
                <input id="lookup-phone" type="tel" inputMode="numeric" className={inputStyles} value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} autoComplete="tel-national" placeholder="300 123 4567" required />
                <p className="mt-1 text-xs text-neutral-500">Verás todas tus reservas y su estado. Para cancelar te pediremos el código.</p>
              </div>
            )}

            {error && <Notice>{error}</Notice>}
            <button type="submit" className={`${buttonStyles.primary} w-full py-3`} disabled={busy}>
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />} Buscar
            </button>
          </form>
        </Card>
      )}

      {result && (
        <div className="space-y-3">
          {result.byPhone && (
            <p className="text-sm text-neutral-500">
              {result.reservations.length === 0
                ? 'No encontramos reservas con ese celular.'
                : `${result.reservations.length} ${result.reservations.length === 1 ? 'reserva encontrada' : 'reservas encontradas'}`}
            </p>
          )}

          {result.reservations.map((reservation) => (
            <Card key={reservation.id}>
              {cancelledId === reservation.id && <div className="mb-4"><Notice tone="warning">Tu reserva fue cancelada.</Notice></div>}
              <ReservationSummary reservation={reservation} />
              {reservation.canCancel && (
                <button type="button" onClick={() => setCancelTarget(reservation)} className={`${cancelButtonStyles} mt-4 w-full`}>
                  <XCircle className="size-4" aria-hidden="true" /> Cancelar reserva
                </button>
              )}
              {reservation.status === 'CONFIRMED' && !reservation.canCancel && (
                <p className="mt-4 text-center text-xs text-neutral-500">Ya no puedes cancelar en línea (faltan menos de 2 horas). Escríbele a Santiago.</p>
              )}
            </Card>
          ))}

          <div className="grid gap-2">
            <Link to="/" className={buttonStyles.primary}>Reservar otra cita</Link>
            <button type="button" onClick={reset} className={buttonStyles.soft}>Hacer otra búsqueda</button>
          </div>
        </div>
      )}

      {cancelTarget && (
        <CancelModal reservation={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={handleCancelled} />
      )}
    </div>
  );
}

function CancelModal({ reservation, onClose, onCancelled }) {
  // When the reservation came from a code lookup, the code is already known.
  const [code, setCode] = useState(reservation.code || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      // Make sure the code belongs to this reservation before cancelling.
      const { data: lookup } = await api.post('/public/reservations/lookup', { code });
      if (lookup.data.reservations[0]?.id !== reservation.id) {
        setError('Ese código no corresponde a esta reserva.');
        return;
      }
      const { data } = await api.post('/public/reservations/cancel', { code });
      onCancelled(data.data);
    } catch (failure) {
      setError(apiErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Cancelar reserva" description="El horario quedará libre para otra persona.">
      <form onSubmit={confirm} className="space-y-4">
        <ReservationSummary reservation={reservation} />
        {!reservation.code && (
          <div>
            <label htmlFor="cancel-code" className="mb-1.5 block text-sm font-medium">Código de esta reserva</label>
            <input id="cancel-code" className={`${inputStyles} font-mono uppercase`} value={code} onChange={(event) => setCode(event.target.value)} placeholder="SB-XXXXXX" autoComplete="off" spellCheck={false} required autoFocus />
            <p className="mt-1 text-xs text-neutral-500">Lo recibiste al confirmar la reserva.</p>
          </div>
        )}
        {error && <Notice>{error}</Notice>}
        <div className="grid gap-2">
          <button type="submit" className={cancelButtonStyles} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />} Sí, cancelar
          </button>
          <button type="button" onClick={onClose} className={buttonStyles.soft}>No, volver</button>
        </div>
      </form>
    </Modal>
  );
}
