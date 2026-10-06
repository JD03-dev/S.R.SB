import axios from 'axios';

export const SESSION_KEY = 'srsb.session';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: { Accept: 'application/json' },
});

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const session = readSession();
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && error.config?.url?.startsWith('/admin')) {
    window.dispatchEvent(new Event('srsb:unauthorized'));
  }
  return Promise.reject(error);
});

export function apiErrorMessage(error) {
  return error.response?.data?.error?.message || 'No fue posible conectar con el servidor. Intenta nuevamente.';
}
