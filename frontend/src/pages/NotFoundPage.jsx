import { Link } from 'react-router-dom';
import { Card, buttonStyles } from '../admin/ui.jsx';

export function NotFoundPage() {
  return (
    <Card className="py-12 text-center">
      <h1 className="text-2xl font-semibold">Esta página no existe</h1>
      <Link to="/" className={`${buttonStyles.primary} mt-6`}>Ir a reservar</Link>
    </Card>
  );
}
