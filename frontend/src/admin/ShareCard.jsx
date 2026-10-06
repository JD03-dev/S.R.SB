import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import { formatWeek, publicScheduleUrl } from './format.js';
import { Card, CardHeader, Notice, buttonStyles } from './ui.jsx';

export function ShareCard({ schedule }) {
  const url = publicScheduleUrl(schedule.publicCode);
  const [image, setImage] = useState('');
  const [copied, setCopied] = useState(false);
  const isLocal = ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: '#0f3d2c', light: '#ffffff' } })
      .then((data) => { if (active) setImage(data); });
    return () => { active = false; };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia el enlace:', url);
    }
  }

  return (
    <Card>
      <CardHeader title="Compartir agenda" subtitle={formatWeek(schedule.weekStart, schedule.weekEnd)} />
      <div className="rounded-3xl bg-neutral-50 p-4">
        {image
          ? <img src={image} alt={`Código QR de la agenda: ${url}`} className="mx-auto aspect-square w-full max-w-60 rounded-2xl" />
          : <div className="mx-auto aspect-square w-full max-w-60 animate-pulse rounded-2xl bg-neutral-200" />}
      </div>
      <p className="mt-4 break-all rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-600">{url}</p>
      {isLocal && (
        <div className="mt-3"><Notice tone="warning">Este enlace usa <strong>localhost</strong> y solo abre en este computador. Para compartirlo con clientes configura <code>VITE_PUBLIC_URL</code> con la dirección pública.</Notice></div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={copy} className={buttonStyles.soft}>{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}<span className="sr-only sm:not-sr-only">{copied ? 'Copiado' : 'Copiar'}</span></button>
        <a href={image || undefined} download={`agenda-${schedule.weekStart}.png`} className={`${buttonStyles.soft} ${image ? '' : 'pointer-events-none opacity-50'}`}><Download className="size-4" aria-hidden="true" /><span className="sr-only sm:not-sr-only">PNG</span></a>
        <a href={url} target="_blank" rel="noreferrer" className={buttonStyles.soft}><ExternalLink className="size-4" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Abrir</span></a>
      </div>
    </Card>
  );
}
