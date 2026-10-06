import { CalendarCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const APP_NAME = 'Sistema de reservas SB';

export function BrandLogo({ subtitle, to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label={`${APP_NAME}, inicio`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <CalendarCheck2 className="size-5" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold text-brand">{APP_NAME}</span>
        {subtitle && <span className="block text-[11px] text-neutral-500">{subtitle}</span>}
      </span>
    </Link>
  );
}
