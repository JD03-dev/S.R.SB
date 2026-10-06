import { AppError } from '../utils/AppError.js';

export function notFound(_req, _res, next) {
  next(new AppError(404, 'Ruta no encontrada.'));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: { message: error.message } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'El cuerpo de la solicitud debe ser JSON válido.' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'La solicitud supera el tamaño permitido.' } });
  }
  console.error(error);
  if (error.name?.startsWith('SequelizeConnection')) {
    return res.status(503).json({ error: { message: 'La base de datos no está disponible. Intenta más tarde.' } });
  }
  res.status(500).json({ error: { message: 'Ocurrió un error interno.' } });
}
