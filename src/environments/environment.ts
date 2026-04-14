/**
 * Desarrollo: mismo host/puerto donde escucha Nest (`main.ts`: `process.env.PORT ?? 3000`).
 * Las peticiones van a `${apiUrl}/api/...` (prefijo global del backend).
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
};