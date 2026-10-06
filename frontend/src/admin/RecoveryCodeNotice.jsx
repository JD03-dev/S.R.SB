import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { buttonStyles } from './ui.jsx';

export function RecoveryCodeNotice({ code, title = 'Guarda tu código de recuperación' }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      window.prompt('Copia el código:', code);
    }
  }

  return (
    <div className="rounded-3xl bg-amber-50 p-5 text-amber-900" role="status">
      <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4" aria-hidden="true" /> {title}</p>
      <p className="mt-3 select-all text-center font-mono text-2xl font-semibold tracking-widest">{code}</p>
      <div className="mt-4 space-y-2 text-xs leading-relaxed">
        <p className="font-semibold">Este código no se volverá a mostrar. Guárdalo ahora.</p>
        <p>Es la única forma de recuperar tu cuenta si olvidas la contraseña o el usuario. Es difícil de recordar, así que toma al menos una de estas medidas:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Tómale una <strong>foto</strong> o captura de pantalla.</li>
          <li><strong>Anótalo</strong> en papel y guárdalo en un lugar seguro.</li>
          <li>Guárdalo en las <strong>notas</strong> de tu celular o en un gestor de contraseñas.</li>
        </ul>
        <p>Sirve <strong>una sola vez</strong>: al usarlo recibirás uno nuevo, que también deberás guardar. No lo compartas con nadie.</p>
      </div>
      <button type="button" onClick={copy} className={`${buttonStyles.secondary} mt-4 w-full`}>
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied ? 'Copiado' : 'Copiar código'}
      </button>
    </div>
  );
}
