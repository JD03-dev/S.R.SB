import { CalendarPlus, Ticket } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { BrandLogo } from './BrandLogo.jsx';

const navItems = [
  { to: '/', label: 'Reservar', icon: CalendarPlus, end: true },
  { to: '/mi-reserva', label: 'Mi reserva', icon: Ticket },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-3xl px-3 pb-28 pt-3 sm:px-6 sm:pt-6 md:pb-10">
        <header className="flex items-center justify-between gap-4 rounded-full bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
          <BrandLogo />
          <nav aria-label="Navegación principal" className="hidden items-center gap-1 rounded-full bg-neutral-100 p-1 md:flex">
            {navItems.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `rounded-full px-4 py-2 text-sm transition ${isActive ? 'bg-surface font-medium shadow-sm' : 'text-neutral-600 hover:text-ink'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mt-6 sm:mt-8"><Outlet /></main>
      </div>

      <nav aria-label="Navegación principal" className="fixed inset-x-3 bottom-3 z-40 rounded-full bg-surface p-1.5 shadow-lg shadow-black/10 md:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid grid-cols-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => `flex items-center justify-center gap-2 rounded-full py-3 text-sm transition ${isActive ? 'bg-brand font-medium text-white' : 'text-neutral-500'}`}>
                <Icon className="size-5" aria-hidden="true" /> {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
