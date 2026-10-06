import { Clock3 } from 'lucide-react';

// Placeholder for features planned for the next project deliveries.
export function FutureFeatureCard({ number, title, description, items = [], icon: Icon = Clock3, className = '' }) {
  return (
    <section className={`rounded-[28px] border-2 border-dashed border-brand/30 bg-surface/70 p-5 sm:p-6 ${className}`} aria-label={`${title}, próxima entrega`}>
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
            Funcionalidad {number} · Próxima entrega
          </span>
          <h2 className="mt-2 text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
      </div>
      {items.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 rounded-2xl bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand/50" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
