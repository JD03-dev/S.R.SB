import { useEffect, useRef, useState } from 'react';
import { Moon, UserRound } from 'lucide-react';
import { Modal } from '../components/Modal.jsx';
import { MyAccountForm } from './AccountSettings.jsx';
import { useAuth } from './useAuth.js';

export function AccountMenu({ dark, onToggleDark }) {
  const { admin } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef(null);
  const displayName = admin?.name || 'Invitado';

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => { if (!menuRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const itemStyles = 'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menú de ${displayName}`}
        title={`Sesión de ${displayName}`}
        className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-semibold uppercase text-white transition hover:bg-brand-hover"
      >
        {displayName.charAt(0)}
      </button>

      {open && (
        <div role="menu" aria-label="Opciones de la cuenta" className="absolute right-0 top-12 z-50 w-64 rounded-3xl bg-surface p-2 shadow-xl ring-1 ring-neutral-200">
          <div className="px-3 pb-2 pt-1">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-neutral-500">{admin ? `@${admin.username}` : 'Modo solo lectura'}</p>
          </div>
          <button type="button" role="menuitem" className={itemStyles} disabled={!admin} onClick={() => { setOpen(false); setAccountOpen(true); }}>
            <UserRound className="size-4" aria-hidden="true" /> Mi cuenta
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={dark} className={itemStyles} onClick={onToggleDark}>
            <Moon className="size-4" aria-hidden="true" />
            <span className="flex-1">Modo oscuro</span>
            <span className={`relative h-5 w-9 rounded-full transition ${dark ? 'bg-brand' : 'bg-neutral-300'}`} aria-hidden="true">
              <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${dark ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
          </button>
        </div>
      )}

      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title="Mi cuenta" size="lg">
        <MyAccountForm />
      </Modal>
    </div>
  );
}
