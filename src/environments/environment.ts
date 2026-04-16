/**
 * Desarrollo: mismo host/puerto donde escucha Nest (`main.ts`: `process.env.PORT ?? 3000`).
 * Las peticiones van a `${apiUrl}/api/...` (prefijo global del backend).
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  /** Día civil para vigencias (inscripción, pase, planilla); debe coincidir con `APP_TIMEZONE` del API. */
  appTimeZone: 'America/Argentina/Buenos_Aires',
};