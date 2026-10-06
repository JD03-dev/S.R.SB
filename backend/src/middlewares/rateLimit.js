import { AppError } from '../utils/AppError.js';

// Small in-memory fixed-window limiter per IP; enough for a single API instance.
export function rateLimit({ max, windowMinutes, message }) {
  const hits = new Map();
  return (req, _res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(req.ip, { count: 1, resetAt: now + windowMinutes * 60 * 1000 });
      if (hits.size > 10000) for (const [key, value] of hits) if (value.resetAt <= now) hits.delete(key);
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return next(new AppError(429, message));
    next();
  };
}
