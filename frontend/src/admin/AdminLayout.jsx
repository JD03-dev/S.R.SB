import { useEffect, useState } from 'react';
import { CalendarDays, LayoutGrid, LogOut, QrCode, Settings } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { useAuth } from './useAuth.js';

const THEME_KEY = 'srsb.adminTheme';

const navItems = [
  { to: '/admin', label: 'Inicio', icon: LayoutGrid, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/compartir', label: 'Compartir', icon: QrCode },
  { to: '/admin/ajustes', label: 'Ajustes', icon: Settings },
];

export function AdminLayout() {
  const { admin, canEdit, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');

  // The dark theme applies only while the admin panel is mounted.
  useEffect(() => {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
    return () => document.documentElement.classList.remove('dark');
  }, [dark]);

  async function logout() {
    await signOut();
    navigate('/admin/login', { replace: true });
  }

  const displayName = admin?.name || 'Invitado';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">Saltar al contenido</a>
      <div className="mx-auto max-w-6xl px-3 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-10">
        <header className="flex items-center justify-between gap-4 rounded-full bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
          <BrandLogo to="/admin" subtitle={admin?.businessName || 'Santiago Barber'} />

          <nav aria-label="Navegación del panel" className="hidden items-center gap-1 rounded-full bg-neutral-100 p-1 md:flex">
            {navItems.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `rounded-full px-4 py-2 text-sm transition ${isActive ? 'bg-surface font-medium text-ink shadow-sm' : 'text-neutral-600 hover:text-ink'}`}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden text-right leading-tight lg:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className={`text-[11px] ${canEdit ? 'text-brand-strong' : 'text-amber-700'}`}>{canEdit ? `@${admin.username} · sesión activa` : 'Solo lectura'}</p>
            </div>
            <button type="button" onClick={logout} className="inline-flex size-10 items-center justify-center rounded-full bg-neutral-100 transition hover:bg-neutral-200" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="size-4" aria-hidden="true" />
            </button>
            <AccountMenu dark={dark} onToggleDark={() => setDark((value) => !value)} />
          </div>
        </header>

        {!canEdit && (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            Modo solo lectura: no hay conexión con la base de datos, así que no se pueden guardar cambios. Inicia PostgreSQL y vuelve a iniciar sesión.
          </p>
        )}

        <main id="admin-content" className="mt-6 sm:mt-8"><Outlet /></main>
      </div>

      <nav aria-label="Navegación del panel" className="fixed inset-x-3 bottom-3 z-40 rounded-full bg-surface p-1.5 shadow-lg shadow-black/10 md:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid grid-cols-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] transition ${isActive ? 'bg-brand text-white' : 'text-neutral-500'}`}>
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
